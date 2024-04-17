import {WritableStream} from "skelf"

// this is a simple WritableStream implementation which turns an array into a writable stream
export class DumbWritableStream extends WritableStream {
  static count : number = 0;
  readonly name : string;
  readonly array : number[] = [];
  constructor(){
    super();
    this.name = `wdumb:${DumbWritableStream.count++}`;
  }
  async _write(buffer : ArrayBuffer){
    for(const number of [...new Uint8Array(buffer)]){
      this.array.push(number);
    }
  }
}
