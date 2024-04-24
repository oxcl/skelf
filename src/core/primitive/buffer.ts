import {createDataType} from "skelf/data_type"
import {ISkelfDataType} from "skelf/types"

export function fixedBuffer(size : number){
  return createDataType<ArrayBuffer>({
    name: `fixedBuffer(${size})`,
    read: async function readFixedBuffer(reader){
      return await reader.read(size);
    },
    write: async function writeFixedBuffer(writer,value){
      await writer.write(value);
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
