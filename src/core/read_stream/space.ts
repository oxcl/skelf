import {ISkelfSpace,ISkelfReadStream,Offset} from "skelf/types"
import {SkelfReadStream} from "skelf/read_stream"

export class SpaceReadStream extends SkelfReadStream {
  readonly name : string;
  constructor(
    private space : ISkelfSpace,
    private byteOffset : number = 0,
    name : string | undefined = undefined
  ){
    super();
    this.name = `rspaceStream:${name ?? space.name}`;
  }
  async _read(size : number){
    const result = await this.space.read(size,this.byteOffset);
    this.byteOffset += size;
    return result;
  }

  override async _skip(size : number){
    this.byteOffset += size;
    return true;
  }
}

export default SpaceReadStream
