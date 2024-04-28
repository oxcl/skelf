import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,SkelfInput,SkelfOutput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter,ISkelfBuffer} from "skelf/types"
import {BufferSpace,ArraySpace,IteratorReadStream} from "skelf/core"
import {isSpace,isReadStream,isWriteStream,isBufferLike,offsetToBits,convertToSkelfBuffer,offsetToString,isWriter,isReader} from "skelf/utils"
import {UnknownInputForDataType,UnknownOutputForDataType,ConstraintError,UnexpectedSizeError} from "skelf/errors"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReadStream/ISkelfWriteStream.
// this way the creator of the data type could easily implement it without worrying about different
// input/output arguments while the user of the data type could provide any valid input/output type that is
// supported by ISkelfDataType interface

type createDataTypeOptions<T> = {
  readonly name : string,
  readonly size ?: number, // in bits
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
      const { result } = await this.readAndGetSize!(input,offset);
      return result;
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

      const offsetBeforeRead = reader.offset;
      const result = await options.read(reader);
      const size = reader.offset - offsetBeforeRead;
      if(options.constraint){
        const constraintResult = options.constraint(result);
        if(constraintResult !== true){
          throw new ConstraintError(`
            data type '${this.name}' which was being read from ${input} at ${offsetToString(offset)} but failed
            to meet its constraint.
            ${typeof constraintResult === 'string' ? constraintResult : ""}
          `)
        }
      }
      if(options.size && options.size !== size){
        throw new UnexpectedSizeError(`
          data type '${this.name}' was expected to be ${this.size} bits in size but ${size} bits was
          read by it. input: '${input}' at offset: ${offsetToString(offset)}.
        `)
      }
      return {result,size};
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
        const offsetInBits = offsetToBits(offset);
        const fillerBuffer = new ArrayBuffer(offsetInBits/8)
        await writer.write(convertToSkelfBuffer(fillerBuffer,offsetInBits));
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
      const offsetBeforeWrite = writer.offset;
      const result = await options.write(writer,value);
      const size = writer.offset - offsetBeforeWrite;
      if(options.size && options.size !== size){
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

class SpaceReader implements ISkelfReader {
  readonly name : string;
  #offset : number;
  get offset(){ return this.#offset; }
  constructor(private space : ISkelfSpace,initialOffset : Offset){
    this.name = space.name;
    this.#offset = offsetToBits(initialOffset);
  }
  async read(size : Offset){
    const result = await this.space.read(size,`${this.offset}b`);
    this.#offset += offsetToBits(size);
    return result;
  }
  async skip(size : Offset){
    this.#offset += offsetToBits(size);
  }
}

class SpaceWriter implements ISkelfWriter {
  readonly name: string;
  #offset : number;
  get offset(){ return this.#offset; };
  constructor(private space : ISkelfSpace, initialOffset : Offset){
    this.name = space.name;
    this.#offset = offsetToBits(initialOffset);
  }
  async write(buffer : ISkelfBuffer | ArrayBuffer){
    await this.space.write(buffer,`${this.offset}b`);
    this.#offset += (buffer as ISkelfBuffer).bitLength ?? buffer.byteLength*8;
  }
  async flush(){
    if(this.offset % 8 === 0) return;
    const flusher = convertToSkelfBuffer(new ArrayBuffer(1),(8 - (this.offset % 8)) % 8)
    await this.space.write(flusher,`${this.offset}`);
    this.#offset += flusher.bitLength;
  }
}

class StreamReader implements ISkelfReader {
  readonly name : string;
  #offset : number = 0;
  get offset(){ return this.#offset }
  constructor(private stream : ISkelfReadStream){
    this.name = stream.name;
  }
  async read(size : Offset){
    const result =  await this.stream.read(size);
    this.#offset += offsetToBits(size);
    return result;
  }
  async skip(size : Offset){
    await this.stream.skip(size);
    this.#offset += offsetToBits(size);
  }
}

class StreamWriter implements ISkelfWriter {
  readonly name : string;
  #offset : number = 0;
  get offset() { return this.#offset };
  constructor(private stream : ISkelfWriteStream){
    this.name = stream.name;
  }
  async write(buffer : ArrayBuffer | ISkelfBuffer){
    const result = await this.stream.write(buffer);
    this.#offset += (buffer as ISkelfBuffer).bitLength ?? buffer.byteLength*8;
    return result;
  }
  async flush(){
    const bitsFlushed = await this.stream.flush();
    this.#offset += bitsFlushed;
  }
}

export default createDataType
