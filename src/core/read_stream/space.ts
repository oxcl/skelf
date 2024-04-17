import {ISkelfSpace,ISkelfReadStream,Offset} from "skelf/types"
import {SkelfReadStream} from "skelf/read_stream"
import {offsetToBits} from "skelf/utils"

export class SpaceReadStream extends SkelfReadStream {
  readonly name : string;
  private bitOffset : number;
  constructor(private space : ISkelfSpace,offset : Offset = 0){
    super();
    this.name = `rspaceStream:${space.name}`;
    this.bitOffset = offsetToBits(offset);
  }
  async _read(size : number){
    const result = await this.space.read(size,this.bitOffset);
    this.bitOffset += size*8;
    return result;
  }

  override async _skip(size : number){
    this.bitOffset += size*8;
    return true;
  }
}

export default SpaceReadStream
