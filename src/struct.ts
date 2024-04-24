import {ISkelfDataType} from "skelf/types"
import {createDataType} from "skelf/data_type"

type Distribute<T> = T extends any ? ISkelfDataType<T> : never
type Object = {[k: string]: any}

type DecisionMaker<T> = ((struct : any) => Distribute<T> | T)
  & ((struct : any) => Distribute<T> | null | undefined);

type StructSchema<T extends Object> = {
  [k in keyof T]: ISkelfDataType<T[k]> | DecisionMaker<T[k]>
}

export function createStruct<T extends Object>(
  name : string,
  schema : StructSchema<T>
){
  return createDataType<T>({
    name,
    async read(reader){
      const object : any = {};
      for(const [property,value] of Object.entries(schema)){
        const dataType = (typeof value === "function") ? value(object as Partial<T>) : value;
        if(!dataType) continue;
        object[property] = await dataType.read(reader);
      }
      return object as T;
    },
    async write(writer,object){
      for(const [property,value] of Object.entries(schema)){
        const dataType = (typeof value === "function") ? value(object as Partial<T>) : value;
        if(!dataType) continue;
        await dataType.write(object[property],writer);
      }
    }
  })
}

export default createStruct;

//
//createStruct("struct",{
//  name : cstring,
//  age  : int(8)
//})
//
//
//{
//  name : ISkelfDataType<string>,
//  age : ISkelfDataType<number>
//}
