import {NodeFileSpace} from "skelf/node"
import {createStruct,primitives} from "skelf"
import Logger from "skelf/log"

Logger.configure({
//  enable : false,
  colors: true,
  level: "verbose"
})

const space = await new NodeFileSpace("test.txt").init();



await space.close();
