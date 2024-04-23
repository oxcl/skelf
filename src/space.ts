import {ISkelfSpace,ISkelfBuffer,Offset} from "skelf/types"
import {LockedSpaceError,SpaceInitializedTwiceError,SpaceIsClosedError,SpaceIsNotReadyError,WriteOutsideSpaceBoundaryError,ReadOutsideSpaceBoundaryError} from "skelf/errors"
import {mergeBytes,offsetToBits,convertToSkelfBuffer,shiftUint8ByBits,cloneBuffer} from "skelf/utils"
// since javascript (and most computers in general) are not capable of working with individual bits directly,
// usually there are some common, operations (read hacks) that are needed to be done in spaces so that they are
// able to easily work with bits. these operations are mostly abstracted away in the Space class so that new
// spaces could be created easily without needing to worry about internal implementation details and dealing
// with bits

// an implementation of the ISpace interface to abstract some common operations away.
export abstract class SkelfSpace implements ISkelfSpace {
  abstract readonly name : string; // for debugging

  // when a space is locked read, write and close operations can't be executed because another operation is
  // currently running.
  get locked(){ return this.#locked };
  #locked : boolean = false;

  // a space is not ready when a space is not initialized using the init method. or the initialization process
  // has not yet finished running
  get ready(){ return this.#ready};
  #ready : boolean = false;

  // a space is identified as closed when the its close method is called
  get closed(){ return this.#closed };
  #closed : boolean = false;


  // sometimes when working with different sources and providers it is required to offset the data by a certain
  // amount (usually a few bits). what offset means in this context is to ignore and skip a certain amount of
  // data at the beginning of the source and pretend it does not exists. most of the time this isn't necessary.
  // so the default value for it is 0.
  protected initialOffsetBits : number = 0;

  // these functions should be provided by the creator of the object to the constructor (or a child class)
  // the arguments for these functions only accept whole byte values so all the logic for working with bits is
  // abstracted away for the creator of the space
  protected async _init()  : Promise<void>{};
  protected async _close() : Promise<void>{};
  protected abstract _read(size : number, offset : number) : Promise<ArrayBuffer | null>;
  protected abstract _write(buffer : ArrayBuffer, offset : number) : Promise<boolean | void>;

  async init(){
    if(this.ready)
      throw new SpaceInitializedTwiceError(`initializing stream '${this.name} while already initialized.'`);
    if(this._init) await this._init();
    this.#ready = true;
    return this;
  }

  async close(){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to close space '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending.
      `)
    if(!this.ready)
      throw new SpaceIsNotReadyError(`
        trying to close space '${this.name}' while it's not initialized. spaces should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `)
    if(this.closed)
      throw new SpaceIsClosedError(`trying to close space '${this.name}' while it's already closed.`)
    if(this._close) await this._close();
    this.#closed = true;
  }

  async read(size : Offset, offset : Offset = 0){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to read from space '${this.name}' while it's locked. this could be caused by a not awaited
        call to a read/write method, which might be still pending.
      `)
    if(!this.ready)
      throw new SpaceIsNotReadyError(`
        trying to read from space '${this.name}' while it's not initialized. spaces should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `)
    if(this.closed)
      throw new SpaceIsClosedError(`trying to read from space '${this.name}' while it's already closed.`)
    this.#locked = true;

    const offsetBits = offsetToBits(offset) + this.initialOffsetBits; // how many bits should be offseted
    const offsetWholeBytes = Math.floor(offsetBits / 8); // how many whole bytes can be offseted
    const leftoverOffsetBits = offsetBits % 8; // how bits that don't fit into a byte, should be offseted
    //console.log({offsetBits,offsetWholeBytes,leftoverOffsetBits})

    const sizeInBits = offsetToBits(size); // size of the buffer that should be read in bits

    // calculate how many bytes should be read from stream to cover all the bits for the buffer even if it
    // contains some extra bits, they will be zeroed out at the end.
    const bytesToRead = Math.ceil((leftoverOffsetBits + sizeInBits) / 8);
    const buffer = await this._read(bytesToRead,offsetWholeBytes);
    //console.log({sizeInBits,bytesToRead,buffer})

    if(!buffer)
      throw new ReadOutsideSpaceBoundaryError(`
        failed to read ${bytesToRead} bytes from space '${this.name}' from offset ${offsetWholeBytes} because
        it's out of bounds.
      `)
    const uint8 = new Uint8Array(buffer);

    // shift the array to the left to remove the leftover bits that were read but should be offseted.
    shiftUint8ByBits(uint8,-leftoverOffsetBits);
    //console.log({bufferAfterShift:buffer})

    // shift bits in the last byte to the right to remove the extra bits that are not part of the buffer.
    const bitShift = (8 - (sizeInBits % 8)) % 8;
    const bitsInTheLastByte = (leftoverOffsetBits + sizeInBits) % 8
    if(bitShift - leftoverOffsetBits >= 8){
      uint8[uint8.byteLength-2] >>= bitShift;
    }
    else {
      uint8[uint8.byteLength-1] >>= bitShift;
    }
    //console.log({bufferAfterRemovingExtraBits:buffer})


    this.#locked = false;
    // if the size doesn't have leftover bits but the offset does. that means after shifting bits to correct
    // positions, there should be a redundant empty byte at the beginning of the buffer that was read.
    if(bitShift - leftoverOffsetBits >= 8){
      return convertToSkelfBuffer(uint8.slice(1).buffer,sizeInBits);
    }
    else {
      return convertToSkelfBuffer(buffer,sizeInBits);
    }
  }

  async write(buffer : ISkelfBuffer | ArrayBuffer,offset : Offset = 0){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to write to space '${this.name}' while it's locked. this could be caused by a not awaited
        call to a read/write method, which might be still pending.
      `)
    if(!this.ready)
      throw new SpaceIsNotReadyError(`
        trying to write to space '${this.name}' while it's not initialized. spaces should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `)
    if(this.closed)
      throw new SpaceIsClosedError(`trying to write to space '${this.name}' while it's already closed.`)
    this.#locked = true;

    // extract the ArrayBuffer and bitLength values if input is a Skelf Buffer. if input is an ArrayBuffer
    // bitLength is assumed to be the length of the whole Array
    const sizeInBits = (buffer as ISkelfBuffer).bitLength ?? buffer.byteLength*8;
    //console.log({sizeInBits,buffer})

    const offsetBits = offsetToBits(offset) + this.initialOffsetBits; // how many bits shoulud be offseted
    const offsetWholeBytes = Math.floor(offsetBits / 8); // how many bytes can be offseted as whole

    // calculate how many offset bits are left over after whole bytes are offseted. these bits should be merged
    // in the first byte of the buffer we want to write. so it's kind of like the head of the buffer
    const headSize = offsetBits % 8;

    // calculate how many bits from the space should be merged with the last byte of the buffer so that original
    // bits in the space remain the same after merging bits in the buffer.
    const tailSize = (8 - ((headSize + sizeInBits) % 8)) % 8;
    //console.log({offsetBits,headSize,tailSize})

    // if the operation is in whole bytes without any leftovers, just write the buffer to space and return
    if(headSize === 0 && tailSize === 0){
      const result = await this._write(buffer,offsetWholeBytes);
      if(result === false)
        throw new ReadOutsideSpaceBoundaryError(`
          failed to write ${buffer.byteLength} bytes to space '${this.name}' from offset ${offsetWholeBytes}
          because it's out of bounds.
        `)
      this.#locked = false;
      return;
    }

    // since all buffers in javascript are represented as byte arrays and not bits when working with bits there
    // is usually some empty space in the buffer which can be used to inject heads and tails. it should be
    // checked if there is enough space for the head and tail, and if not the buffer will be expanded by one
    // byte
    const emptySpace = buffer.byteLength*8 - sizeInBits;

    const clonedBuffer = cloneBuffer(buffer,headSize > emptySpace ? 1 : 0);
    const uint8 = new Uint8Array(clonedBuffer)
    shiftUint8ByBits(uint8,headSize - emptySpace);

    // inject head
    if(headSize > 0){
      const leftOverBuffer = await this._read(1,offsetWholeBytes);
      if(!leftOverBuffer)
        throw new ReadOutsideSpaceBoundaryError(`
          failed to read 1 byte from space '${this.name}' from offset ${offsetWholeBytes} because it's out
          of bounds.
        `)
      const firstByte = new Uint8Array(leftOverBuffer)[0];
      uint8[0] = mergeBytes(firstByte,uint8[0],headSize);
    }

    // inject tail
    if(tailSize > 0){
      const leftOverBuffer = await this._read(1,offsetWholeBytes + uint8.byteLength-1);
      if(!leftOverBuffer)
        throw new ReadOutsideSpaceBoundaryError(`
          failed to read 1 byte from space '${this.name}' from offset ${offsetWholeBytes+uint8.byteLength-1}
          because it's out of bounds.
        `)
      const lastByte = new Uint8Array(leftOverBuffer)[0];
      uint8[uint8.byteLength-1] = mergeBytes(uint8[uint8.byteLength-1],lastByte,8 - tailSize);
    }

    const result = await this._write(clonedBuffer,offsetWholeBytes);
    if(result === false)
      throw new ReadOutsideSpaceBoundaryError(`
        failed to write ${clonedBuffer.byteLength} bytes from space '${this.name}' from offset
        ${offsetWholeBytes} because it's out of bounds.
      `)
    this.#locked = false;
  }
}

export default SkelfSpace
