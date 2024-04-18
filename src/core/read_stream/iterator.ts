import {SkelfReadStream} from "skelf/read_stream"

type IteratorLike = Iterator<number> | AsyncIterator<number> | { [Symbol.iterator] : () => IterableIterator<number> }

export class IteratorReadStream extends SkelfReadStream {
  readonly name : string;
  private iter : AsyncIterator<number> | Iterator<number>;
  static count : number = 0;
  constructor(iterLike : IteratorLike, offset : number = 0, name : string | undefined = undefined){
    super();
    this.name = `iterStream:${name ?? IteratorReadStream.count++}`;
    if(Symbol.iterator in iterLike){
      this.iter = iterLike[Symbol.iterator]();
    }
    else {
      this.iter = iterLike;
    }
  };
  async _read(size : number){
    const uint8 = new Uint8Array(size);
    for(let i=0; i<size;i++){
      const {value,done} = await this.iter.next();
      if(done) return null;
      uint8[i] = value;
    }
    return uint8.buffer;
  }
  override async _skip(size : number){
    for(let i=0;i<size;i++){
      const {done} = await this.iter.next();
      if(done) return false;
    }
    return true;
  }
}
