import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,ISkelfInput,Offset} from "skelf/types"
import {IteratorReadStream,ArrayReadStream,BufferReadStream,SpaceReadStream,ArrayWriteStream,BufferWriteStream,SpaceWriteStream} from "skelf/core"
import {isSpace} from "skelf/utils"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReadStream/ISkelfWriteStream.
// this way the creator of the data type could easily implement it without worrying about different
// input/output arguments while the user of the data type could provide any valid input/output type that is
// supported by ISkelfDataType interface

export type createDataTypeOptions<T> = {
  readonly name : string,
  readonly read : (read_stream : ISkelfReadStream) => Promise<T>,
  readonly write : (value : T,write_stream : ISkelfWriteStream) => Promise<void>;
  readonly constraint? : (value : T)=> boolean;
};

export async function createDataType<T>(options : createDataTypeOptions<T>) : ISkelfDataType<T>{

  return {
    async read(input : SkelfInput, offset : Offset = 0){
    if(isSpace(input)){
      const stream =
      return await this._read()
    }

    },
    async write(value : T, output : SkelfOutput) : Promise<void> {

    },
    constraint(value : T) : boolean {

    }
  }
}

export default SkelfDataType
