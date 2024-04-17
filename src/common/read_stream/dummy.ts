import {SkelfReadStream} from "skelf"

// this is a simple ReadableStream implementation which turns an array into a readable stream.
// this class is for testing and educational purposes only. if you actually want to use an array as a
// read stream you can use IteratorReadStream or ArrayReadStream class
export class DummyReadStream extends SkelfReadStream {
  static count : number = 0;
  readonly name : string;
  constructor(private array : number[]){
    super();
    this.name = `rdumb:${DummyReadStream.count++}`;
  }
  async _read(size : number){
    if(this.array.length < size) return null;
    return new Uint8Array(this.array.splice(0,size)).buffer;
  }
}
