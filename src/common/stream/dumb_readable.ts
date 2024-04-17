import {ReadableStream} from "skelf"

// this is a simple ReadableStream implementation which turns an array into a readable stream
export class DumbReadableStream extends ReadableStream {
  static count : number = 0;
  readonly name : string;
  constructor(private array : number[]){
    super();
    this.name = `rdumb:${DumbReadableStream.count++}`;
  }
  async _read(size : number){
    if(this.array.length < size) return null;
    return new Uint8Array(this.array.splice(0,size)).buffer;
  }
}
