import {ISkelfSpace,Offset} from "skelf/types"
import {SkelfWriteStream} from "skelf/write_stream"
import {offsetToBits} from "skelf/utils"

export class SpaceWriteStream extends SkelfWriteStream {
  readonly name : string;
  private bitOffset : number;
  constructor(private space : ISkelfSpace,offset : Offset){
    super();
    this.bitOffset = offsetToBits(offset);
    this.name = `wspaceStream:${space.name}`;
  }
  async _write(buffer : ArrayBuffer){
    await this.space.write(buffer,this.bitOffset);
    this.bitOffset += buffer.byteLength*8;
  }
}
export default SpaceWriteStream
