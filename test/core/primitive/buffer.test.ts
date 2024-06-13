import {
  fixedBuffer,
  dynamicBuffer,
  delimitedBuffer
} from "skelf/core"

import { ArraySpace,uint } from "skelf/core"
import { testDataTypeSymmetry, GenerateRandom} from "skelf/tools"

let space : ArraySpace;
beforeEach(async ()=>{
  space = await new ArraySpace(1030).init()
})

describe("fixedBuffer",()=>{
  describe("fixedBuffer is symmetric",()=>{
    const cases = [5,50,100,500,1024];
    test.each(cases)("fixedBuffer is symmetric for random buffer with %p bytes",async (size)=>{
      const buffer = GenerateRandom.buffer(size);
      await expect(testDataTypeSymmetry(fixedBuffer(size),space,buffer,(a,b)=>{
        const bArray = new Uint8Array(b);
        const aArray = new Uint8Array(a);
        return aArray.byteLength === bArray.byteLength &&
         aArray.every((value,index)=> value === bArray[index]);
      })).resolves.not.toThrow();
    })
  })
})
describe("dynamicBuffer",()=>{
  describe("dynamicBuffer is symmetric",()=>{
    const cases = [5,50,100,500,1024];
    const sizeDataTypes = [uint(11),uint(16),uint(20),uint(24),uint(32)];
    describe.each(sizeDataTypes)("dynamicBuffer is symmetric with %s",(sizeDataType)=>{
      test.each(cases)("dynamicBuffer is symmetric for random buffer with %p bytes",async (size)=>{
        const buffer = GenerateRandom.buffer(size);
        await expect(testDataTypeSymmetry(dynamicBuffer(sizeDataType),space,buffer,(a,b)=>{
          const bArray = new Uint8Array(b);
          const aArray = new Uint8Array(a);
          return aArray.byteLength === bArray.byteLength &&
           aArray.every((value,index)=> value === bArray[index]);
        })).resolves.not.toThrow();
      })
    })
  })
})
