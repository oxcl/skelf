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
beforeEach(async ()=>{
  space = await new ArraySpace(new Array(50)).init();
})

describe("uint(1)",()=>{
  const cases = [0,1];
  test.each(cases)("uint(1) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(1),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(1) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(1),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(2)",()=>{
  const cases = [0,1,2,3];
  test.each(cases)("uint(2) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(2),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(2) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(2),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(4)",()=>{
  const cases = [0,1,10,15];
  test.each(cases)("uint(4) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(4),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(4) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(4),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(8)",()=>{
  const cases = [0,1,10,55,127,128,255];
  test.each(cases)("uint(8) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(8),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(8) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(8),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(13)",()=>{
  const cases = [0,1,10,15,1024,2000,5892,8191];
  test.each(cases)("uint(13) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(13),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(13) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(13),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(16)",()=>{
  const cases = [0,1,10,15,1024,2000,5892,8191,40000,65535];
  test.each(cases)("uint(16) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(16),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(16) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(16),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(20)",()=>{
  const cases = [0,1,10,15,255,256,1024,2000,5892,8191,40000,65535,1000000,1048575];
  test.each(cases)("uint(20) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(20),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(20) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(20),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(24)",()=>{
  const cases = [0,1,10,15,255,256,1024,2000,5892,8191,40000,65535,1000000,1048575,16777215];
  test.each(cases)("uint(24) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(24),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(24) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(24),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(29)",()=>{
  const cases = [0,1,10,15,255,256,1024,2000,5892,8191,40000,65535,1000000,1048575,536870911];
  test.each(cases)("uint(29) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(29),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(29) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(29),space,sample)).resolves.not.toThrow();
  })
})
describe("uint(32)",()=>{
  const cases = [0,1,10,15,255,256,1024,2000,5892,8191,40000,65535,1000000,1048575,536870911,4280000000,4294967295];
  test.each(cases)("uint(32) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uint(32),space,sample)).resolves.not.toThrow();
  })
  test.each(cases)("uintBE(32) for value of %p is symmetric",async (sample)=>{
    await expect(testDataTypeSymmetry(uintBE(32),space,sample)).resolves.not.toThrow();
  })
})
