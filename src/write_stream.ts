import {Offset,ISkelfBuffer,ISkelfWriteStream,IOffsetBlock} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,StreamReachedWriteLimitError} from "skelf/errors"
import {offsetToBlock,mergeBytes,offsetToString,cloneBuffer,shiftUint8ByBits,convertToSkelfBuffer,groom,OffsetBlock} from "skelf/utils"

export abstract class SkelfWriteStream implements ISkelfWriteStream {
  abstract readonly name : string;

  #locked = false;
  get locked(){ return this.#locked }

  #ready = false;
  get ready(){ return this.#ready }

  #closed = false;
  get closed(){ return this.#closed }

  private cacheByte : number = 0;
  private cacheSize : number = 0;

  // these functions should be provided by the creator of the object to the constructor (or a child class)
  // the arguments for these functions only accept whole byte values so all the logic for working with bits is
  // abstracted away for the creator of the stream
  protected async _init()  : Promise<void>{};
  protected async _close() : Promise<void>{};
  protected abstract _write(buffer : ArrayBuffer) : Promise<boolean | void>;

  async init(){
    if(this.ready)
      throw new StreamInitializedTwiceError(`initializing stream '${this.name}' while already initialized.`);
    await this._init();
    this.#ready = true;
    return this;
  }

  async close(){
    if(this.locked)
      throw new LockedStreamError(`
        trying to close stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        closing stream '${this.name}' while it's not initialized. streams should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `)
    if(this.closed)
      throw new StreamIsClosedError(`trying to close stream '${this.name}' while it's already closed.`)
    await this._close();
    if(this.cacheSize !== 0)
      console.error(groom(`
        WARNING: stream '${this.name}' was closed while ${this.cacheSize} bits remained in the cache.
        cache value: 0x${this.cacheByte.toString(16)}.
      `));
    this.#closed = true;
  }

  async write(buffer : ISkelfBuffer | ArrayBuffer){
    if(this.locked)
      throw new LockedStreamError(`
        trying to write to stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        writing to stream '${this.name}' while it's not initialized. streams should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `);
    if(this.closed)
      throw new StreamIsClosedError(`trying to write to stream '${this.name}' while it's already closed.`)
    this.#locked = true;

    const sizeBlock = (buffer as ISkelfBuffer).size ?? new OffsetBlock(buffer.byteLength);
    const emptySpace = new OffsetBlock(buffer.byteLength).subtract(sizeBlock).bits;

    if(sizeBlock.bytes === 0 && sizeBlock.bits === 0){
      this.#locked = false;
      return;
    }

    if(this.cacheSize === 0 &&  sizeBlock.bits === 0){
      const result = await this._write(buffer);
      if(result === false)
        throw new StreamReachedWriteLimitError(`
          stream '${this.name}' reached its end or limit while trying to write ${buffer.byteLength}
          bytes to it.
        `)
      this.#locked = false;
      return;
    }

    if(sizeBlock.bytes === 0 && this.cacheSize + sizeBlock.bits < 8){
      const byte = (new Uint8Array(buffer))[0];
      this.cacheByte = mergeBytes(this.cacheByte,byte << (8 - this.cacheSize - sizeBlock.bits),this.cacheSize)
      this.cacheSize += sizeBlock.bits;
      this.#locked = false;
      return;
    }

    const alignedBuffer = cloneBuffer(buffer);
    const uint8 = new Uint8Array(alignedBuffer);
    uint8[uint8.byteLength-1] <<= emptySpace;

    // caching leftover bits that will not fit in a whole byte
    let finalBuffer : ArrayBuffer;
    if(emptySpace > this.cacheSize){
      shiftUint8ByBits(uint8,this.cacheSize);
      uint8[0] = mergeBytes(this.cacheByte,uint8[0],this.cacheSize);
      this.cacheSize = (8 - emptySpace) % 8;
      this.cacheSize = uint8[uint8.byteLength-1];
      finalBuffer = alignedBuffer.slice(1);
    }
    else{
      const newCacheSize = (this.cacheSize + sizeBlock.bits) % 8;
      const leftoverBits = shiftUint8ByBits(uint8,this.cacheSize);
      uint8[0] = mergeBytes(this.cacheByte,uint8[0],this.cacheSize);
      this.cacheSize = newCacheSize;
      this.cacheByte = leftoverBits;
      finalBuffer = alignedBuffer;
    }

    const result = await this._write(finalBuffer);
    if(result === false)
      throw new StreamReachedWriteLimitError(`
        stream '${this.name}' reached its end or limit while trying to write ${finalBuffer.byteLength}
        bytes to it.
      `)
    this.#locked = false;
    return;
  }

  async flush(){
    if(this.cacheSize === 0) return 0;
    const result = await this._write(
      new Uint8Array([
        mergeBytes(this.cacheByte,0x00,this.cacheSize)
      ]).buffer
    )
    if(result === false){
      throw new StreamReachedWriteLimitError(`
        stream '${this.name}' reached its end or limit while trying to flush it by writing a byte to it.
      `);
    }
    const bitsFlushed = 8 - this.cacheSize;
    this.cacheSize = 0;
    this.cacheByte = 0;
    return bitsFlushed;
  }
}
export default SkelfWriteStream
