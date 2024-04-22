import {ISkelfBuffer} from "skelf/types"
import {SkelfWriteStream} from "skelf/write_stream"
import {offsetToBits} from "skelf/utils"

export class ArrayWriteStream extends SkelfWriteStream {
  readonly name : string;
  static count : number = 0;
  constructor(
    readonly array : number[] = [],
    private offset : number = 0,
    name : string | undefined = undefined
  ){
    super();
    this.name = `warrayStream:${name ?? ArrayWriteStream.count++}`;
  }
  async _write(buffer : ArrayBuffer){
    const uint8 = new Uint8Array(buffer);
    for(let i=0;i<buffer.byteLength;i++){
      this.array[this.offset + i] = uint8[i];
    }
    this.offset += buffer.byteLength;
  }
}
