import {SkelfSpace} from "skelf/space"

export class FileSpace extends SkelfSpace {
  private file! : FileHandle;
  constructor(
    file : FileHandle | Promise<FileHandle>,
    override readonly name : string
  ){
    super();
  };
  override async _init(){
    this.file = await this.file;
  }
  async _read(size : number,position : number){
    const buffer = new Uint8Array(size);
    await this.file.read(buffer,0,size,position)
    return buffer.buffer;
  }
  async _write(buffer : ArrayBuffer, offset : number){
    await this.file.write(new Uint8Array(buffer),0,buffer.byteLength,offset);
  }
  override async _close(){
    await this.file.close();
  }
  // create an initialize a new node file space so that it's ready to use
  static async create(file : FileHandle,name : string){
    const newSpace = new FileSpace(file,name);
    await newSpace.init();
    return newSpace;
  }
}

export default FileSpace;
