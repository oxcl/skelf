import {ISkelfBuffer} from "skelf/types"
import {SkelfWriteStream} from "skelf/write_stream"
import {offsetToBits} from "skelf/utils"
type BufferLike = ArrayBuffer | ISkelfBuffer | Uint8Array | Buffer;

export class BufferWriteStream extends SkelfWriteStream {
  readonly name : string;
  private buffer : ArrayBuffer;
  private bitOffset : number;
  static count : number = 0;
  constructor(bufferLike : BufferLike,offest : Offset = 0,name : string | undefined = undefined){
    super();
    this.name = `wbufferStream:${name ?? BufferWriteStream.count++}`;
    const offsetInBits = offsetToBits(offset);
    if(bufferLike instanceof Uint8Array){
      this.bitOffset = bufferLike.byteOffset*8 + offsetInBits;
      this.buffer = bufferLike.buffer;
    }
    else if("bitLength" in bufferLike){
      this.bitOffset = ((bufferLike.byteLength*8 - bufferLike.bitLength) % 8 ) + offsetInBits;
      this.buffer = bufferLike
    }
    else {
      this.bitOffset = offsetInBits;
      this.buffer = buffer;
    }
  }
  _write(buffer : ArrayBuffer){
    // TODO
  }
}
