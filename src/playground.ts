import {ArraySpace, ArrayReadStream} from "skelf"
import {NodeFileSpace} from "skelf/node"

const stream = await new ArrayReadStream([0xff,0xaa]).init();

const buffer = await stream.read("9b");

console.log(buffer);
