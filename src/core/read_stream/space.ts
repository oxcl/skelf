import {ISkelfSpace,ISkelfReadStream,Offset} from "skelf/types"
import {SkelfReadStream} from "skelf/read_stream"
import {offsetToBits} from "skelf/utils"

export class SpaceReadStream extends SkelfReadStream {
  readonly name : string;
  private bitOffset : number;
  constructor(private space : ISkelfSpace,offset : Offset = 0){
    super();
    this.name = `spaceStream:${space.name}`;
    this.bitOffset = offsetToBits(offset);
  }
  _read(size : number){
    const result = this.space.read(`${sizeInBits}b`,this.bitOffset);
    this.bitOffset += size*8;
    return result;
  }

  _skip(size : number){
    this.bitOffset += number*8;
  }
}

export default SpaceReadStream
