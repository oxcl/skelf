import {ISkelfBuffer,Offset} from "skelf/types"
import {SkelfReadStream} from "skelf/read_stream"

type BufferLike = ISkelfBuffer | ArrayBuffer | Uint8Array | Blob | Buffer;

export class BufferReadStream extends SkelfReadStream {
  readonly name : string;
  private buffer : ArrayBuffer;
  constructor(bufferLike : BufferLike, offset : Offset){
    super();
  }
  async _read(size : number){

  }
  async _skip(size : number){

  }
}
