import {Offset,ISkelfReadStream,IOffsetBlock} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError,StreamReachedReadLimitError,StreamClosedTwiceError} from "skelf/errors"
import {offsetToBlock,mergeBytes,offsetToString,cloneBuffer,shiftUint8ByBits,convertToSkelfBuffer,OffsetBlock} from "skelf/utils"
import Logger from "skelf/log"
const logger = new Logger("read_stream")

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
  protected initialOffsetBlock : IOffsetBlock = new OffsetBlock(0,0);


  // these functions should be provided by the child class the arguments for these functions only accept whole
  // byte values so all the logic for working with bits is abstracted away for the creator of the stream.
  protected async _init()  : Promise<void>{};
  protected async _close() : Promise<void>{};
  protected abstract _read(size : number) : Promise<ArrayBuffer | null>;
  protected async _skip(size : number) : Promise<boolean | undefined | void> {
    const result = await this._read(size);
    return (result !== null) && (result.byteLength === size);
  };

  async init(){
    if(this.ready)
      throw new StreamInitializedTwiceError(`initializing stream '${this.name}' while already initialized.`);
    await this._init();
    this.#ready = true;
    if(this.initialOffsetBlock.bits > 0 || this.initialOffsetBlock.bytes > 0)
      await this.skip(this.initialOffsetBlock);
    logger.log(`read stream '${this.name}' is initialized`);
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
      throw new StreamClosedTwiceError(`trying to close stream '${this.name}' while it's already closed.`)
    await this._close();
    if(this.cacheSize !== 0)
      logger.warn(`
        WARNING: stream ${this.name} was closed while ${this.cacheSize} bits remained in the cache.
        you probably forgot to flush!
        cache value: 0x${this.cacheByte.toString(16)}.
      `);
    this.#closed = true;
    logger.log(`read stream '${this.name}' is closed.`)
  }

  async skip(size : Offset){
    const sizeBlock = offsetToBlock(size);
    if(this.locked)
      throw new LockedStreamError(`
        trying to skip ${sizeBlock} from stream '${this.name}' while it's locked. this could
        be caused by a not awaited call to a read/write method, which might be still pending.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        skipping ${sizeBlock} from stream '${this.name}' while it's not initialized. streams should
        be first initialized with the init method before using them. this could be caused by a not awaited call
        to the init method.
      `);
    if(this.closed)
      throw new StreamIsClosedError(`
        trying to skip ${sizeBlock} from stream '${this.name}' while it's already closed.
      `)
    this.#locked = true;

    logger.verbose(`
      skipping ${offsetToString(size)} from read stream '${this.name}'
    `);

    if(sizeBlock.bytes === 0 && sizeBlock.bits === 0){
      this.#locked = false;
      return
    }

    if(sizeBlock.bytes === 0 && sizeBlock.bits <= this.cacheSize){
      this.cacheSize -= sizeBlock.bits;
      this.cacheByte &= 0xFF >> (8-this.cacheSize)
      this.#locked = false;
      return
    }

    const toSkipBlock = sizeBlock.subtract(new OffsetBlock(0,this.cacheSize));
    const bytesToSkip = toSkipBlock.floor();
    const bytesToRead = toSkipBlock.ceil() - bytesToSkip;
    //console.log({sizeBlock,toSkipBlock,bytesToSkip,bytesToRead})

    // skip whole bytes
    if(bytesToSkip > 0){
      const success = await this._skip(bytesToSkip);
      if(success === false){
        throw new StreamReachedReadLimitError(`
          stream '${this.name}' reached its end or limit while trying to skip ${bytesToSkip} bytes.
        `);
      }
      logger.verbose(`
        skipped ${bytesToSkip} bytes from underlying implementation of read stream '${this.name}'
      `)
    }
    if(bytesToRead === 0) {
      this.#locked = false;
      return;
    }
    // read the leftover bits that should be skipped in the last byte and cache the rest
    const buffer = await this._read(bytesToRead);
    //console.log({buffer})
    if(!buffer || buffer.byteLength < bytesToRead){
      throw new StreamReachedReadLimitError(`
        stream '${this.name}' reached its end or limit while trying to read ${bytesToRead} bytes from it.
      `);
    }

    logger.verbose(`
      read ${bytesToRead} bytes from underlying implementation of read stream'${this.name}'.
    `)

    const lastByte = (new Uint8Array(buffer,buffer.byteLength-1))[0];
    this.cacheSize = (8 - sizeBlock.subtract({bytes: 0 , bits: this.cacheSize}).bits ) % 8
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

    logger.verbose(`
      reading ${offsetToString(size)} from read stream '${this.name}'...
    `)

    const sizeBlock = offsetToBlock(size);

    if(sizeBlock.bytes === 0 && sizeBlock.bits === 0){
      this.#locked = false;
      return convertToSkelfBuffer(new ArrayBuffer(0),new OffsetBlock(0,0));
    }

    if(sizeBlock.bytes === 0 && sizeBlock.bits <= this.cacheSize){
      const uint8 = new Uint8Array([
        this.cacheByte >> (this.cacheSize - sizeBlock.bits)
      ]);
      this.cacheSize -= sizeBlock.bits;
      this.cacheByte &= 0xFF >> 8-this.cacheSize;
      this.#locked = false;
      return convertToSkelfBuffer(uint8.buffer,sizeBlock);
    }

    const bytesToRead = sizeBlock.subtract({bytes: 0, bits: this.cacheSize}).ceil();

    const buffer = await this._read(bytesToRead);
    if(!buffer || buffer.byteLength < bytesToRead){
      throw new StreamReachedReadLimitError(`
        stream '${this.name}' reached its end or limit while trying to read ${bytesToRead} bytes from it.
      `);
    }
    logger.verbose(`
      read ${bytesToRead} bytes from underlying implementation of read stream '${this.name}'.
    `)
    if(this.cacheSize === 0 && sizeBlock.bits === 0){
      this.#locked = false;
      return convertToSkelfBuffer(buffer,sizeBlock);
    }

    const uint8 = new Uint8Array(buffer);
    const newCacheSize = new OffsetBlock(bytesToRead,this.cacheSize).subtract(sizeBlock).bits;
    const newCacheByte = uint8[uint8.byteLength-1] & (0xFF >> (8-newCacheSize));

    shiftUint8ByBits(uint8,this.cacheSize);

    uint8[0] = mergeBytes((this.cacheByte<<(8-this.cacheSize)) & 0xFF,uint8[0],this.cacheSize)
    uint8[uint8.byteLength-1] >>= newCacheSize;

    this.cacheSize = newCacheSize;
    this.cacheByte = newCacheByte;
    this.#locked = false;
    return convertToSkelfBuffer(uint8.buffer,sizeBlock)
  }
}

export default SkelfReadStream
