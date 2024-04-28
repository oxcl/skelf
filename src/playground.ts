import {NodeFileSpace} from "skelf/node"
import {createStruct,primitives,ConstraintError} from "skelf"

import Logger from "skelf/log"

Logger.configure({
  enable : false,
  colors: true,
  level: "verbose"
})

const space = await new NodeFileSpace("test.txt").init();


const testStruct = createStruct("test",{
  reserve: primitives.fixedReserve(200),
  age: primitives.int8,
  other : (obj,offset) => {
    console.log({obj,offset})
    return primitives.uint16;
  }
})

const testObj = { age : 9, reserve : undefined, other : 19}

console.log("WRITING....")
await testStruct.write(testObj,space)

console.log("READING....")
const result = await testStruct.read(space)

console.log("RESULT:")
console.log(result)


await space.close();
