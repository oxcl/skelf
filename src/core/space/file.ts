import {SkelfSpace} from "skelf/space"
import  {copyBuffer} from "skelf/utils"


// adapter for fileHandle object of node.js fs module. this should also work fine with any other
// fileHandle object uses the same interface as node.js. in internal buffering mechanism is used
// to reduce the number of read and write requests. that's why closing the space is really important
// because only by closing the space the remaining bytes are flushed from the buffer into the file.
export class FileSpace extends SkelfSpace {
  private file! : FileHandle;
  private readChunk : ArrayBuffer;
  private readChunkOffset : number;
  private writeChunk : ArrayBuffer;
  private writeChunkOffset : number;
  private writeChunkSize : number;
  constructor(
    private readonly fileOrPromise : FileHandle | Promise<FileHandle>,
    override readonly name : string = "fileHandle",
    private readonly chunkCapacity : number = 1024
  ){
    super();
    this.readChunk = new ArrayBuffer(chunkCapacity);
    this.readChunkOffset = NaN;
    this.writeChunk = new ArrayBuffer(chunkCapacity);
    this.writeChunkOffset = 0;
    this.writeChunkSize = 0;
  };
  override async _init(){
    this.file = await this.fileOrPromise;
  }
  async _read(size : number,position : number){
    if(this.writeChunkSize !== 0){
      await this.flushWriteChunk();
    }

    if(size >= this.chunkCapacity){
      const uint8 = new Uint8Array(size);
      await this.file.read(uint8,0,size,position);
      return uint8.buffer
    }

    if(
      Number.isNaN(this.readChunkOffset)
      || position < this.writeChunkOffset
      || position + size > this.writeChunkOffset + this.chunkCapacity
    ){
      await this.file.read(new Uint8Array(this.readChunk),0,this.chunkCapacity,position);
      this.readChunkOffset = position;
    }
    const offset = position - this.readChunkOffset;
    return this.readChunk.slice(offset,offset + size);
  }
  async _write(buffer : ArrayBuffer, position : number){
    if(buffer.byteLength >= this.chunkCapacity){
      await this.file.write(new Uint8Array(buffer),0,buffer.byteLength,position);
    }
    else if(
      position !== this.writeChunkOffset + this.writeChunkSize
      || position + buffer.byteLength > this.chunkCapacity -  this.writeChunkSize
    ){
      await this.flushWriteChunk();
      this.writeChunkOffset = position;
    }
    else {
      copyBuffer(buffer,this.writeChunk,0,buffer.byteLength,this.writeChunkSize);
      this.writeChunkSize += buffer.byteLength;
    }
  }
  override async _close(){
    await this.flushWriteChunk();
  }

  private async flushWriteChunk(){
    if(this.writeChunkSize !== 0){
      const buffer = this.writeChunkSize === this.chunkCapacity ? this.writeChunk : this.writeChunk.slice(0,this.writeChunkSize)
      await this.file.write(new Uint8Array(buffer),0,buffer.byteLength,this.writeChunkOffset);
      this.writeChunkSize = 0;
    }
  }

  // create an initialize a new node file space so that it's ready to use
  static async create(file : FileHandle,name : string){
    const newSpace = new FileSpace(file,name);
    await newSpace.init();
    return newSpace;
  }
}

export default FileSpace;
