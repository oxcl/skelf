import {ISkelfDataType} from "skelf/types"
import {createDataType} from "skelf/data_type"
import {Logger} from "skelf/log"

const logger = new Logger("struct");

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
  logger.log(`creating a new struct named '${name}'...`)
  return createDataType<T>({
    name,
    async read(reader){
      logger.log(`reading a '${this.name}' from reader '${reader.name}'...`)
      const object : any = {};
      for(const [property,value] of Object.entries(schema)){
        const dataType = (typeof value === "function") ? value(object as Partial<T>) : value;
        if(!dataType) continue;
        logger.verbose(`
          reading property '${property}' of '${this.name}' as '${dataType.name}'
          from reader '${reader.name}'...`)
        object[property] = await dataType.read(reader);
        logger.verbose(`${this.name}[${property}] = '${object[property].toString().slice(0,100)}'`)
      }
      return object as T;
    },
    async write(writer,object){
      logger.log(`writing a '${this.name}' to writer '${writer.name}'`)
      for(const [property,value] of Object.entries(schema)){
        const dataType = (typeof value === "function") ? value(object as Partial<T>) : value;
        if(!dataType) continue;
        logger.verbose(`
          writing property '${property}' of '${this.name}'
          with value '${object[property].toString().slice(0,100)}'
          as '${dataType.name}'
          to '${writer.name}'...`)
        await dataType.write(object[property],writer);
      }
    }
  })
}

export default createStruct;
