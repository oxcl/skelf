import {Offset,Space,BaseReadableStream} from "skelf"
//import {NodeFileSpace} from "skelf/space/node"
//import * as fs from "node:fs/promises"

const stream = await new DumbReadableStream([0xaa,0x08,255]).init();

console.log(await stream.skip("2b"));
console.log(await stream.read("20b"));
