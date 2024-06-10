import {
  float32,
  float64
} from "skelf/core"

import {ArraySpace} from "skelf/core"
import { testDataTypeSymmetry } from "skelf/tools"



describe("float32",()=>{
  let space : ArraySpace;
  beforeAll(async ()=>{
    space = await new ArraySpace().init();
  })
  const cases = [
    0,
    1,
    0.0,
    -0,
    1.1,
    0.1,
    10.0001,
    10.0000051,
    10.8987213,10235.2 * 120879.0,18987231,
    3.141592,2.00000000000001
  ];
  test.each(cases)("float32 works correctly for value %p",async (sample)=>{
    await expect(testDataTypeSymmetry(float32,space,sample,(one,two)=>one.toFixed(0)===two.toFixed(0))).resolves.not.toThrow();
  })
})
