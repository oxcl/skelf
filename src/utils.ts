import {ISkelfBuffer,Offset} from "skelf/types"
import {InvalidOffsetError} from "skelf/errors"
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
  else if(typeof offset === "object" && "amount" in offset && unit in offset){
    return `${offset.amount}${offsetUnitToString(offset.unit)}`
  }
  else if(typeof offset === "string")
    return offset;
  else
    throw new InvalidOffsetError(`
      unable to parse unknown offset value '${offset}' with type '${typeof offset}'
    `);
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
