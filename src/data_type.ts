import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,ISkelfInput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter} from "skelf/types"
import {BufferSpace,ArraySpace,IteratorReadStream} "skelf/core"
import {isSpace,offsetToBits,convertToSkelfBuffer,isBufferLike} from "skelf/utils"
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
  readonly constraint? : (value : T) => boolean | string | undefined;
};

function getReaderFromSpace(space : ISkelfSpace, initialOffset : Offset){
  let offset = offsetToBits(initialOffset);
  return {
    async read(size : Offset){
      const result = await space.read(size,`${offset}b`);
      offset += offsetToBits(size);
    },
    async skip(size : Offset){
      offset += offsetToBits(size);
    }
  } as ISkelfReader;
}
function getWriterFromSpace(space : ISkelfSpace, initialOffset : Offset){
  let offest = offsetToBits(initialOffset);
  return {
    async write(buffer : ISkelfBuffer | ArrayBuffer){
      await space.write(buffer,`${offset}b`);
      offset += (buffer as any).bitLength ?? buffer.byteLength*8;
    }
  } as ISkelfWriter;
}
async function getReaderFromStream(stream : ISkelfReadStream, offset : Offset){
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

async function getWriterFromStream(stream : ISkelfWriteStream, offset : Offset){
  const offsetInBits = sizeInBits(offset);
  const offsetBuffer = new ArrayBuffer(Math.ceil(offsetInBits / 8));
  const offsetSkelfBuffer = convertToSkelfBuffer(offsetBuffer,offsetInBits);
  await stream.write(offsetSkelfBuffer);
  return {
    async write(buffer : ArrayBuffer | ISkelfBuffer){
      return await stream.write(buffer);
    }
  } as ISkelfReader;
}


export async function createDataType<T>(options : createDataTypeOptions<T>) : ISkelfDataType<T> {
  return {
    async read(input : ISkelfInput,offset : Offset = 0){
      let reader : ISkelfReader;
      if(isSpace(input)){
        reader = getReaderFromSpace(input,offset);
      }
      else if(isReadStream(input)){
        reader = await getReaderFromStream(input,offset);
      }
      else if(isBufferLike(input)){
        const space = await new BufferSpace(input,options.name).init();
        reader = await getReaderFromSpace(space,offset);
      }
      else if(Array.isArray(input)){
        if(input.every(item => typeof item === "number"))
          throw new UnknownInputForDataType(`
            recieved an invalid array as input value for data type '${options.name}'
            because some of it contains some non number values.
          `);
        const space = await new ArraySpace(input,options.name).init();
        reader = await getReaderFromSpace(space,offset);
      }
      else if(typeof input === "function" || (typeof input === "object" && [Symbol.iterator] in input)){
        const stream = await new IteratorReadStream(input,options.name).init();
        reader = await getReaderFromStream(stream,offset);
      }
      else
        throw new UnknownInputForDataType(`
          recieved unknown input value '${input.toString()}' for data type '${options.name}'.
        `);
      return await options.read(reader);
    },
    async write(value : T, output  : ISkelfOutput, offset : Offset = 0){
      let writer : ISkelfWriter;
      if(isSpace(output)){
        writer = getWriterFromSpace(input,offset);
      }
      else if(isWriteStream(output)){
        writer = await getWriterFromWriteStream(output,offset);
      }
      else if(isBufferLike(output)){
        const space = await new BufferSpace(output,options.name).init();
        writer = getWriterFromSpace(space,offset);
      }
      else if(Array.isArray(output)){
        const space = await new ArraySpace(output.options.name).init();
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
      return options.constraint(value);
    }
  }
}

export default SkelfDataType
