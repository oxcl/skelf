import {ISpace,Offset} from "skelf"
import units from "skelf/units"
import {InvalidOffsetError} from "skelf/errors"
import * as fs from "node:fs/promises"

function parseOffsetString(offsetString : string){
  const amount = Number.parseInt(offsetString);
  if(Number.isNaN(amount))
    throw new InvalidOffsetError(`failed to parse the amount portion of the offset string '${offsetString}'.`);

  const unitString = offsetString.slice(offsetString.search(/[A-Za-z]/));
  switch(unitString){
  case "b": case "bit": case "bits":
    return amount;
  case "B": case "Byte": case "Bytes":
    return amount * units.byte;
  case "Kb": case "kb": case "Killobit": case "killobit": case "KilloBit": case "killoBit": case "Killobits":
  case "killobits": case "KilloBits": case "killoBits":
    return amount * units.killobit;
  case "KB": case "kB": case "Killobyte": case "killobyte": case "KilloByte": case "killoByte":
  case "Killobytes": case "killobytes": case "KilloBytes": case "killoBytes":
    return amount * units.killobyte;
  default:
    throw new InvalidOffsetError(`unable to parse unknown unit '${unitString}' in offset string
                                 '${offsetString}' with amount being: ${amount}.`);
  }
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


async function openFile(fileName : string) : Promise<ISpace> {
  const file = await fs.open(fileName);
  return {
    locked : false,
    async close(){
      await file.close();
    },
    async read(offset : Offset,size : Offset){
      const offsetInBits = offsetToBits(offset);
      const offsetInBytes = Math.floor(offsetInBits / 8);
      const bitShift = offsetInBits % 8;
      const sizeInBits = offsetToBits(size);
      const sizeInBytes = Math.ceil((bitShift + sizeInBits) / 8)
      const buffer = new Uint8Array(sizeInBytes);
      await file.read({
        buffer : buffer,
        position: offsetInBytes
      })
      if(bitShift === 0){
        return buffer.buffer;
      }
      let leftOverOfPrevByte = 0, leftoverOfThisByte = 0;
      for(let i = buffer.length-1; i >= 0; --i) {
        // get the bits that will be cut from the left of the this byte to add them to the next byte later
        leftoverOfThisByte = buffer[i] >> (8-bitShift);
        // shift the byte by bit shift to the left
        buffer[i] = buffer[i] << bitShift;
        // add the left overs from the previous byte that was shifted to this byte
        buffer[i] = buffer[i] | leftOverOfPrevByte;

        leftOverOfPrevByte = leftOverOfThisByte;
      }
      return buffer.buffer;
    }
  }
}
