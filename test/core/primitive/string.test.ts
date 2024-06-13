import {
  delimitedString,
  cstring,
  dynamicString,
  fixedString,
  constString
} from "skelf/core"

import { ArraySpace,uint } from "skelf/core"
import { testDataTypeSymmetry } from "skelf/tools"

const cases = [
  "this is a test for cstring",
  "test",
  "          ",
  "\x01\x02\x03",
  "متن غیر انگلیسی",
  "emoji 🔥"
];

const longString = "abcdefghijklmnopqrstuvwxyz1234567890الفبپتثججحخدذرزسشصضطظعغفقکگلمنهی,.!{[@<>[]#@%<@>[][#{}@<%>❤️🙌🤦‍♂️😎😶‍🌫️🤐🐯🐗"
let space : ArraySpace;
beforeEach(async ()=>{
  space = new ArraySpace(50);
   await space.init();
})
describe("cstring",()=>{
  const space = new ArraySpace(50);
  beforeAll(async ()=>{
     await space.init();
  })
  describe("cstring is symmetric",()=>{
    test.each(cases)("cstring %p is symmetric",async (string)=>{
      await expect(testDataTypeSymmetry(cstring,space,string)).resolves.not.toThrow();
    })
  })
  test("cstring is delimitted by null",async ()=>{
    const string = "this is a sample string";
    await cstring.write(string,space);
    expect(space.array.at(string.length)).toBe(0);
  })
  test("cstring can handle large texts",async ()=>{
    await expect(testDataTypeSymmetry(cstring,space,longString.repeat(50))).resolves.not.toThrow();
  })
})

describe("delimitedString",()=>{
  const delimiterCases = ["\x04","cstrings","👀","فارسی"]
  describe("delimitedString is symmetric",()=>{
    describe.each(delimiterCases)("delimitedString is symmetric with %p as delimiter",(delimiter)=>{
      test.each(cases)(`is symmetric for %p`,async (string)=>{
        await expect(testDataTypeSymmetry(delimitedString(delimiter),space,string)).resolves.not.toThrow();
      })
    })
  })
  describe("delimitedString can handle large files",()=>{
    test.each(delimiterCases)("can handle large texts with %p as delimiter",async (delimiter)=>{
      await expect(testDataTypeSymmetry(delimitedString(delimiter),space,longString.repeat(50))).resolves.not.toThrow();
    })
  })
  test("writes the delimiter correctly",async ()=>{
    const string = "this is a sample string for delimitedStrings";
    const delimiter = "sample delimiter";
    await delimitedString(delimiter).write(string,space);
    expect(space.array.slice(string.length,string.length+delimiter.length))
      .toEqual([...new TextEncoder().encode(delimiter)])
  })
})

describe("dynamicString", () => {
  const sizeDataTypes = [uint(8), uint(16), uint(20), uint(24), uint(32)]
  describe("dynamicString is symmetric", () => {
    describe.each(sizeDataTypes)("dynamicString is symmetric with %s", (sizeDataType) => {
      test.each(cases)(`is symmetric for %p`, async (string) => {
        await expect(testDataTypeSymmetry(dynamicString(sizeDataType), space, string)).resolves.not.toThrow();
      })
    })
  })
  test("can handle large texts with %s",async ()=>{
    await expect(testDataTypeSymmetry(dynamicString(uint(16)),space,longString.repeat(300))).resolves.not.toThrow()
  })
})
