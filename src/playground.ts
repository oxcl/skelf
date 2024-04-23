import {int,uint,ArraySpace,float32,float64,cstring} from "skelf";
import {NodeFileSpace} from "skelf/node"


const space = await new NodeFileSpace("test.txt").init();

await cstring.write("hello",space);

console.log(await cstring.read(space,1))
