import {SkelfReadStream} from "skelf/read_stream"

// use a javascript array as a read stream.
export class ArrayReadStream extends SkelfReadStream {
  readonly name : string;
  static count : number = 0;
  private offset : number = 0;
  constructor(
    private array : ReadonlyArray<number>,
    name : string | undefined = undefined
  ){
    super();
    this.name = `arrayStream:${name ?? ArrayReadStream.count++}`;
  }
  async _read(size : number){
    if(this.offset + size >= this.array.length)
      return null;
    const result = new Uint8Array(this.array.slice(this.offset,this.offset + size)).buffer;
    this.offset += size;
    return result;
  }
  override async _skip(size : number){
    if(this.offset + size > this.array.length)
      return false;
    this.offset += size;
    return true;
  }
}
