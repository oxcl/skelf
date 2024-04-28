import {createDataType} from "skelf/data_type"
import {ISkelfDataType} from "skelf/types"

export function dynamicArray<T>(lengthDataType : ISkelfDataType<number>,itemDataType : ISkelfDataType<T>){
  return createDataType<T[]>({
    name: `${itemDataType.name}[${lengthDataType.name}]`,
    read : async function readDynamicArray(reader){
      const array : T[] = [];
      const size = await lengthDataType.read(reader);
      for(let i=0;i<size;i++){
        array.push(await itemDataType.read(reader));
      }
      return array;
    },
    write : async function writeDynamicArray(writer,array){
      await lengthDataType.write(array.length,writer);
      for(const item of array){
        await itemDataType.write(item,writer)
      }
    }
  })
}

export function fixedArray<T>(length : number, itemDataType : ISkelfDataType<T>){
  return createDataType<T[]>({
    name: `${itemDataType.name}[${length}]`,
    size: (itemDataType.size) ? (itemDataType.size*length) : (undefined),
    read: async function readFixedArray(reader){
      const array : T[] = new Array(length);
      for(let i=0;i<length;i++){
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
