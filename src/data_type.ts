import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,SkelfInput,SkelfOutput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter,ISkelfBuffer,IOffsetBlock} from "skelf/types"
import {BufferSpace,ArraySpace,IteratorReadStream,FileSpace} from "skelf/core"
import {detectType,offsetToBlock,convertToSkelfBuffer,offsetToString,OffsetBlock,ZERO_BUFFER} from "skelf/utils"
import {UnknownInputForDataType,UnknownOutputForDataType,ConstraintError,UnexpectedSizeError} from "skelf/errors"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType interface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReader/ISkelfWriter.
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
    toString(){ return `[SkelfDataType ${options.name}]`},
    async read(input : SkelfInput,offset : Offset = 0){
      const { value } = await this.readAndGetSize!(input,offset);
      return value;
    },
    async readAndGetSize(input : SkelfInput,offset : Offset = 0){
      const [reader,closeFunction] = await inputToReader(input,offset,options.name);
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
      if(closeFunction) await closeFunction()
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
      const [writer,closeFunction] = await outputToWriter(output,offset,options.name)
      const offsetBeforeWrite = OffsetBlock.clone(writer.offset);
      const result = await options.write(writer,value);
      const size = OffsetBlock.clone(writer.offset).subtract(offsetBeforeWrite);
      if(options.size && (options.size.bytes !== size.bytes || options.size.bits !== size.bits)){
        throw new UnexpectedSizeError(`
          data type '${this.name}' was expected to be '${this.size}' bits in size but it ${size}
          bits was written by it. input: ${output} at ${offsetToString(offset)}.
        `)
      }
      if(closeFunction) await closeFunction()
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
  readonly type = "reader";
  get [Symbol.toStringTag](){ return this.name}
  toString(){ return `[SkelfReader ${this.name}]`}
  #offset : OffsetBlock;
  get offset(){ return this.#offset as IOffsetBlock;}
  constructor(private space : ISkelfSpace,initialOffset : Offset){
    this.name = space.name;
    this.#offset = offsetToBlock(initialOffset);
  }
  async read(size : Offset){
    const sizeBlock = offsetToBlock(size);
    if(OffsetBlock.isZero(sizeBlock)) return ZERO_BUFFER;
    const result = await this.space.read(size,this.offset);
    this.#offset = this.#offset.add(sizeBlock);
    return result;
  }
  async skip(size : Offset){
    this.#offset = this.#offset.add(offsetToBlock(size));
  }
}

export class SpaceWriter implements ISkelfWriter {
  readonly name: string;
  readonly type = "writer"
  get [Symbol.toStringTag](){ return this.name}
  toString(){ return `[SkelfWriter ${this.name}]`}
  #offset : OffsetBlock;
  get offset(){ return this.#offset as IOffsetBlock; };
  constructor(private space : ISkelfSpace, initialOffset : Offset){
    this.name = space.name;
    this.#offset = offsetToBlock(initialOffset);
  }
  async write(buffer : ISkelfBuffer | ArrayBuffer){
    const sizeBlock = (buffer as ISkelfBuffer).size ?? new OffsetBlock(buffer.byteLength);
    if(OffsetBlock.isZero(sizeBlock)) return;
    await this.space.write(buffer,this.offset);
    this.#offset = this.#offset.add(sizeBlock);
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
  readonly type = "reader";
  get [Symbol.toStringTag](){ return this.name}
  toString(){ return `[SkelfReader ${this.name}]`}
  #offset = new OffsetBlock(0,0);
  get offset(){ return this.#offset as IOffsetBlock }
  constructor(private stream : ISkelfReadStream){
    this.name = stream.name;
  }
  async read(size : Offset){
    const sizeBlock = offsetToBlock(size)
    if(OffsetBlock.isZero(sizeBlock)) return ZERO_BUFFER;
    const result = await this.stream.read(size);
    this.#offset = this.#offset.add(sizeBlock);
    return result;
  }
  async skip(size : Offset){
    await this.stream.skip(size);
    this.#offset = this.#offset.add(offsetToBlock(size));
  }
}

export class StreamWriter implements ISkelfWriter {
  readonly name : string;
  readonly type = "writer"
  get [Symbol.toStringTag](){ return this.name}
  toString(){ return `[SkelfWriter ${this.name}]`}
  #offset = new OffsetBlock(0,0);
  get offset() { return this.#offset as IOffsetBlock};
  constructor(private stream : ISkelfWriteStream){
    this.name = stream.name;
  }
  async write(buffer : ArrayBuffer | ISkelfBuffer){
    const sizeBlock = (buffer as ISkelfBuffer).size ?? new OffsetBlock(buffer.byteLength);
    if(OffsetBlock.isZero(sizeBlock)) return;
    const result = await this.stream.write(buffer);
    this.#offset = this.#offset.add(sizeBlock);
  }
  async flush(){
    const bitsFlushed = await this.stream.flush();
    this.#offset.incrementByBits(bitsFlushed);
  }
}


function inputToReader(input : SkelfInput, offset : Offset, name : string){
  const inputToReaderMap = {
    ["space"]: async () => {
      return [new SpaceReader(input as ISkelfSpace,offset)];
    },
    ["readStream"]: async () => {
      const reader = new StreamReader(input as ISkelfReadStream);
      await reader.skip(offset)
      return [reader];
    },
    ["bufferLike"]: async () => {
      const space = await new BufferSpace(input as ArrayBuffer,name).init();
      return [new SpaceReader(space,offset),space.close];
    },
    ["fileHandle"]: async ()=>{
      const space = await new FileSpace(input as FileHandle, name).init();
      return [new SpaceReader(space,offset),space.close];
    },
    ["array"]: async ()=> {
      if((input as number[]).every(item => typeof item === "number"))
        throw new UnknownInputForDataType(`
            received an invalid array as input value for data type '${name}'
            because some of it contains some non number values.
          `);
      const space = await new ArraySpace(input as number[],name).init();
      return [new SpaceReader(space,offset),space.close];
    },
    ["iterator"]: async ()=> {
      const stream = await new IteratorReadStream(input as Iterator<number>,name).init();
      const reader = new StreamReader(stream);
      await reader.skip(offset);
      return [reader,stream.close];
    },
    ["reader"]: async ()=>{
      const reader = input as ISkelfReader;
      await reader.skip(offset)
      return [reader];

    }
  } as {[k: string]: ()=> Promise<[ISkelfReader]> | Promise<[ISkelfReader,()=>Promise<void>]>}

  const type = detectType(input);
  if(type === "unknown" || !(type in inputToReaderMap)){
    throw new UnknownInputForDataType(`
      received unknown input value '${input.toString()}' for data type '${name}'.
    `);
  }
  return inputToReaderMap[type]();
}

function outputToWriter(output : SkelfOutput, offset : Offset, name : string){
  const outputToWriterMap = {
    ["space"]: async ()=>{
      return [new SpaceWriter(output as ISkelfSpace,offset)];
    },
    ["writeStream"]: async ()=>{
      const writer = new StreamWriter(output as ISkelfWriteStream);
      const offsetBlock = offsetToBlock(offset);
      const fillerBuffer = new ArrayBuffer(offsetBlock.ceil())
      await writer.write(convertToSkelfBuffer(fillerBuffer,offsetBlock));
      return [writer];
    },
    ["bufferLike"]: async ()=>{
      const space = await new BufferSpace(output as ArrayBuffer,name).init();
      return [new SpaceWriter(space,offset),space.close];
    },
    ["fileHandle"]: async ()=>{
      const space = await new FileSpace(output as FileHandle, name).init();
      return [new SpaceWriter(space,offset),space.close];
    },
    ["writer"]: async ()=>{
      return [output];
    },
    ["array"]: async ()=>{
      const space = await new ArraySpace(output as number[],name).init();
      return [new SpaceWriter(space,offset),space.close];
    }
  } as {[k:string] : ()=> Promise<[ISkelfWriter]> | Promise<[ISkelfWriter,()=>Promise<void>]>};
  const type = detectType(output)
  if(type === "unknown"){
    throw new UnknownOutputForDataType(`
      received unknown output value '${output.toString()}' for data type '${name}'.
    `)
  }
  return outputToWriterMap[type]();
}


export default createDataType
