import {SkelfReadStream} from "skelf"

export class DummyReadStream extends SkelfReadStream {
  name = "dummyReadStream";
  initWasCalled = false;
  initWasCalledTwice = false;
  closeWasCalled = false;
  closeWasCalledTwice = false;
  override async _init(){
    if(this.initWasCalled) this.initWasCalledTwice = true;
    this.initWasCalled = true;
  }
  override async _close(){
    if(this.closeWasCalled) this.closeWasCalledTwice = true;
    this.closeWasCalled = true;
  }
  async _read(size : number){
    return new ArrayBuffer(size);
  }
}

export default DummyReadStream
