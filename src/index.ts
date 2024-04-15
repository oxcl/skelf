import {NodeFileSpace} from "skelf/space/node"
import {IStruct,ISpace,Offset,IReadableStream,IWritableStream,ReadableStreamConstructorOptions} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,EndOfStreamError} from "skelf/errors"
import {offsetToBits,mergeBytes,offsetToString,cloneBuffer,shiftUint8ByBits,convertToSkelfBuffer} from "#utils"
import * as fs from "node:fs";

export abstract class BaseReadableStream implements IReadableStream {
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
  protected async _skip(size : number) : Promise<boolean>{
    const result = await this._read(size);
    return (result !== null) && (result.byteLength === size);
  };
  protected abstract _read(size : number) : Promise<ArrayBuffer | null>;

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
        to a read/write method, which might be still pending. or the stream might not be initialized yet.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        closing stream '${this.name}' while it's not initialized. streams should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `)
    if(this.closed)
      throw new StreamIsClosedError(`trying to close stream '${this.name}' while it's already closed.`)
    await this._close();
    this.#closed = true;
  }

  async skip(size : Offset){
    // TODO
  }

  async read(size : Offset){
    if(this.locked)
      throw new LockedStreamError(`
        trying to read from stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending. or the stream might not be initialized yet.
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
    if(size === 0){
      this.#locked = false;
      return convertToSkelfBuffer(new ArrayBuffer(0),0);
    }

    const sizeInBytes = Math.ceil(sizeInBits / 8);
    const bytesToRead = Math.ceil((sizeInBits - this.cacheSize) / 8);
    const buffer = await this._read(bytesToRead);
    if(!buffer)
      throw new EndOfStreamError(`
        stream '${this.name}' reached end its while trying to read ${bytesToRead} bytes from it.
      `);

    if(this.cacheSize === 0){
      if(sizeInBits % 8 === 0){
        this.#locked = false;
        return convertToSkelfBuffer(buffer,sizeInBits);
      }
      else {
        const uint8 = new Uint8Array(buffer);
        this.cacheSize = sizeInBytes*8 - sizeInBits;
        this.cacheByte = mergeBytes(0x00,uint8[uint8.byteLength-1],8-this.cacheSize);
        shiftUint8ByBits(uint8,this.cacheSize);
        this.#locked = false;
        return convertToSkelfBuffer(buffer,sizeInBits)
      }
    }
    else {
      if(sizeInBits <= this.cacheSize){
        const uint8 = new Uint8Array([
          this.cacheByte >> (this.cacheSize - sizeInBits)
        ]);
        this.cacheSize -= sizeInBits;
        this.cacheByte &= 0xFF >> 8-this.cacheSize;
        this.#locked = false;
        return convertToSkelfBuffer(uint8.buffer,sizeInBits);
      }
      else {
        const alignedBuffer = (sizeInBytes === bytesToRead) ? buffer : cloneBuffer(buffer,1,1);
        const uint8 = new Uint8Array(alignedBuffer);
        const newCacheSize = this.cacheSize + bytesToRead*8 - sizeInBits;
        const newCacheByte = uint8[uint8.byteLength-1] & (0xFF >> (8-newCacheSize));
        shiftUint8ByBits(uint8,newCacheSize);
        // inject the cached bits into the new aligned buffer
        const injectionPosition = (sizeInBits - this.cacheSize) % 8;
        uint8[0] = mergeBytes((this.cacheByte << injectionPosition) & 0xFF,uint8[0],8-injectionPosition);
        if(this.cacheSize > newCacheSize){
          // some of the cached bits should be injected into the second byte of the buffer
          uint8[1] = this.cacheByte >> (8-injectionPosition)
        }
        this.#locked = false;
        return convertToSkelfBuffer(uint8.buffer,sizeInBits)
      }
    }
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

export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
