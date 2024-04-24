import {createDataType} from "skelf/data_type"
import {ISkelfDataType} from "skelf/types"

export function fixedBuffer(size : number){
  return createDataType<ArrayBuffer>({
    name: `fixedBuffer(${size})`,
    async read(reader){
      return await reader.read(size);
    },
    async write(writer,value){
      await writer.write(value);
    }
  })
}

export function dynamicBuffer(sizeDataType : ISkelfDataType<number>){
  return createDataType<ArrayBuffer>({
    name: `dynamicBuffer(${sizeDataType.name})`,
    async read(reader){
      const size = await sizeDataType.read(reader);
      return await reader.read(size);
    },
    async write(writer,value){
      const size = await sizeDataType.write(value.byteLength,writer);
      await writer.write(value);
    }
  })
}
