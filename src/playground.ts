import {Offset,Space} from "skelf"
import {NodeFileSpace} from "skelf/space/node"
import units from "skelf/units"
import {InvalidOffsetError,LockedSpaceError} from "skelf/errors"
import * as fs from "node:fs/promises"
import {BaseReadableStream} from "skelf"

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

const stream = await new DumbReadableStream([255,0,255]).init();

console.log(await stream.read("5b"));
console.log(await stream.read("11b"));
