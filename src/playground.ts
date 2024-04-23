import {int,int8,uint,ArraySpace,float32,float64,cstring,dynamicString} from "skelf";
import {NodeFileSpace} from "skelf/node"


const space = await new NodeFileSpace("test.txt").init();

const dString = dynamicString(int8);

await dString.write("my name is ali",space);
console.log(await dString.read(space))

await space.close();
