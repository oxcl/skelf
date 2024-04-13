import {ISpace,ISkelfBuffer,Offset,SpaceConstructorArguments} from "skelf/types"
import {LockedSpaceError,InvalidOffsetError} from "skelf/errors"
import units from "skelf/units"

// since ArrayBuffers don't have the capability to work with bits, SkelfBuffer is a simple wrapper around
// ArrayBuffer class which adds the size of the buffer in bits using the bitLength property. when the data is
// less than 8 bits or has some leftover bits in the beginning this data is useful to know what is the actual
// size of the data that is being used
// with functions that accept both SkelfBuffer nad ArrayBuffer, the bitLength of the ArrayBuffer is assumed to
// be byteLength*8

// simple wrapper around ArrayBuffer to add bitLength.
export class SkelfBuffer implements ISkelfBuffer{
  readonly bitLength : number;
  constructor(
    readonly buffer : ArrayBuffer,
    offset : Offset
  ){
    this.bitLength = offsetToBits(offset);
  }
}

// since javascript (and most computers in general) are not capable of working with individual bits directly,
// usually there are some common, operations (read hacks) that are needed to be done in spaces so that they are
// able to easily work with bits. these operations are mostly abstracted away in the Space class so that new
// spaces could be created easily without needing to worry about internal implementation details and dealing
// with bits

// an implementation of the ISpace interface to abstract some common operations away.
export class Space implements ISpace {
  readonly name : string; // for debugging

  // when a space is locked read, write and close operations can't be executed because another operation is
  // currently running.
  get locked(){ return this.#locked};
  #locked : boolean = false;

  // these functions should be provided by the creator of the class in the constructor (or a child class)
  // the arguments for these functions only accept whole byte values so all the logic for working with bits is
  // abstracted away from the creator of the space
  private readonly _close? : SpaceConstructorArguments['close'];
  private readonly _read : SpaceConstructorArguments['read'];
  private readonly _write : SpaceConstructorArguments['write'];

  constructor(options : SpaceConstructorArguments){
    this.name = options.name;
    this._close = options.close;
    this._read = options.read;
    this._write = options.write;
  }

  async close(){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to close space '${this.name}' while it's locked. this could be caused by a not awaited call
        to this method, which might be still pending.
      `)
    if(this._close) await this._close();
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
        call to this method, which might be still pending.
      `)
    this.#locked = true;

    const totalBitsToOffset = offsetToBits(offset); // convert offset to bits
    const wholeBytesToOffset = Math.floor(totalBitsToOffset / 8); // calculate offset in whole bytes
    const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover offset bits
    // console.log({totalBitsToOffset,wholeBytesToOffset,leftoverBitsToOffset})

    const sizeInBits = offsetToBits(size); // convert size to bits
    const bytesToRead = Math.ceil((leftoverBitsToOffset + sizeInBits) / 8) // how many bytes can cover all bits
    const buffer = await this._read(bytesToRead,wholeBytesToOffset);
    const uint8 = new Uint8Array(buffer);

    // zero out the beginning of the first (most left) which doesn't include the desired bits
    uint8[0] &= 0xFF >> leftoverBitsToOffset

    // calculate how many bits should be shifted to the right
    const bitShift = (bytesToRead*8 - (leftoverBitsToOffset + sizeInBits)) % 8;

    shiftUint8ByBits(uint8,bitShift);

    this.#locked = false;
    // if the size doesn't have leftover bits but the offset does. that means after shifting bits to correct
    // positions, there should be a redundant empty byte at the beginning of the buffer that was read.
    if(bitShift + leftoverBitsToOffset >= 8){
      return new SkelfBuffer(uint8.slice(1).buffer,sizeInBits);
    }
    else {
      return new SkelfBuffer(buffer,sizeInBits);
    }
  }

