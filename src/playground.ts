import {ISpace,IReadableSpace,Offset,SkelfBuffer} from "skelf"
import units from "skelf/units"
import {InvalidOffsetError,LockedSpaceError} from "skelf/errors"
import * as fs from "node:fs/promises"

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
    throw new InvalidOffsetError(`unable to parse unknown unit '${unitString}' in offset string
                                 '${offsetString}' with amount being: ${amount}.`);
  }
}

async function openFile(fileName : string) : Promise<ISpace> {
  const file = await fs.open(fileName,"r+");
  return new class {
    name = fileName;
    #locked = false;
    get locked(){ return this.#locked}

    async read(size : Offset,offset : Offset = 0){
    }
    async write(chunk : ArrayBuffer, offset : Offset = 0){
      if(this.locked)
        throw new LockedSpaceError(`
          trying to write to space '${this.name}' while it's locked. this could be caused by a not awaited call
          to this method, which might be still pending.
        `)
      this.#locked = true;
      const totalBitsToOffset = offsetToBits(offset); // convert offset to bits;
      const wholeBytesToOffset = Math.floor(totalBitsToOffset); // calculate offset in whole byte
      const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover offset bits

      // since you can't write from the middle of a byte, if the offset has bit leftovers then we have to first
      // read the byte in the middle to add the bits that we want to it while keeping the previous bits.
      if(leftoverBitsToOffset !== 0){
        this.#locked = false;
        const middleByte = (await this.read(1,wholeBytesToOffset))[0];

        this.#locked = true;
      }
    }
  }
}

const space = await openFile("./test.txt")

await space.close()
