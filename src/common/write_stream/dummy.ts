import {SkelfWriteStream} from "skelf"

// this is a simple and dumb implementation of SkelfWriteStream which turns an array into a writable stream
// this is used for testing and educational purposes only. if you actually want to use an array as a
// write stream you may want to use ArrayWriteStream
export class DummyWriteStream extends SkelfWriteStream {
  static count : number = 0;
  readonly name : string;
  readonly array : number[] = [];
  constructor(){
    super();
    this.name = `wdumb:${DummyWriteStream.count++}`;
  }
  async _write(buffer : ArrayBuffer){
    for(const number of [...new Uint8Array(buffer)]){
      this.array.push(number);
    }
  }
}
