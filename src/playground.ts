import {int,uint,ArraySpace} from "skelf";


const space = await new ArraySpace([0xaa,0xff]).init();

console.log(await int(9).read(space,"6b"))
