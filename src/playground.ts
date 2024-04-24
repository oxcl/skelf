import {NodeFileSpace} from "skelf/node"
import {hexColorString} from "skelf/common"

const space = await new NodeFileSpace("test.txt").init();

console.log(await hexColorString.read(space))
await space.close();
