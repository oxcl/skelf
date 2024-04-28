import {createDataType} from "skelf/data_type"
import {ConstraintError} from "skelf/errors"
import {convertToSkelfBuffer} from "skelf/utils"

function createBooleanType(size : number,name : string){
  return createDataType<boolean>({
    name,
    size,
    read: async function readBoolean(reader){
      const number = new Uint8Array((await reader.read(`${size}b`)))[0];
      if(number === 0) return false;
      if(number === 1) return true;
      else throw new ConstraintError(`'${this.name}' value can be either 1 or 0 but recieved ${number}`);
    },
    write: async function writeBoolean(writer,value){
      const buffer = new Uint8Array([value ? 1 : 0]).buffer;
      await writer.write(convertToSkelfBuffer(buffer,size));
    }
  })
}

export const byteBool = createBooleanType(8,"byteBool");
export const bool = byteBool;

export const bitBool = createBooleanType(1,"bitBool");
