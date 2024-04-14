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
