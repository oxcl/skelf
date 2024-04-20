import {Offset,ISkelfReadStream} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,StreamReachedReadLimitError} from "skelf/errors"
import {offsetToBits,mergeBytes,offsetToString,cloneBuffer,shiftUint8ByBits,convertToSkelfBuffer} from "skelf/utils"

export abstract class SkelfReadStream implements ISkelfReadStream {
  abstract readonly name : string;

  #locked = false;
  get locked(){ return this.#locked }

  #ready = false;
  get ready(){ return this.#ready }

  #closed = false;
  get closed(){ return this.#closed }

  private cacheByte : number = 0;
  private cacheSize : number = 0;


  // sometimes when working with different sources and providers it is required to offset the data by a certain
  // amount (usually a few bits). what offset means in this context is to ignore and skip a certain amount of
  // data at the beginning of the source and pretend it does not exists. most of the time this isn't necessary.
  // so the default value for it is 0.
  protected readonly initialOffsetBits : number = 0;


  // these functions should be provided by the child class the arguments for these functions only accept whole
  // byte values so all the logic for working with bits is abstracted away for the creator of the stream.
  protected async _init()  : Promise<void>{};
  protected async _close() : Promise<void>{};
  protected abstract _read(size : number) : Promise<ArrayBuffer | null>;
  protected async _skip(size : number) : Promise<boolean | undefined> {
    const result = await this._read(size);
    return (result !== null) && (result.byteLength === size);
  };

  async init(){
    if(this.ready)
      throw new StreamInitializedTwiceError(`initializing stream '${this.name}' while already initialized.`);
    await this._init();
    this.#ready = true;
    if(this.initialOffsetBits > 0)
      await this.skip(`${this.initialOffsetBits}b`);
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
      console.error(`
        WARNING: stream ${this.name} was closed while ${this.cacheSize} bits remained in the cache.
        cache value: 0x${this.cacheByte.toString(16)}.
      `);
    this.#closed = true;
  }

  async skip(size : Offset){
    const sizeInBits = offsetToBits(size);
    if(this.locked)
      throw new LockedStreamError(`
        trying to skip ${offsetToString(size)} from stream '${this.name}' while it's locked. this could
        be caused by a not awaited call to a read/write method, which might be still pending.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        skipping ${offsetToString(size)} from stream '${this.name}' while it's not initialized. streams should
        be first initialized with the init method before using them. this could be caused by a not awaited call
        to the init method.
      `);
    if(this.closed)
      throw new StreamIsClosedError(`
        trying to skip ${offsetToString(size)} from stream '${this.name}' while it's already closed.
      `)
    this.#locked = true;

    if(sizeInBits === 0){
      this.#locked = false;
      return
    }

    if(sizeInBits <= this.cacheSize){
      this.cacheSize -= sizeInBits
      this.cacheByte &= 0xFF >> (8-sizeInBits)
      this.#locked = false;
      return
    }

    const bytesToSkip = Math.floor((sizeInBits - this.cacheSize) / 8);
    const bytesToRead = Math.ceil((sizeInBits - this.cacheSize) / 8) - bytesToSkip;

    // skip whole bytes
    const success = await this._skip(bytesToSkip);
    if(success === false)
      throw new StreamReachedReadLimitError(`
        stream '${this.name}' reached its end or limit while trying to skip ${bytesToSkip} bytes.
      `);
    if(bytesToRead === 0) return;
    // read the leftover bits that should be skipped in the last byte and cache the rest
    const buffer = await this._read(bytesToRead);
    if(!buffer || buffer.byteLength < bytesToRead)
      throw new StreamReachedReadLimitError(`
        stream '${this.name}' reached its end or limit while trying to read ${bytesToRead} bytes from it.
      `);
    const lastByte = (new Uint8Array(buffer,buffer.byteLength-1))[0];

    this.cacheSize = (8 - ((sizeInBits - this.cacheSize) % 8 )) % 8
    this.cacheByte = lastByte & (0xFF >> (8-this.cacheSize));
    this.#locked = false;
  }

  async read(size : Offset){
    if(this.locked)
      throw new LockedStreamError(`
        trying to read from stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        reading from stream '${this.name}' while it's not initialized. streams should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `);
    if(this.closed)
      throw new StreamIsClosedError(`trying to read from stream '${this.name}' while it's already closed.`)
    this.#locked = true;

    const sizeInBits = offsetToBits(size);

    if(sizeInBits === 0){
      this.#locked = false;
      return convertToSkelfBuffer(new ArrayBuffer(0),0);
    }

    if(sizeInBits <= this.cacheSize){
      const uint8 = new Uint8Array([
        this.cacheByte >> (this.cacheSize - sizeInBits)
      ]);
      this.cacheSize -= sizeInBits;
      this.cacheByte &= 0xFF >> 8-this.cacheSize;
      this.#locked = false;
      return convertToSkelfBuffer(uint8.buffer,sizeInBits);
    }

    const sizeInBytes = Math.ceil(sizeInBits / 8);
    const bytesToRead = Math.ceil((sizeInBits - this.cacheSize) / 8);

    const buffer = await this._read(bytesToRead);
    if(!buffer || buffer.byteLength < bytesToRead)
      throw new StreamReachedReadLimit(`
        stream '${this.name}' reached its end or limit while trying to read ${bytesToRead} bytes from it.
      `);

    if(this.cacheSize === 0 && sizeInBits % 8 === 0){
      this.#locked = false;
      return convertToSkelfBuffer(buffer,sizeInBits);
    }

    const alignedBuffer = (sizeInBytes === bytesToRead) ? buffer : cloneBuffer(buffer,1,1);
    const uint8 = new Uint8Array(alignedBuffer);
    const newCacheSize = this.cacheSize + bytesToRead*8 - sizeInBits;
    const newCacheByte = uint8[uint8.byteLength-1] & (0xFF >> (8-newCacheSize));
    shiftUint8ByBits(uint8,newCacheSize);
    if(this.cacheSize === 0){
      this.cacheSize = newCacheSize;
      this.cacheByte = newCacheByte;
      this.#locked = false;
      return convertToSkelfBuffer(buffer,sizeInBits);
    }
    // inject the cached bits into the new aligned buffer
    const injectionPosition = (sizeInBits - this.cacheSize) % 8;
    if(this.cacheSize > newCacheSize){
      // some of the cached bits should be injected into the second byte of the buffer instead of first
      uint8[1] = mergeBytes((this.cacheByte << injectionPosition) & 0xFF,uint8[1],8-injectionPosition);
      uint8[0] = this.cacheByte >> (8-injectionPosition)
    }
    else{
      uint8[0] = mergeBytes((this.cacheByte << injectionPosition) & 0xFF,uint8[0],8-injectionPosition);
    }
    this.#locked = false;
    return convertToSkelfBuffer(uint8.buffer,sizeInBits)
  }
}

export default SkelfReadStream
