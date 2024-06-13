import {
  byteBool,
  bitBool
} from "skelf/core"

import { ArraySpace } from "skelf/core"
import { testDataTypeSymmetry } from "skelf/tools"

describe("bool",()=>{
  let space : ArraySpace;
  beforeEach(async ()=>{
    space = new ArraySpace(50);
    await space.init();
  })
  const cases = [true,false];
  test.each(cases)("bitBool %p",async (bool)=>{
    await expect(testDataTypeSymmetry(bitBool,space,bool)).resolves.not.toThrow();
  })
  test.each(cases)("byteBool %p",async (bool)=>{
    await expect(testDataTypeSymmetry(byteBool,space,bool)).resolves.not.toThrow();
  })
})
