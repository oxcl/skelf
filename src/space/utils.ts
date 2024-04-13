import {ISkelfBuffer,Offset} from "skelf/types"
import {InvalidOffsetError} from "skelf/errors"
import units from "skelf/units"
// shift a Uint8Array object by bits
export function shiftUint8ByBits(uint8 : Uint8Array, shift : number){
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
export function mergeBytes(headByte : number,tailByte : number,headSize : number){
  return (headByte >> (8-headSize) << (8-headSize)) | (((tailByte << headSize) & 0xFF) >> headSize)
}

// copy a buffer into new buffer with optional expanded space at the end
export function cloneBuffer(buffer : ArrayBuffer,expand : number = 0){
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

// convert offset values to bits
export function offsetToBits(offset : Offset){
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

// parse strings as offset values containing amount+unit values
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
