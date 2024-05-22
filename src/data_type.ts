import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,SkelfInput,SkelfOutput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter,ISkelfBuffer,IOffsetBlock} from "skelf/types"
import {BufferSpace,ArraySpace,IteratorReadStream,FileSpace} from "skelf/core"
import {isSpace,isReadStream,isWriteStream,isBufferLike,offsetToBlock,convertToSkelfBuffer,offsetToString,isWriter,isReader,isFileHandle,OffsetBlock} from "skelf/utils"
import {UnknownInputForDataType,UnknownOutputForDataType,ConstraintError,UnexpectedSizeError} from "skelf/errors"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReadStream/ISkelfWriteStream.
// this way the creator of the data type could easily implement it without worrying about different
// input/output arguments while the user of the data type could provide any valid input/output type that is
// supported by ISkelfDataType interface

type createDataTypeOptions<T> = {
  readonly name : string,
  readonly size ?: IOffsetBlock,
  readonly read : (reader : ISkelfReader) => Promise<T>,
  readonly write : (writer : ISkelfWriter,value : T) => Promise<void>;
  readonly constraint? : (value : T) => boolean | string | void;
};

export function createDataType<T>(options : createDataTypeOptions<T>) : ISkelfDataType<T> {
  return {
    name : options.name,
    size : options.size,
    [Symbol.toStringTag]: options.name,
    async read(input : SkelfInput,offset : Offset = 0){
      const { value } = await this.readAndGetSize!(input,offset);
      return value;
    },
    async readAndGetSize(input : SkelfInput,offset : Offset = 0){
      let reader : ISkelfReader;
      if(isReader(input)){
        reader = input as ISkelfReader;
        await reader.skip(offset);
      }
      else if(isSpace(input)){
        reader = new SpaceReader(input as ISkelfSpace,offset);
      }
      else if(isReadStream(input)){
        reader = new StreamReader(input as ISkelfReadStream);
        await reader.skip(offset);
      }
      else if(isBufferLike(input)){
        const space = await new BufferSpace(input as ArrayBuffer,options.name).init();
        reader = new SpaceReader(space,offset);
      }
      else if(isFileHandle(input)){
        const space = await new FileSpace(input as FileHandle, options.name).init();
        reader = new SpaceReader(space,offset);
      }
      else if(Array.isArray(input)){
        if(input.every(item => typeof item === "number"))
          throw new UnknownInputForDataType(`
            recieved an invalid array as input value for data type '${options.name}'
            because some of it contains some non number values.
          `);
        const space = await new ArraySpace(input as number[],options.name).init();
        reader = new SpaceReader(space,offset);
      }
      else if(typeof input === "function" || (typeof input === "object" && Symbol.iterator in input)){
        const stream = await new IteratorReadStream(input,options.name).init();
        reader = new StreamReader(stream);
        await reader.skip(offset)
      }
      else
        throw new UnknownInputForDataType(`
          recieved unknown input value '${input.toString()}' for data type '${options.name}'.
        `);

      const offsetBeforeRead = OffsetBlock.clone(reader.offset);
      const value = await options.read(reader);
      const size = OffsetBlock.clone(reader.offset).subtract(offsetBeforeRead);
      if(options.constraint){
        const constraintResult = options.constraint(value);
        if(constraintResult !== true){
          throw new ConstraintError(`
            data type '${this.name}' which was being read from ${input} at ${offsetToString(offset)} but failed
            to meet its constraint.
            ${typeof constraintResult === 'string' ? constraintResult : ""}
          `)
        }
      }
      if(options.size && (options.size.bytes !== size.bytes || options.size.bits !== size.bits)){
        throw new UnexpectedSizeError(`
          data type '${this.name}' was expected to be ${this.size} bits in size but ${size} bits was
          read by it. input: '${input}' at offset: ${offsetToString(offset)}.
        `)
      }
      return {value,size};
    },
    async write(value : T, output  : SkelfOutput, offset : Offset = 0){
      if(options.constraint){
        const constraintResult = options.constraint(value);
        if(constraintResult !== true)
          throw new ConstraintError(`
            provided value for data type '${this.name}' cannot be written to ${output} at
            ${offsetToString(offset)} because it does not meet its constraint.
            ${typeof constraintResult === "string" ? constraintResult : ""}
          `)
      }
      let writer : ISkelfWriter;
      if(isWriter(output)){
        writer = output as ISkelfWriter;
      }
      else if(isSpace(output)){
        writer = new SpaceWriter(output as ISkelfSpace,offset);
      }
      else if(isWriteStream(output)){
        writer = new StreamWriter(output as ISkelfWriteStream);
        const offsetBlock = offsetToBlock(offset);
        const fillerBuffer = new ArrayBuffer(offsetBlock.ceil())
        await writer.write(convertToSkelfBuffer(fillerBuffer,offsetBlock));
      }
      else if(isBufferLike(output)){
        const space = await new BufferSpace(output as ArrayBuffer,options.name).init();
        writer = new SpaceWriter(space,offset);
      }
      else if(Array.isArray(output)){
        const space = await new ArraySpace(output as number[],options.name).init();
        writer = new SpaceWriter(space,offset);
      }
      else
        throw new UnknownOutputForDataType(`
          recieved unknown output value '${output.toString()}' for data type '${options.name}'.
        `)
      const offsetBeforeWrite = OffsetBlock.clone(writer.offset);
      const result = await options.write(writer,value);
      const size = OffsetBlock.clone(writer.offset).subtract(offsetBeforeWrite);
      if(options.size && (options.size.bytes !== size.bytes || options.size.bits !== size.bits)){
        throw new UnexpectedSizeError(`
          data type '${this.name}' was expected to be '${this.size}' bits in size but it ${size}
          bits was written by it. input: ${output} at ${offsetToString(offset)}.
        `)
      }
      return size;
    },
    constraint(value : T){
      if(!options.constraint) return true;
      return options.constraint(value) ?? true;
    }
  }
}

