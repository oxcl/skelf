import {ISkelfBuffer} from "skelf/types"
import {SkelfWriteStream} from "skelf/write_stream"
import {offsetToBits} from "skelf/utils"

export class BufferWriteStream extends SkelfWriteStream {
  readonly name : string;
  private bitOffset : number;
  static count : number = 0;
  constructor(array : number[], byteOffset : number = 0){
    super();
  }
  _write(buffer : ArrayBuffer){
    // TODO
  }
}
