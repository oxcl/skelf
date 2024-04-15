import {NodeFileSpace} from "skelf/space/node"
import {IStruct,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,EndOfStreamError} from "skelf/errors"
import {offsetToBits,mergeBytes,offsetToString,cloneBuffer,shiftUint8ByBits,convertToSkelfBuffer} from "#utils"
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
  private cacheSize : number = 0;
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
    if(size === 0){
      this.#locked = false;
      return cnvertToSkelfBuffer(new ArrayBuffer(0),0);
    }

    if(this.cacheSize === 0){
      const sizeInBytes = Math.ceil(size / 8);
      if(sizeInBits % 8 === 0){
        const buffer = await this._read(sizeInBytes);
        this.#locked = false;
        return convertToSkelfBuffer(buffer,sizeInBits);
      }
      else {
        const buffer = await this._read(sizeInBytes);
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
          this.cacheByte >> (this.cacheSize - sizeInBits);
        ]);
        this.cacheSize -= sizeInBits;
        this.cacheByte &= 0xFF >> 8-this.cacheSize;
        this.#locked = false;
        return convertToSkelfBuffer(uint8.buffer,sizeInBits);
      }
      else {
        const bytesToRead = Math.ceil(sizeInBits - this.cacheSize);
        const buffer = await this._read(sizeInBytes);
        const alignedBuffer = ( sizeInBytes === bytesToRead ) ? buffer : cloneBuffer(buffer,1,1);
        const uint8 = new Uint8Array(alignedBuffer);
        const newCacheSize = this.cacheSize + bytesToRead*8 - sizeInBits;
        const newCacheByte = uint8[uint8.byteLength-1] & (0xFF >> (8-newCacheSize));
        shiftUint8ByBits(uint8,newCacheSize);
        // inject the cached bits into the new aligned buffer
        const injectionPosition = (size - cache) % 8;
        uint8[0] = mergeBytes((this.cacheByte << injectionPosition) & 0xFF,uint8[0],8-injectionPosition);
        if(this.cacheSize > newCacheSize){
          // some of the cached bits should be injected into the second byte of the buffer
          uint8[1] = this.cacheByte >> (8-injectionPosition)
        }
        this.#locked = false;
        return convertToSkelfBuffer(uint8.buffer,sizeInBits)
      }
    }


    ////////
//    if(sizeInBits <= this.cacheSize){
//      const buffer = new Uint8Array([
//        this.cacheByte >> (this.cacheSize - sizeInBits) // extracted the amount of bits needed from cache
//      ]).buffer;
//      this.cacheByte >>= sizeInBits; // remove extraxted bits from the cache
//      this.cacheSize -= sizeInBits;
//      this.#locked = false;
//      return buffer;
//    }
//
//    const sizeInBytes = Math.ceil(sizeInBits / 8); // how many bytes it takes to cover all bits
//    const bitsToRead  = sizeInBits - this.cacheSize; // amount of bits that should be read from the stream
//    const bytesToRead = Math.ceil((bytesToRead) / 8); // bytes that need to be readed
//    const bitsToCacheSize = (bytesToRead*8 - bitsToRead) % 8; // extra bits that are read from stream
//
//    if(this.cacheSize === 0){
//      if(sizeInBits % 8 === 0){
//        const buffer = await this._read(bytesToRead);
//        this.#locked = false;
//        return new SkelfBuffer(buffer,sizeInBits);
//      }
//
//      if(this.sizeInBytes !== bytesToRead){
//        const buffer = await this._read(bytesToRead);
//        const bitsToCache = buffer[buffer.byteLength-1] & (0xFF >> (8-bitsToCacheSize));
//        const alignedBuffer = cloneBuffer(buffer,1);
//        const uint8 = new Uint8Array(alignedBuffer)
//        shiftUint8ByBits(uint8,bitsToCacheSize);
//        this.cacheByte = bitsToCache
//        this.cacheSize = bitsToCacheSize;
//        this.#locked = false;
//        return new SkelfBuffer(alignedBuffer,sizeInBits);
//      }
//
//      const buffer = await this._read(bytesToRead);
//      const bitsToCache = buffer[buffer.byteLength-1] & (0xFF >> (8-bitsToCacheSize));
//      const uint8 = new Uint8Array(buffer);
//      shiftUint8ByBits(uint8,bitsToCacheSize);
//      this.cacheByte = bitsToCache;
//      this.cacheSize = bitsToCacheSize;
//      this.#locked = false;
//      return new SkelfBuffer(buffer,sizeInBits);
//    }
//
//    if(sizeInBits % 8 <= this.cacheSize){
//      // expansion is needed
//      const buffer = await this._read(bytesToRead);
//      this.#locked = false;
//      return new SkelfBuffer(buffer,sizeInBits);
//    }
//
//    if(this.sizeInBytes !== bytesToRead){
//      const buffer = await this._read(bytesToRead);
//      const bitsToCache = buffer[buffer.byteLength-1] & (0xFF >> (8-bitsToCacheSize));
//      const alignedBuffer = cloneBuffer(buffer,1);
//      const uint8 = new Uint8Array(alignedBuffer)
//      shiftUint8ByBits(uint8,bitsToCacheSize);
//      this.cacheByte = bitsToCache
//      this.cacheSize = bitsToCacheSize;
//      this.#locked = false;
//      return new SkelfBuffer(alignedBuffer,sizeInBits);
//    }
//
//    const buffer = await this._read(bytesToRead);
//    const bitsToCache = buffer[buffer.byteLength-1] & (0xFF >> (8-bitsToCacheSize));
//    const uint8 = new Uint8Array(buffer);
//    shiftUint8ByBits(uint8,bitsToCacheSize);
//    this.cacheByte = bitsToCache;
//    this.cacheSize = bitsToCacheSize;
//    this.#locked = false;
//    return new SkelfBuffer(buffer,sizeInBits);
//
//
//
//
//
//    const buffer = await this._read(bytesToRead);
//    if(!buffer || buffer.byteLength < bytesToRead)
//      throw new EndOfStreamError(`
//        stream '${this.name}' reached its end while trying to read '${offsetToString(size)}' from it.
//      `)
//
//    if(this.cacheSize === 0 && sizeInBits % 8 === 0){
//      this.#locked = false;
//      return buffer;
//    }
//
//    this.#locked = false;
  }
}

export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
