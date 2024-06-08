import {SkelfWriteStream} from "skelf/write_stream"

export class DummyWriteStream extends SkelfWriteStream {
  name = "dummyWriteStream"
  initWasCalled = false;
  initWasCalledTwice = false;
  closeWasCalled = false;
  closeWasCalledTwice = false;
  latestWriteRequestBuffer !:  ArrayBuffer;
  override async _init(){
    if(this.initWasCalled) this.initWasCalledTwice = true;
    this.initWasCalled = true;
  }
  override async _close(){
    if(this.closeWasCalled) this.closeWasCalledTwice = true;
    this.closeWasCalled = true;
  }
  async _write(buffer : ArrayBuffer){
    this.latestWriteRequestBuffer = buffer;
  }
}

export default DummyWriteStream
