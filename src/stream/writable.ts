import {Offset,IReadableStream,ReadableStreamConstructorOptions} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,EndOfStreamError} from "skelf/errors"
import {offsetToBits,mergeBytes,offsetToString,cloneBuffer,shiftUint8ByBits,convertToSkelfBuffer} from "#utils"

abstract class BaseStream {
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
      console.error(`
        stream ${this.name} was closed while ${this.cacheSize} bits remained in the cache.
        cache value: ${(new Uint8Array([this.cacheByte]))[0]}.
      `);
    this.#closed = true;
  }
}


export abstract class BaseWritableStream implements IWritableStream {

  protected abstract _write(buffer : ArrayBuffer) : Promise<boolean>;

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

    const sizeInBits = (buffer as ISkelfBuffer).bitLength ?? buffer.byteLength*8;
    const sizeInBytes = Math.ceil(sizeInBits / 8)

    if(sizeInBits === 0){
      this.#locked = false;
      return;
    }

    if(this.cacheSize + sizeInBits > 8){
      const byte = (new Uint8Array(buffer))[0];
      this.cacheByte = mergeByte(this.cacheByte,byte << (8 - this.cacheSize - sizeInBits),this.cacheSize)
      this.cacheSize += sizeInBits;
      return;
    }

    if(this.cacheSize === 0 && sizeInBits % 8 === 0){
      await this._write(buffer);
      return;
    }

    const emptySpaceSize = sizeInBytes*8 - sizeInBits;

    const newCacheSize = (this.cacheSize + sizeInBits) % 8;
    const newCache = (uint8[uint8.byteLength-1] << (8-newCacheSize) ) & 0xFF;

    shiftUint8ByBits(uint8,newCacheSize);

    // if cache is empty but size is not byted
    if(this.cacheSize === 0 && sizeInBits % 8 !== 0){
      const alignedBuffer = cloneBuffer(buffer);
      const uint8 = new Uint8Array(alignedBuffer);
      shiftUint8ByBits(uint8,-newCacheSize);
      const slicedBuffer = alignedBuffer.slice(0,-1);
      await this._write(slicedBuffer);
      this.#locked = false;
      return;
    }

    if(this.cacheSize === emptySpaceSize){
      // just inject the cache to the empty space in the buffer and be done with it
      const alignedBuffer = cloneBuffer(buffer);
      const uint8 = new Uint8Array(alignedBuffer);
      uint8[0] = mergeBytes(this.cacheByte,uint8[0],this.cacheSize);
      this._write(alignedBuffer);
      this.cacheSize = 0
      this.cacheByte = 0;
      this.#locked = false;
      return;
    }

    if(this.cacheSize > )





    const alignementShift = -(sizeInBytes*8 - sizeInBits) + this.cacheSize;
    if(alignementShift <= 0){
      shiftUint8ByBits(uint8,alignmentShift)
      uint8[0] =
    }

    if(this.cacheSize === 0 && sizeInBits % 8 !== 0){
      const bytesToWrite = Math.floor(sizeInBits / 8);
    }


    ////////////
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
      throw new EndOfStreamError(`
        stream '${this.name}' reached end its while trying to read ${bytesToRead} bytes from it.
      `);

    if(this.cacheSize === 0 && sizeInBits % 8 === 0){
      this.#locked = false;
      return convertToSkelfBuffer(buffer,sizeInBits);
    }

    if(this.cacheSize === 0 && sizeInBits % 8 !== 0){
      const uint8 = new Uint8Array(buffer);
      this.cacheSize = sizeInBytes*8 - sizeInBits;
      this.cacheByte = mergeBytes(0x00,uint8[uint8.byteLength-1],8-this.cacheSize);
      shiftUint8ByBits(uint8,this.cacheSize);
      this.#locked = false;
      return convertToSkelfBuffer(buffer,sizeInBits)
    }

    const alignedBuffer = (sizeInBytes === bytesToRead) ? buffer : cloneBuffer(buffer,1,1);
    const uint8 = new Uint8Array(alignedBuffer);
    const newCacheSize = this.cacheSize + bytesToRead*8 - sizeInBits;
    const newCacheByte = uint8[uint8.byteLength-1] & (0xFF >> (8-newCacheSize));
    shiftUint8ByBits(uint8,newCacheSize);
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









export class ReadableStream extends BaseReadableStream {
  readonly name : string;
  private readonly options : ReadableStreamConstructorOptions;
  protected override async _init(){
    if(this.options.init) return await this.options.init();
  };
  protected override async _close(){
    if(this.options.close) return await this.options.close();
  }
  protected override async _skip(size : number){
    if(this.options.skip) return await this.options.skip(size);
    else return await super._skip(size);
  }
  protected override async _read(size : number){
    return this.options.read(size);
  };

  constructor(options : ReadableStreamConstructorOptions){
    super();
    this.name = options.name;
    this.options = options;
  }

  static async create(options : ReadableStreamConstructorOptions){
    return await new ReadableStream(options).init();
  }
}

export default ReadableStream
