import {ISkelfBuffer,Offset} from "skelf/types"
import {SkelfReadStream} from "skelf/read_stream"

type BufferLike = ISkelfBuffer | ArrayBuffer | Uint8Array | Buffer;

export class BufferReadStream extends SkelfReadStream {
  readonly name : string;
  private buffer : ArrayBuffer;
  static count : number = 0;
  private offset : number;
  constructor(bufferLike : BufferLike, name : string | undefined = undefined){
    super();
    this.name = `wbufferStream:${name ?? BufferReadStream.count++}`;
    if(bufferLike instanceof Uint8Array){
      this.buffer = bufferLike.buffer;
      this.offset = bufferLike.byteOffset;
    }
    else {
      this.offset = 0;
      this.buffer = bufferLike;
      if("bitLength" in bufferLike)
        console.warn(`WARNING: SkelfBuffer is converted to ArrayBuffer when using it as a Read Stream.`)
    }
  }
  async _read(size : number){
    if(size + this.offset >= this.buffer.byteLength)
      return null;
    const result = this.buffer.slice(this.offset,this.offset + size);
    this.offset += size;
    return result;
  }
  override async _skip(size : number){
    if(size + this.offset > this.buffer.byteLength)
      return false;
    this.offset += size;
    return true;
  }
}
