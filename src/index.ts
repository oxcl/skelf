import {ISpace,IStruct,StructInput,StructOutput,Offset} from "skelf/types"
import {NodeFileSpace} from "skelf/space/node"

const byte : IStruct<number> = {
  async read(input : ISpace, offset : Offset = 0){
    return new Int8Array(await input.read("1B"))[0]
  },
  async write(value : number,output : ISpace, offset : Offset = 0){

  }
}



export * from "skelf/stream"
export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
