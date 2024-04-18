import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,ISkelfInput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter} from "skelf/types"
import {BufferSpace} "skelf/core"
import {isSpace,offsetToBits,convertToSkelfBuffer} from "skelf/utils"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReadStream/ISkelfWriteStream.
// this way the creator of the data type could easily implement it without worrying about different
// input/output arguments while the user of the data type could provide any valid input/output type that is
// supported by ISkelfDataType interface

type createDataTypeOptions<T> = {
  readonly name : string,
  readonly read : (reader : ISkelfReader) => Promise<T>,
  readonly write : (value : T,writer : ISkelfWriter) => Promise<void>;
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
      let offsetInBits = offsetToBits(offset); // initial offset
      const reader : ISkelfReader = {
        async read(size : Offset){
          const sizeInBits = offsetToBits(size);

          offsetInBits += sizeInBits;
        }
      }
    },
    constraint(value : T){
      if(!options.constraint) return true;
      return options.constraint(value);
    }
  }
}

export default SkelfDataType
