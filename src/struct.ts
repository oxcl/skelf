import {ISkelfStruct,ISkelfReadStream,ISkelfWriteStream,SkelfStructInput,Offset} from "skelf/types"

// skelf structs accept a variety of different types for the input and output arguments. this class is an
// implementation of the ISkelfStruct intreface which abstracts the complexity of working with all sorts
// of input and output types by converting them all into a simple SkelfReadStream/SkelfWriteStream.
// this way the creator of the struct could easily implement the struct without worrying about different
// input/output arguments while the user of the struct could provide any valid input/output type that is
// supported by ISkelfStruct interface
export abstract class SkelfStruct<T> implements ISkelfStruct<T> {
  protected abstract name : string;
  protected abstract _read(input : ISkelfReadStream) : Promise<T>;
  protected abstract _write(value : T,output : ISkelfWriteStream) : Promise<void>;
  protected _constraint(value : T) : boolean { return true; };

  async read(input : SkelfStructInput, offset : Offset = 0){
    // converted to array buffer

    // converted to number iterator
  }
}

export default SkelfStruct
