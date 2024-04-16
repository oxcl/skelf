import {Offset,Space,BaseReadableStream} from "skelf"
//import {NodeFileSpace} from "skelf/space/node"
//import * as fs from "node:fs/promises"

class DumbReadableStream extends BaseReadableStream {
  static dumbCount : number = 0;
  override readonly name : string;
  constructor(private array : number[]){
    super();
    this.name = `dumb${DumbReadableStream.dumbCount}`;
    DumbReadableStream.dumbCount++;
  }
  async _read(size : number){
    return new Uint8Array(this.array.splice(0,size)).buffer;
  }
}

const stream = await new DumbReadableStream([0xaa,0x08,255]).init();

console.log(await stream.skip("2b"));
console.log(await stream.read("20b"));
