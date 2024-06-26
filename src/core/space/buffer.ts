import {SkelfSpace} from "skelf/space"
import {shiftUint8ByBits,copyBuffer,OffsetBlock} from "skelf/utils"
import {ISkelfBuffer} from "skelf/types"

type BufferLike = ArrayBuffer | Uint8Array | Buffer;

export class BufferSpace extends SkelfSpace {
  static count : number = 0;
  readonly name : string;
  private buffer : ArrayBuffer;
  private byteOffset : number;
  constructor(bufferLike : BufferLike, name : string | undefined = undefined){
    super();
    this.name = `bufferSpace:${name ?? BufferSpace.count++}`;
    if(bufferLike instanceof Uint8Array){
      this.buffer = bufferLike.buffer;
      this.byteOffset = bufferLike.byteOffset;
    }
    else {
      this.byteOffset = 0;
      this.buffer = bufferLike;
    }
  }
  async _read(size : number,offset : number){
    if(this.byteOffset + size + offset >= this.buffer.byteLength)
      return null;
    return this.buffer.slice(this.byteOffset + offset,this.byteOffset + offset + size);
  }
  async _write(chunk : ArrayBuffer, offset : number){
    copyBuffer(chunk,this.buffer,0,chunk.byteLength,offset);
  }
}
