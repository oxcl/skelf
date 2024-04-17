import {SkelfSpace} from "skelf/space"
import * as fs from  "node:fs/promises"

export class NodeFileSpace extends SkelfSpace {
  override readonly name : string;
  private file! : fs.FileHandle;
  constructor(private readonly fileName : string){
    super();
    this.name = fileName;
  };
  override async _init(){
    this.file = await fs.open(this.fileName,"r+");
  }
  override async _close(){
    await this.file.close();
  }
  async _read(size : number,position : number){
    const buffer = new Uint8Array(size);
    await this.file.read({
      buffer,
      position
    })
    return buffer.buffer;
  }
  async _write(buffer : ArrayBuffer, offset : number){
    await this.file.write(new Uint8Array(buffer),0,buffer.byteLength,offset);
  }
  // create an initialize a new node file space so that it's ready to use
  static async create(fileName : string){
    const newSpace = new NodeFileSpace(fileName);
    await newSpace.init();
    return newSpace;
  }
}

export default NodeFileSpace;
