import {createDataType} from "skelf/data_type"
import {ISkelfDataType} from "skelf/types"

export function dynamicArray<T>(sizeDataType : ISkelfDataType<number>,itemDataType : ISkelfDataType<T>){
  return createDataType<T[]>({
    name: `${itemDataType.name}[${sizeDataType.name}]`,
    read : async function readDynamicArray(reader){
      const array : T[] = [];
      const size = await sizeDataType.read(reader);
      for(let i=0;i<size;i++){
        array.push(await itemDataType.read(reader));
      }
      return array;
    },
    write : async function writeDynamicArray(writer,array){
      await sizeDataType.write(array.length,writer);
      for(const item of array){
        await itemDataType.write(item,writer)
      }
    }
  })
}

export function fixedArray<T>(size : number, itemDataType : ISkelfDataType<T>){
  return createDataType<T[]>({
    name: `${itemDataType.name}[${size}]`,
    read: async function readFixedArray(reader){
      const array : T[] = new Array(size);
      for(let i=0;i<size;i++){
        array[i] = await itemDataType.read(reader);
      }
      return array;
    },
    write: async function writeFixedArray(writer,array){
      for(const item of array){
        await itemDataType.write(item,writer)
      }
    }
  })
}
