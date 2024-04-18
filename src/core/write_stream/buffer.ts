import {ISkelfBuffer} from "skelf/types"
import {SkelfWriteStream} from "skelf/write_stream"
import {offsetToBits} from "skelf/utils"
type BufferLike = ArrayBuffer | ISkelfBuffer | Uint8Array | Buffer;

export class BufferWriteStream extends SkelfWriteStream {
  readonly name : string;
  private uint8 : Uint8Array;
  static count : number = 0;
  constructor(bufferLike : BufferLike,private byteOffset : number = 0,name : string | undefined = undefined){
    super();
    this.name = `wbufferStream:${name ?? BufferWriteStream.count++}`;
    if(bufferLike instanceof Uint8Array){
      this.uint8 = bufferLike;
    }
    else {
      this.uint8 = new Uint8Array(bufferLike);
      if("bitLength" in bufferLike){
        console.warn(`WARNING: SkelfBuffer is converted to ArrayBuffer when using it as a Write Stream.`)
      }
    }
  }
  async _write(buffer : ArrayBuffer){
    const newBytes = new Uint8Array(buffer);
    for(let i=0;i<newBytes.byteLength;i++){
      this.uint8[this.byteOffset + i] = newBytes[i];
    }
    this.byteOffset += newBytes.byteLength;
  }
}
