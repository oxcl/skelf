import {ISkelf,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"
import {BaseSpace} from "skelf/space"
import * as fs from  "node:fs/promises"

const skelf : ISkelf<number> = {
  async read(input : ISpace,offset : Offset = 0){
    const buffer = await input.read(1,offset);
    return new Uint8Array(buffer.buffer)[0];
  },
  async write(value : number,output : ISpace,offset : Offset = 0){
    await output.write(new Uint8Array([value]).buffer,offset);
  }
}

class NodeFileSpace extends BaseSpace {
  override readonly name : string;
  file! : fs.FileHandle;
  constructor(private readonly fileName : string){
    super();
    this.name = fileName;
  };
  async _init(){
    this.file = await fs.open(this.fileName,"r+");
  }
  async _close(){
    await this.file.close();
  }
}



export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
