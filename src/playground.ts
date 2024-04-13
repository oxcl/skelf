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
      await file.write(uint8,0,uint8.length,offset);
    }
  })
}

const space = await openFile("./test.txt");
const uint8 = new Uint8Array(2);
await space.write(new SkelfBuffer(uint8.buffer,"2B"),"4b");
await space.close();
