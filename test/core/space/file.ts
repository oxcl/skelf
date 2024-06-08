import {
  FileSpace
} from "skelf/core"
import * as fs from "node:fs/promises"
import tmp from "tmp"

function createRandomUint8(size : number){
  return new Uint8Array(
    new Array(size).fill(null).map(()=>Math.floor(Math.random() * 255))
  )
}
const cases = [
  [1,createRandomUint8(1)],
  [250,createRandomUint8(250)],
  [1024*1.5,createRandomUint8(1024 * 1.5)],
  [1024*2,createRandomUint8(1024 * 2)]
] as const;

const files : [string,any][] = [];

describe("FileSpace",()=>{
  test.each(cases)("writes %d bytes to file correctly",async (size,uint8)=>{
    return new Promise<void>((resolve,reject)=>{
      tmp.file(async (err,path,fd,cleanup)=>{
        if(err) reject(err);
        files.push([path,cleanup])
        const file = await fs.open(path,"r+");
        const space = await new FileSpace(file).init();
        await space.write(uint8)
        await space.close()

        const buffer = new Uint8Array(size);
        await file.read(buffer,0,size,0);
        expect(uint8.every((val,index)=>val === buffer[index])).toBe(true)
        await file.close()
        resolve()
      })
    })
  })
  test.each(cases)("reads %d bytes from file correctly",async (size,uint8)=>{
    const [path,cleanup] = files.shift()!;
    const file = await fs.open(path,"r");
    const space = await new FileSpace(file).init();
    const result = await space.read(size)
    expect(new Uint8Array(result).every((val,index)=> val === uint8[index])).toBe(true)
  })
})
