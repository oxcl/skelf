import {ISkelf,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"

const skelf : ISkelf<number> = {
  async read(input : ISpace,offset : Offset = 0){
    const buffer = await input.read(1,offset);
    return new Uint8Array(buffer.buffer)[0];
  },
  async write(value : number,output : ISpace,offset : Offset = 0){
    await output.write(new Uint8Array([value]).buffer,offset);
  }
}




export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
