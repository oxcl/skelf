import {SkelfSpace} from "skelf/space"

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
    }
    else {
      this.offset = 0;
      this.buffer = bufferLike;
      if("bitLength" in bufferLike)
        console.warn(`WARNING: SkelfBuffer is converted to ArrayBuffer when using it as a SkelfSpace.`)
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
