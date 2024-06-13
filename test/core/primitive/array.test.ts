import {
  fixedArray,
  dynamicArray
} from "skelf/core"

import { ArraySpace,uint,bitBool,byteBool,cstring,float64,int } from "skelf/core"
import { testDataTypeSymmetry,GenerateRandom } from "skelf/tools"
import { ISkelfDataType } from "skelf/types";

let space : ArraySpace;
beforeEach(async ()=>{
  space = await new ArraySpace(1030).init();
})


describe("fixedArray",()=>{
  describe("fixedArray is symmetric",()=>{
    const itemTypes = [
      ["number",uint(8)],
      ["number",int(16)],
      ["bool",byteBool],
      ["bool",bitBool],
      ["string",cstring],
      ["float",float64]
    ] as const;
    describe.each(itemTypes)("fixedArray is symmetric with %p (%s) items",(itemTypeString,itemType)=>{
      const sizes = [10,15,30,40,200] as const;
      test.each(sizes)("is symmetric for %d items",async (size)=>{
        const sample = GenerateRandom.arrayOf(itemTypeString,size);
        await expect(testDataTypeSymmetry(fixedArray(size,itemType as any),space,sample as any)).resolves.not.toThrow()
      })
    })
  })
  describe("nested fixedArrays work correctly",()=>{
    const nestLevels = [
      //[0,[18]],
      //[1,[2,3]],
      //[2,[4,4,3]],
      //[3,[10,1,2,2]],
      [4,[15,2,20,13,11]]
    ] as [number,number[]][];
    test.only.each(nestLevels)("with %d nested arrays",async (level,sizes)=>{
      const sample = nest(level,[...sizes])
      const dataType = nestDataType(level,[...sizes]);
      await expect(testDataTypeSymmetry(dataType,space,sample)).resolves.not.toThrow()
      console.log("done son")
    })
  })
})

function nest(level : number,sizes : number[]) : any {
  if(level === 0) return new Array(sizes.shift()!).fill(null).map(()=>Math.floor(Math.random()*256))
  return new Array(sizes.shift()!).fill(null).map(()=>nest(level-1,[...sizes]));
}
function nestDataType(level : number,sizes : number[]) : any {
  if(level === -1) return uint(8)
  return fixedArray(sizes.shift()!,nestDataType(level-1,[...sizes]));
}
