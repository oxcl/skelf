import {ISkelfDataType,ISkelfReadStream,ISkelfWriteStream,ISkelfInput,Offset,ISkelfSpace,ISkelfReader,ISkelfWriter} from "skelf/types"
import {BufferSpace} "skelf/core"
import {isSpace,offsetToBits} from "skelf/utils"
// a skelf data type accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfDataType intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple ISkelfReadStream/ISkelfWriteStream.
// this way the creator of the data type could easily implement it without worrying about different
// input/output arguments while the user of the data type could provide any valid input/output type that is
// supported by ISkelfDataType interface

type createDataTypeOptions<T> = {
  readonly name : string,
  readonly read : (reader : ISkelfReader) => Promise<T>,
  readonly write : (value : T,writer : ISkelfWriter) => Promise<void>;
  readonly constraint? : (value : T) => boolean | string | undefined;
};

export async function createDataType<T>(options : createDataTypeOptions<T>) : ISkelfDataType<T>{

}

export default SkelfDataType
