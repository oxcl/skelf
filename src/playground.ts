import {ISpace,IReadableSpace,Offset} from "skelf"
import units from "skelf/units"
import {InvalidOffsetError,LockedSpaceError} from "skelf/errors"
import * as fs from "node:fs/promises"

function parseOffsetString(offsetString : string){
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


async function openFile(fileName : string) : Promise<IReadableSpace> {
  const file = await fs.open(fileName,"r+");
  return new class {
    name = fileName;
    #locked = false;
    get locked(){ return this.#locked}

    async close(){
      await file.close();
    }
    async read(offset : Offset,size : Offset){
      if(this.locked)
        throw new LockedSpaceError(`
          trying to read from space '${this.name}' while it's locked. this could be caused by previous a not
          awaited call to this method, which might be still pending.
        `)
      this.#locked = true;
      const offsetInBits = offsetToBits(offset);
      const offsetInBytes = Math.floor(offsetInBits / 8);
      const bitShift = offsetInBits % 8;
      const sizeInBits = offsetToBits(size);
      const sizeInBytes = Math.ceil((bitShift + sizeInBits) / 8)
      const bitTrim = sizeInBytes*8 - sizeInBits;
      const buffer = new Uint8Array(sizeInBytes);
      await file.read({
        buffer : buffer,
        position: offsetInBytes
      })
      if(bitShift !== 0){
        let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
        for(let i = buffer.length-1; i >= 0; --i) {
          // get the bits that will be cut from the left of the this byte to add them to the next byte later
          leftoverOfThisByte = buffer[i] >> (8-bitShift);
          // shift the byte by bit shift to the left
          buffer[i] = buffer[i] << bitShift;
          // add the left overs from the previous byte that was shifted to this byte
          buffer[i] = buffer[i] | leftoverOfPrevByte;
          leftoverOfPrevByte = leftoverOfThisByte;
        }
      }
      this.#locked = false;
      console.log({bitTrim})
      if(bitTrim >= 8){
        return buffer.slice(0,-1).buffer;
      }
      if(bitTrim !== 0){
        buffer[buffer.length-1] &= 0xFF << bitTrim;
      }
      return buffer.buffer;
    }
  }
}

const space = await openFile("./test.txt")
console.log(await space.read(2,"2b"));
await space.close()
