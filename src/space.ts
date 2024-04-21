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

  // when reading from a space if the data is either less that 8 bits or has bit leftovers (isn't whole byte),
  // data will be read in whole bytes and then the extra bits will be zeroed and padded so that the resulting
  // buffer is padded.
  // for example:
  // byte that is being read : 1 0 1 0 1 0 1 0
  // asking for 1 bit  gives : 0 0 0 0 0 0 0 1
  // asking for 2 bits gives : 0 0 0 0 0 0 1 0
  // asking for 3 bits gives : 0 0 0 0 0 1 0 1
  // and such
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
    // console.log({totalBitsToOffset,wholeBytesToOffset,leftoverBitsToOffset})

    const sizeInBits = offsetToBits(size); // size of the buffer that should be read in bits

    // calculate how many bytes should be read from stream to cover all the bits for the buffer even if it
    // contains some extra bits, they will be zeroed out at the end.
    const bytesToRead = Math.ceil((leftoverOffsetBits + sizeInBits) / 8);
    const buffer = await this._read(bytesToRead,offsetWholeBytes);
    if(!buffer)
      throw new ReadOutsideSpaceBoundaryError(`
        failed to read ${bytesToRead} bytes from space '${this.name}' from offset ${offsetWholeBytes} because
        it's out of bounds.
      `)
    const uint8 = new Uint8Array(buffer);

    // shift the array to the left to remove the leftover bits that were read but should be offseted.
    shiftUint8ByBits(uint8,leftoverOffsetBits);

    // shift bits in the last byte to the right to remove the extra bits that are not part of the buffer.
    const bitShift = (8 - sizeInBits % 8) % 8;
    uint8[uint8.byteLength-1] >>= bitShift;


    this.#locked = false;
    // if the size doesn't have leftover bits but the offset does. that means after shifting bits to correct
    // positions, there should be a redundant empty byte at the beginning of the buffer that was read.
    if(bitShift + leftoverOffsetBits >= 8){
      return convertToSkelfBuffer(uint8.slice(1).buffer,sizeInBits);
    }
    else {
      return convertToSkelfBuffer(buffer,sizeInBits);
    }
  }

  // when writing to a space with data that is less than 1 byte or has leftover bits (not whole bytes), we
  // have to first read the first and last byte from the space if neccessarry, so that we can add the
  // individual bits in our data to the space without loosing the rest of the bits in those bytes.
  // the buffer argument is assumed to be correctly padded so that leftover bits are stored on the most
  // significant bits of the last byte (most left).
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
    const bitLength = (buffer as ISkelfBuffer).bitLength ?? buffer.byteLength*8;
    //console.log({bitLength,buffer})

    const totalBitsToOffset = offsetToBits(offset) + this.initialOffsetBits; // calculate offset size in bits
    let wholeBytesToOffset = Math.floor(totalBitsToOffset / 8); // get offset in whole bytes
    const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover bits of the offset
    //console.log({totalBitsToOffset,wholeBytesToOffset,leftoverBitsToOffset})

    // if the operation is in whole bytes without any leftovers, just write the buffer to space and return
    if(leftoverBitsToOffset === 0 && bitLength % 8 === 0){
      const result = await this._write(buffer,wholeBytesToOffset);
      if(result === false)
        throw new ReadOutsideSpaceBoundaryError(`
          failed to write ${buffer.byteLength} bytes to space '${this.name}' from offset ${wholeBytesToOffset}
          because it's out of bounds.
        `)
      this.#locked = false;
      return;
    }

    // the padding in the buffer argument and the padding that is required for the space (with the bit offset)
    // should be aligned so that if the write operation should begin from the nth bit of a byte in the space,
    // the buffer is padded with n empty bits to the right.
    const bitPadding = (buffer.byteLength*8 - bitLength) % 8;
    const alignmentShift = leftoverBitsToOffset - bitPadding;
    //console.log({bitPadding,alignmentShift})

    // if the buffer should be shifted to the right one extra byte should be added to the right of the buffer
    // so that bits are not lost due to overflowing
    const expand = (alignmentShift > 0) ? +1 : 0;
    const alignedBuffer = cloneBuffer(buffer,expand);
    const uint8 = new Uint8Array(alignedBuffer);
    shiftUint8ByBits(uint8, alignmentShift);
    //console.log({expand,uint8})

    // merge the first byte with the byte in the space if neccessary
    if(leftoverBitsToOffset !== 0){
      const leftOverBuffer = await this._read(1,wholeBytesToOffset);
      if(!leftOverBuffer)
        throw new ReadOutsideSpaceBoundaryError(`
          failed to read 1 byte from space '${this.name}' from offset ${wholeBytesToOffset} because it's out
          of bounds.
        `)
      const firstByte = new Uint8Array(leftOverBuffer)[0];
      uint8[0] = mergeBytes(firstByte,uint8[0],leftoverBitsToOffset);
      //console.log({firstByte,uint8})
    }

    // merge the last byte with the byte in the space if neccessary
    if(alignmentShift !== 0){
      // how many bits should be taken from the last byte (most right byte) and merged with our buffer
      const tailSize = (8 - alignmentShift) % 8;
      const leftOverBuffer = await this._read(1,wholeBytesToOffset + uint8.byteLength-1);
      if(!leftOverBuffer)
        throw new ReadOutsideSpaceBoundaryError(`
          failed to read 1 byte from space '${this.name}' from offset ${wholeBytesToOffset+uint8.byteLength-1}
          because it's out of bounds.
        `)
      const lastByte = new Uint8Array(leftOverBuffer)[0];
      uint8[uint8.byteLength-1] = mergeBytes(uint8[uint8.byteLength-1],lastByte,8 - tailSize);
    }
    const result = await this._write(alignedBuffer,wholeBytesToOffset);
    if(result === false)
      throw new ReadOutsideSpaceBoundaryError(`
        failed to write ${alignedBuffer.byteLength} bytes from space '${this.name}' from offset
        ${wholeBytesToOffset} because it's out of bounds.
      `)
    this.#locked = false;
  }
}

export default SkelfSpace
