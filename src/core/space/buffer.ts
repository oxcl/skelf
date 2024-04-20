import {SkelfSpace} from "skelf/space"
import {shiftUint8ByBits,cloneBuffer} from "skelf/utils"
type BufferLike = ArrayBuffer | Uint8Array | ISkelfBuffer | Buffer;

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
      this.skipInitialOffset = false; // no need;
    }
    else if("bitLength" in (bufferLike as any)){
      this.buffer = bufferLike;
      this.byteOffset = 0;
      this.initialOffsetBits = bufferLike.byteLengt*8 - bufferLike.bitLength;
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
    const destination = new Uint8Array(this.buffer);
    const source = new Uint8Array(chunk);
    for(let i=0;i<chunk.byteLength;i++){
      destination[this.byteOffset + offset] = source[i];
    }
  }
}
