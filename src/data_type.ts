import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,SkelfInput,SkelfOutput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter,ISkelfBuffer} from "skelf/types"
import {BufferSpace,ArraySpace,IteratorReadStream} from "skelf/core"
import {isSpace,isReaderOrReadStream,isWriterOrWriteStream,isBufferLike,offsetToBits,convertToSkelfBuffer} from "skelf/utils"
import {UnknownInputForDataType,UnknownOutputForDataType} from "skelf/errors"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReadStream/ISkelfWriteStream.
// this way the creator of the data type could easily implement it without worrying about different
// input/output arguments while the user of the data type could provide any valid input/output type that is
// supported by ISkelfDataType interface

type createDataTypeOptions<T> = {
  readonly name : string,
  readonly read : (reader : ISkelfReader) => Promise<T>,
  readonly write : (writer : ISkelfWriter,value : T) => Promise<void>;
  readonly constraint? : (value : T) => boolean | string | void;
};

export function createDataType<T>(options : createDataTypeOptions<T>) : ISkelfDataType<T> {
  return {
    name : options.name,
    async read(input : SkelfInput,offset : Offset = 0){
      let reader : ISkelfReader;
      if(isSpace(input)){
        reader = getReaderFromSpace(input as ISkelfSpace,offset);
      }
      else if(isReaderOrReadStream(input)){
        reader = await getReaderFromStream(input as ISkelfReadStream | ISkelfReader,offset);
      }
      else if(isBufferLike(input)){
        const space = await new BufferSpace(input as ArrayBuffer,options.name).init();
        reader = await getReaderFromSpace(space,offset);
      }
      else if(Array.isArray(input)){
        if(input.every(item => typeof item === "number"))
          throw new UnknownInputForDataType(`
            recieved an invalid array as input value for data type '${options.name}'
            because some of it contains some non number values.
          `);
        const space = await new ArraySpace(input as number[],options.name).init();
        reader = await getReaderFromSpace(space,offset);
      }
      else if(typeof input === "function" || (typeof input === "object" && Symbol.iterator in input)){
        const stream = await new IteratorReadStream(input,options.name).init();
        reader = await getReaderFromStream(stream,offset);
      }
      else
        throw new UnknownInputForDataType(`
          recieved unknown input value '${input.toString()}' for data type '${options.name}'.
        `);
      return await options.read(reader);
    },
    async write(value : T, output  : SkelfOutput, offset : Offset = 0){
      let writer : ISkelfWriter;
      if(isSpace(output)){
        writer = getWriterFromSpace(output as ISkelfSpace,offset);
      }
      else if(isWriterOrWriteStream(output)){
        writer = await getWriterFromStream(output as ISkelfWriteStream | ISkelfWriter,offset);
      }
      else if(isBufferLike(output)){
        const space = await new BufferSpace(output as ArrayBuffer,options.name).init();
        writer = getWriterFromSpace(space,offset);
      }
      else if(Array.isArray(output)){
        const space = await new ArraySpace(output as number[],options.name).init();
        writer = getWriterFromSpace(space,offset);
      }
      else
        throw new UnknownOutputForDataType(`
          recieved unknown output value '${output.toString()}' for data type '${options.name}'.
        `)
      return await options.write(writer,value);
    },
    constraint(value : T){
      if(!options.constraint) return true;
      return options.constraint(value) ?? true;
    }
  }
}


function getReaderFromSpace(space : ISkelfSpace, initialOffset : Offset){
  let offset = offsetToBits(initialOffset);
  return {
    async read(size : Offset){
      const result = await space.read(size,`${offset}b`);
      offset += offsetToBits(size);
      return result;
    },
    async skip(size : Offset){
      offset += offsetToBits(size);
    }
  } as ISkelfReader;
}
function getWriterFromSpace(space : ISkelfSpace, initialOffset : Offset){
  let offset = offsetToBits(initialOffset);
  return {
    async write(buffer : ISkelfBuffer | ArrayBuffer){
      await space.write(buffer,`${offset}b`);
      offset += (buffer as ISkelfBuffer).bitLength ?? buffer.byteLength*8;
    },
    async flush(){
      if(offset % 8 === 0) return;
      const flusher = convertToSkelfBuffer(new ArrayBuffer(1),offset % 8)
      await space.write(flusher,`${offset}`);
      offset += offset % 8;
    }
  } as ISkelfWriter;
}

async function getReaderFromStream(stream : ISkelfReadStream | ISkelfReader, offset : Offset){
  await stream.skip(offset);
  return {
    async read(size : Offset){
      return await stream.read(size);
    },
    async skip(size : Offset){
      return await stream.skip(size);
    }
  } as ISkelfReader;
}

async function getWriterFromStream(stream : ISkelfWriteStream | ISkelfWriter, offset : Offset){
  const offsetInBits = offsetToBits(offset);
  const offsetBuffer = new ArrayBuffer(Math.ceil(offsetInBits / 8));
  const offsetSkelfBuffer = convertToSkelfBuffer(offsetBuffer,offsetInBits);
  await stream.write(offsetSkelfBuffer);
  return {
    async write(buffer : ArrayBuffer | ISkelfBuffer){
      return await stream.write(buffer);
    },
    async flush(){
      return await stream.flush();
    }
  } as ISkelfWriter;
}

export default createDataType
