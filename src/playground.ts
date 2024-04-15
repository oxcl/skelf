import {Offset,Space} from "skelf"
import {NodeFileSpace} from "skelf/space/node"
import units from "skelf/units"
import {InvalidOffsetError,LockedSpaceError} from "skelf/errors"
import * as fs from "node:fs/promises"


const fileSpace = new NodeFileSpace("test.txt")
await fileSpace.init();

console.log(await fileSpace.read("12b"));

await fileSpace.close();
