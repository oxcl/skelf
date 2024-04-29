import {createDataType} from "skelf/data_type"
import {ISkelfDataType,Offset} from "skelf/types"
import {offsetToString,offsetToBits,convertToSkelfBuffer} from "skelf/utils"
import {ISkelfBuffer} from "skelf/types"

export function fixedBuffer(size : Offset){
  const offsetInBits = offsetToBits(size);
  return createDataType<ArrayBuffer | ISkelfBuffer>({
    name: `fixedBuffer(${offsetToString(size)})`,
    size : offsetInBits,
    read: async function readFixedBuffer(reader){
      return convertToSkelfBuffer(await reader.read(size),offsetToBits(size)) as ISkelfBuffer;
    },
    write: async function writeFixedBuffer(writer,value){
      await writer.write(value);
    },
    constraint: function constraintFixedBuffer(value){
      const bufferSize = (value as ISkelfBuffer).bitLength ?? value.byteLength*8;
      if(bufferSize === offsetInBits) return true;
      else {
        return `
          fixedBuffer must be ${offsetToString(size)} in size but a buffer
          with ${bufferSize} bits (${bufferSize/8} bytes) was recieved
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
      const size = await sizeDataType.write(value.byteLength,writer);
      await writer.write(value);
    }
  })
}
