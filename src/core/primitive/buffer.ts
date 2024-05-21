import {createDataType} from "skelf/data_type"
import {ISkelfDataType,Offset} from "skelf/types"
import {offsetToString,offsetToBlock,OffsetBlock,convertToSkelfBuffer} from "skelf/utils"
import {ISkelfBuffer} from "skelf/types"

export function fixedBuffer(size : Offset){
  const sizeBlock = offsetToBlock(size);
  return createDataType<ArrayBuffer | ISkelfBuffer>({
    name: `fixedBuffer(${offsetToString(size)})`,
    size : sizeBlock,
    read: async function readFixedBuffer(reader){
      return convertToSkelfBuffer(await reader.read(size),sizeBlock) as ISkelfBuffer;
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
      const size = await sizeDataType.write(value.byteLength,writer);
      await writer.write(value);
    }
  })
}
