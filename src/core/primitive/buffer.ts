import {createDataType} from "skelf/data_type"
import {ISkelfDataType,Offset} from "skelf/types"
import {offsetToString,offsetToBlock,OffsetBlock,convertToSkelfBuffer,readUntil} from "skelf/utils"
import {ISkelfBuffer} from "skelf/types"
import { ConstraintError } from "skelf/errors";

export function fixedBuffer<T extends ArrayBuffer | ISkelfBuffer = ArrayBuffer>(size : Offset){
  const sizeBlock = offsetToBlock(size);
  return createDataType<T>({
    name: `fixedBuffer(${offsetToString(size)})`,
    size : sizeBlock,
    read: async function readFixedBuffer(reader){
      return convertToSkelfBuffer(await reader.read(size),sizeBlock) as T;
    },
    write: async function writeFixedBuffer(writer,value){
      await writer.write(value);
    },
    constraint: function constraintFixedBuffer(value){
      const bufferSize = (value as ISkelfBuffer).size ?? new OffsetBlock(value.byteLength);
      if(sizeBlock.isEqual(bufferSize)) return true;
      else {
        return `
          fixedBuffer must be ${offsetToString(bufferSize)} in size but a buffer
          with ${bufferSize} was recieved
        `;
      }
    }
  })
}

export function dynamicBuffer(sizeDataType : ISkelfDataType<number>){
  return createDataType<ArrayBuffer>({
    name: `dynamicBuffer(${sizeDataType.name})`,
    read: async function readDynamicBuffer(reader){
      const size = await sizeDataType.read(reader);
      return await reader.read(size);
    },
    write: async function writeDynamicBuffer(writer,value){
      try {
        const size = await sizeDataType.write(value.byteLength,writer);
      }
      catch(e){
        if(e instanceof ConstraintError){
          throw new ConstraintError(`
            ${sizeDataType} is not capable of holding the length of the dynamicString.
            byte length of the string: ${value.byteLength}.
            size data type constraint: ${e.message}.
          `)
        }
        else throw e
      }
      await writer.write(value);
    }
  })
}

export function delimitedBuffer(delimiter : ArrayBuffer,limit : number = Infinity){
  function constraintDelimitedBuffer(value : ArrayBuffer){
    const uint8 = new Uint8Array(value);
    const delimiterArray = new Uint8Array(delimiter);
    let bytesMatched = 0;
    let i;
    for(i=0;i<uint8.byteLength + delimiterArray.byteLength;i++){
      if(bytesMatched === delimiterArray.byteLength){
        return `delimitedBuffer can not contain its own delimitter!.
        delimiter found at index: '${i}'`
      }
      if(i < uint8.byteLength && uint8[bytesMatched] === delimiterArray[bytesMatched]){
        bytesMatched++;
      }
      else if(delimiterArray[i - uint8.byteLength] === delimiterArray[bytesMatched]){
        bytesMatched++;
      }
      else{
        bytesMatched = 0;
      }
    }
    return true;
  }
  return createDataType<ArrayBuffer>({
    name: `delimitedBuffer`,
    read: async function readDelimitedBuffer(reader){
      return await readUntil(reader,delimiter,limit);
    },
    write: async function writeDelimitedBuffer(writer,value){
      const constraintResult = constraintDelimitedBuffer(value);
      if(constraintResult !== true){
        throw new ConstraintError(constraintResult)
      }
      await writer.write(value);
      await writer.write(delimiter);
    }
  })
}