export class SpaceReader implements ISkelfReader {
  readonly name : string;
  #offset : OffsetBlock;
  get offset(){ return this.#offset as IOffsetBlock;}
  constructor(private space : ISkelfSpace,initialOffset : Offset){
    this.name = space.name;
    this.#offset = offsetToBlock(initialOffset);
  }
  async read(size : Offset){
    const result = await this.space.read(size,this.offset);
    this.#offset = this.#offset.add(offsetToBlock(size));
    return result;
  }
  async skip(size : Offset){
    this.#offset = this.#offset.add(offsetToBlock(size));
  }
}

export class SpaceWriter implements ISkelfWriter {
  readonly name: string;
  #offset : OffsetBlock;
  get offset(){ return this.#offset as IOffsetBlock; };
  constructor(private space : ISkelfSpace, initialOffset : Offset){
    this.name = space.name;
    this.#offset = offsetToBlock(initialOffset);
  }
  async write(buffer : ISkelfBuffer | ArrayBuffer){
    await this.space.write(buffer,this.offset);
    this.#offset = this.#offset.add((buffer as ISkelfBuffer).size ?? new OffsetBlock(buffer.byteLength));
  }
  async flush(){
    if(this.offset.bits === 0) return;
    const flusher = convertToSkelfBuffer(new ArrayBuffer(1),new OffsetBlock(0,(8 - this.offset.bits) % 8));
    await this.space.write(flusher,`${this.offset}`);
    this.#offset = this.#offset.add(flusher.size);
  }
}

export class StreamReader implements ISkelfReader {
  readonly name : string;
  #offset = new OffsetBlock(0,0);
  get offset(){ return this.#offset as IOffsetBlock }
  constructor(private stream : ISkelfReadStream){
    this.name = stream.name;
  }
  async read(size : Offset){
    const result = await this.stream.read(size);
    this.#offset = this.#offset.add(result.size);
    return result;
  }
  async skip(size : Offset){
    await this.stream.skip(size);
    this.#offset = this.#offset.add(offsetToBlock(size));
  }
}

export class StreamWriter implements ISkelfWriter {
  readonly name : string;
  #offset = new OffsetBlock(0,0);
  get offset() { return this.#offset as IOffsetBlock};
  constructor(private stream : ISkelfWriteStream){
    this.name = stream.name;
  }
  async write(buffer : ArrayBuffer | ISkelfBuffer){
    const result = await this.stream.write(buffer);
    this.#offset = this.#offset.add((buffer as ISkelfBuffer).size ?? new OffsetBlock(buffer.byteLength));
    return result;
  }
  async flush(){
    const bitsFlushed = await this.stream.flush();
    this.#offset.incrementByBits(bitsFlushed);
  }
}

export default createDataType
