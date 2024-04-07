import {ISpace,IReadableSpace,Offset} from "skelf"
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
      if(this.locked)
        throw new LockedSpaceError(`
          trying to read from space '${this.name}' while it's locked. this could be caused by a not awaited
          call to this method, which might be still pending.
        `)
      this.#locked = true;
      const totalBitsToOffset    = offsetToBits(offset); // convert offset to bits
      const wholeBytesToOffset   = Math.floor(totalBitsToOffset / 8); // calculate offset in whole bytes
      const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover offset bits
      const sizeInBits = offsetToBits(size); // convert size to bits
      const bytesToRead   = Math.ceil((leftoverBitsToOffset + sizeInBits) / 8) // bytes to cover all bits
      const bitShift = (bytesToRead*8 - (leftoverBitsToOffset + sizeInBits)) % 8; // how many bits to shift

      // read the part of the space that will contain all the needed bits
      const buffer = new Uint8Array(bytesToRead);
      await file.read({
        buffer : buffer,
        position: wholeBytesToOffset
      })
      // zero out the beginning of the first byte which doesn't include the desired bits
      buffer[0] &= 0xFF >> leftoverBitsToOffset

      if(bitShift !== 0){
        let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
        for(let i = 0; i < buffer.length; i++) {
          // get the bits that will be cut from the right of the this byte to add them to the next byte later
          leftoverOfThisByte = buffer[i] & (0xFF >> (8-bitShift));
          // shift the byte by bitShift to the right
          buffer[i] >>= bitShift;
          // add the left overs from the previous byte that was shifted to this byte
          buffer[i] |= leftoverOfPrevByte << (8-bitShift);
          leftoverOfPrevByte = leftoverOfThisByte;
        }
      }

      this.#locked = false;
      // if the size doesn't have leftover bits but the offset does. that means after shifting bits to correct
      // positions, there should be a redundant empty byte at the beginning of the buffer that was read.
      if(bitShift + leftoverBitsToOffset >= 8){
        return buffer.slice(1).buffer;
      }
      return buffer.buffer;
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



      if(leftoverBitsToOffset !== 0){

      }


      // if leftoverBitsToOffset is not zero then we have to first read one byte
    }
    async close(){
      await file.close();
    }
  }
}

const space = await openFile("./test.txt")

await space.close()
