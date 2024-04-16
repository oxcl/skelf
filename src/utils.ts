import {ISkelfBuffer,Offset} from "skelf/types"
import {InvalidOffsetError,SkelfError,InvalidArgumentError} from "skelf/errors"
import units from "skelf/units"

// merge two bytes into one based by defining the bit size of the head
export function mergeBytes(headByte : number,tailByte : number,headSize : number){
  return (headByte >> (8-headSize) << (8-headSize)) | (((tailByte << headSize) & 0xFF) >> headSize)
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

function offsetUnitToString(unit : number){
  switch(unit){
  case units.bit: return "b";
  case units.byte: return "B";
  case units.killobit: return "kb";
  case units.killobyte: return "KB";
  default: return `x${unit}b`;
  }
}

export function offsetToString(offset : Offset){
  if(typeof offset === "number")
    return `${offset}B`
  else if(Array.isArray(offset))
    return `[${offset[0]} x ${offset[1]}]b`
  else if(typeof offset === "object" && "amount" in offset && "unit" in offset){
    return `${offset.amount}${offsetUnitToString(offset.unit)}`
  }
  else if(typeof offset === "string")
    return offset;
  else
    throw new InvalidOffsetError(`
      unable to parse unknown offset value '${offset}' with type '${typeof offset}'
    `);
}

// copy a buffer into new buffer with optional expanded space at the end and offseted bytes in the beginning
export function cloneBuffer(buffer : ArrayBuffer,expand : number = 0,offset : number = 0){
  if(expand === 0 && offset === 0)
    return buffer.slice(0); // cloning the easy way

  const clonedBuffer = new ArrayBuffer(buffer.byteLength + expand);

  // cloning the big portion
  const bigPortionLength = Math.floor(clonedBuffer.byteLength / BigInt64Array.BYTES_PER_ELEMENT);
  const bigPortionArray = new BigInt64Array(buffer,0,bigPortionLength);
  const dataView = new DataView(clonedBuffer,offset);

  for (let i = 0; i < bigPortionArray.length; i++)
    dataView.setBigInt64(i*BigInt64Array.BYTES_PER_ELEMENT,bigPortionArray[i]);

  // copying over the remaining bytes in the small portion
  const smallPortionArray = new Uint8Array(buffer, bigPortionLength * BigInt64Array.BYTES_PER_ELEMENT)
  const uint8 = new Uint8Array(clonedBuffer,offset + bigPortionLength * BigInt64Array.BYTES_PER_ELEMENT);

  for (let i = 0; i < smallPortionArray.length; i++)
    uint8[i] = smallPortionArray[i];

  return clonedBuffer;
}

// shift a Uint8Array object by bits
export function shiftUint8ByBits(uint8 : Uint8Array, shift : number){
  if(shift > 8 || shift < -8)
    throw new InvalidArgumentError(`
      shifting a uint8Array by more than 8 bits is not possible. shift: ${shift}, array: ${uint8}
    `);
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

// wrap a ArrayBuffer object and turn it into a SkelfBuffer by adding the bitLength property.
export function convertToSkelfBuffer(buffer : ArrayBuffer,bitLength : number){
  (buffer as any).bitLength = bitLength;
  return buffer as ISkelfBuffer;
};
