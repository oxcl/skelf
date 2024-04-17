import {SkelfReadStream} from "skelf/read_stream"

type IteratorLike = Iterator<number> | AsyncIterator<number> | { [Symbol.iterator] : IterableIterator<number> }

export class IteratorReadStream extends SkelfReadStream {
  readonly name : string;
  constructor(iterLike : IteratorLike, offset : Offset = 0)
  async _read(size : number){

  }
  async _skip(size : number){

  }
}
