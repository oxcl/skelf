import {NodeFileSpace} from "skelf/space/node"
import {IStruct,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"

const struct : IStruct<number> = {
  async read(input : ISpace,offset : Offset = 0){
    const buffer = await input.read(1,offset);
    return new Uint8Array(buffer.buffer)[0];
  },
  async write(value : number,output : ISpace,offset : Offset = 0){
    await output.write(new Uint8Array([value]).buffer,offset);
  }
}

const space = await NodeFileSpace.create("test.txt")

await space.close();


export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
