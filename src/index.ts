import {NodeFileSpace} from "skelf/space/node"
import {IStruct,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,EndOfStreamError} from "skelf/errors"
import {offsetToBits,mergeByte,offsetToString,cloneBuffer} from "#utils"
import * as fs from "node:fs";

abstract class BaseReadableStream implements IReadableStream {
  abstract readonly name : string;

  #locked = true;
  get locked(){ return this.#locked }

  #ready = false;
  get ready(){ return this.#ready }

  #closed = false;
  get closed(){ return this.#closed }

  private cacheByte : number = 0;
  private cacheLength : number = 0;
  async init(){
    if(this.ready)
      throw new StreamInitializedTwiceError(`initializing stream '${this.name}' while already initialized.`);
    await this._init();
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

  read(size : Offset){
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

    if(sizeInBits <= this.cacheLength){
      const buffer = new Uint8Array([
        this.cacheByte >> (this.cacheLength - sizeInBits)
      ]).buffer;
      this.cacheByte >>= sizeInBits;
      this.cacheLength -= sizeInBits;
      this.#locked = false;
      return buffer;
    }
    
    const bytesToRead = Math.ceil((sizeInBits - this.cacheLength) / 8); // bytes that need to be readed
    const sizeInBytes = Math.ceil(sizeInBits / 8); // how many bytes it takes to cover all bits

    if(bytesToRead < sizeInBytes){
      const newCacheLength = sizeInBytes*8 - (sizeInBits + )
      // expansion is required
      const alignedBuffer = cloneBuffer(buffer,1);

    }

    const buffer = await this._read(bytesToRead);
    if(!buffer || buffer.byteLength < bytesToRead)
      throw new EndOfStreamError(`
        stream '${this.name}' reached its end while trying to read '${offsetToString(size)}' from it.
      `)

    if(this.cacheLength === 0 && sizeInBits % 8 === 0){
      this.#locked = false;
      return buffer;
    }

    this.#locked = false;
  }
}

export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