  // when writing to a space with data that is less than 1 byte or has leftover bits (not whole bytes), we
  // have to first read the first and last byte from the space if neccessarry, so that we can add the
  // individual bits in our data to the space without loosing the rest of the bits in those bytes.
  // the buffer argument is assumed to be correctly padded so that leftover bits are stored on the most
  // significant bits of the last byte (most left).
  async write(arrayBuffer : ISkelfBuffer | ArrayBuffer,offset : Offset = 0){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to write to space '${this.name}' while it's locked. this could be caused by a not awaited
        call to this method, which might be still pending.
      `)
    this.#locked = true;

    // extract the ArrayBuffer and bitLength values if input is a Skelf Buffer. if input is an ArrayBuffer
    // bitLength is assumed to be the length of the whole Array
    const buffer    = (arrayBuffer instanceof ArrayBuffer) ? arrayBuffer              : arrayBuffer.buffer;
    const bitLength = (arrayBuffer instanceof ArrayBuffer) ? arrayBuffer.byteLength*8 : arrayBuffer.bitLength;
    //console.log({bitLength,buffer})

    const totalBitsToOffset = offsetToBits(offset); // calculate offset size in bits
    let wholeBytesToOffset = Math.floor(totalBitsToOffset / 8); // get offset in whole bytes
    const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover bits of the offset
    //console.log({totalBitsToOffset,wholeBytesToOffset,leftoverBitsToOffset})

    // if the operation is in whole bytes without any leftovers, just write the buffer to space and return
    if(leftoverBitsToOffset === 0 && bitLength % 8 === 0){
      await this._write(buffer,wholeBytesToOffset);
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
      const firstByte = new Uint8Array(await this._read(1,wholeBytesToOffset))[0];
      uint8[0] = mergeBytes(firstByte,uint8[0],leftoverBitsToOffset);
      //console.log({firstByte,uint8})
    }

    // merge the last byte with the byte in the space if neccessary
    if(alignmentShift !== 0){
      // how many bits should be taken from the last byte (most right byte) and merged with our buffer
      const tailSize = (8 - alignmentShift) % 8;
      const lastByte = new Uint8Array(await this._read(1,wholeBytesToOffset + uint8.byteLength-1))[0];
      uint8[uint8.byteLength-1] = mergeBytes(uint8[uint8.byteLength-1],lastByte,8 - tailSize);
    }
    await this._write(alignedBuffer,wholeBytesToOffset);
    this.#locked = false;
  }
}

function shiftUint8ByBits(uint8 : Uint8Array, shift : number){
  if(shift === 0) return;
  let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
  if(shift > 0){
    for(let i = 0;i < uint8.byteLength; i++) {
      // get the bits that will be cut from the right of the this byte to add them to the next byte later
      leftoverOfThisByte = (uint8[i] << (8-shift)) & 0xFF;
      // shift the byte by bit shift to the right
      uint8[i] >>= shift;
      // add the left overs from the previous byte that was shifted to this byte
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
  else{
    shift = -shift;
    for(let i = uint8.byteLength-1; i >= 0; --i){
      leftoverOfThisByte = uint8[i] >> (8-shift);
      uint8[i] <<= shift;
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
}

// merge two bytes into one based by defining the bit size of the head
function mergeBytes(headByte : number,tailByte : number,headSize : number){
  return (headByte >> (8-headSize) << (8-headSize)) | (((tailByte << headSize) & 0xFF) >> headSize)
}

function cloneBuffer(buffer : ArrayBuffer,expand : number = 0){
  const clonedBuffer = new ArrayBuffer(buffer.byteLength + expand);
  const lengthDouble = Math.floor(clonedBuffer.byteLength / Float64Array.BYTES_PER_ELEMENT);

  const float64 = new Float64Array(buffer,0, lengthDouble)
  const resultArray = new Float64Array(clonedBuffer,0, lengthDouble);

  for (let i = 0; i < resultArray.length; i++)
     resultArray[i] = float64[i];

  // copying over the remaining bytes
  const uint8 = new Uint8Array(buffer, lengthDouble * Float64Array.BYTES_PER_ELEMENT)
  const remainingArray = new Uint8Array(clonedBuffer, lengthDouble * Float64Array.BYTES_PER_ELEMENT);

  for (let i = 0; i < remainingArray.length; i++)
     remainingArray[i] = uint8[i];

  return clonedBuffer;
}

function offsetToBits(offset : Offset){
  if(typeof offset === "number"){
    return offset * 8;
  }
  if(typeof offset === "string"){
    const parsedOffset = parseOffsetString(offset);
    return parsedOffset.amount * parsedOffset.unit;
  }
  if(Array.isArray(offset)){
    return offset[0] * offset[1];
  }
  return offset.amount * offset.unit;
}

export function parseOffsetString(offsetString : string){
  const amount = Number.parseInt(offsetString);
  if(Number.isNaN(amount))
    throw new InvalidOffsetError(`failed to parse the amount portion of the offset string '${offsetString}'.`);

  const unitString = offsetString.slice(offsetString.search(/[A-Za-z]/));
  switch(unitString){
  case "b": case "bit": case "bits":
    return {amount, unit: units.bit};
  case "B": case "Byte": case "Bytes":
    return {amount, unit: units.byte};
  case "Kb": case "kb": case "Killobit": case "killobit": case "KilloBit": case "killoBit": case "Killobits":
  case "killobits": case "KilloBits": case "killoBits":
    return {amount, unit: units.killobit};
  case "KB": case "kB": case "Killobyte": case "killobyte": case "KilloByte": case "killoByte":
  case "Killobytes": case "killobytes": case "KilloBytes": case "killoBytes":
    return {amount, unit: units.killobyte};
  default:
    throw new InvalidOffsetError(`
      unable to parse unknown unit '${unitString}' in offset string
      '${offsetString}' with amount being: ${amount}.`
    );
  }
}


export * from "skelf/units"
export * from "skelf/types"
