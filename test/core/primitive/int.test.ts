import {
  int,
  uint,
  intBE,
  uintBE,
} from "skelf/core"
import {ArraySpace} from "skelf/core"
import {testDataTypeSymmetry} from "skelf/tools"
import {AsymmetricDataTypeError} from "skelf/errors"

let space : ArraySpace;
beforeAll(async ()=>{
  space = await new ArraySpace(new Array(50)).init();
})
describe("uint(4)",()=>{
  const cases = [0,1,10,15];
  test.each(cases)("data type for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(4),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(8)",()=>{
  const cases = [0,1,10,55,127,128,255];
  test.each(cases)("data type for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(8),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(13)",()=>{
  const cases = [0,1,10,15,1024,2000,5892,8191];
  test.each(cases)("data type for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(13),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(16)",()=>{
  const cases = [0,1,10,15,1024,2000,5892,8191,40000,65535];
  test.each(cases)("data type for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(16),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(20)",()=>{
  const cases = [0,1,10,15,255,256,1024,2000,5892,8191,40000,65535,1000000,1048575];
  test.each(cases)("data type for value of %p is symmetric",async (sample)=>{
    await expect((async () => {
      await testDataTypeSymmetry(uint(20),space,sample)
      console.log(space.array);
    })()).resolves.not.toThrow();
  })
})
describe("uint(24)",()=>{
  const cases = [0,1,10,15,255,256,1024,2000,5892,8191,40000,65535,1000000,1048575];
  test.each(cases)("data type for value of %p is symmetric",async (sample)=>{
    await expect((async () => {
      await testDataTypeSymmetry(uint(20),space,sample)
      console.log(space.array);
    })()).resolves.not.toThrow();
  })
})
