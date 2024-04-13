import {Offset,SkelfBuffer,Space} from "skelf"
import units from "skelf/units"
import {InvalidOffsetError,LockedSpaceError} from "skelf/errors"
import * as fs from "node:fs/promises"

async function openFile(fileName : string) {
  const file = await fs.open(fileName,"r+");
  return new Space({
    name : `file:${fileName}`,
    async close(){
      return await file.close();
    },
    async read(size : number,offset : number){
      const uint8 = new Uint8Array(size);
      await file.read({
        buffer : uint8,
        position: offset
      })
      return uint8.buffer;
    },
    async write(buffer : ArrayBuffer, offset : number){
      const uint8 = new Uint8Array(buffer);
      await file.write(uint8,0,offset);
    }
  })
}
//    async write(chunk : ArrayBuffer, offset : Offset = 0){
//      if(this.locked)
//        throw new LockedSpaceError(`
//          trying to write to space '${this.name}' while it's locked. this could be caused by a not awaited call
//          to this method, which might be still pending.
//        `)
//      this.#locked = true;
//      const totalBitsToOffset = offsetToBits(offset); // convert offset to bits;
//      const wholeBytesToOffset = Math.floor(totalBitsToOffset); // calculate offset in whole byte
//      const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover offset bits
//
//      // since you can't write from the middle of a byte, if the offset has bit leftovers then we have to first
//      // read the byte in the middle to add the bits that we want to it while keeping the previous bits.
//      if(leftoverBitsToOffset !== 0){
//        this.#locked = false;
//        const middleByte = (await this.read(1,wholeBytesToOffset))[0];
//
//        this.#locked = true;
//      }
//    }
//  }
//}
const space = await openFile("./test.txt");
console.log(await space.read("12b","4b"))
await space.close();
