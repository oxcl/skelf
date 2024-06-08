import {SkelfSpace} from "skelf"

export class DummySpace extends SkelfSpace {
  name = "dummySpace";
  initWasCalled = false;
  initWasCalledTwice = false;
  closeWasCalled = false;
  closeWasCalledTwice = false;
  latestReadRequest!  : {size : number, offset: number};
  latestWriteRequest! : {buffer : ArrayBuffer, offset: number}
  override async _init(){
    if(this.initWasCalled) this.initWasCalledTwice = true;
    this.initWasCalled = true;
  }
  override async _close(){
    if(this.closeWasCalled) this.closeWasCalledTwice = true;
    this.closeWasCalled = true;
  }
  async _read(size : number, offset: number){
    this.latestReadRequest = {size,offset};
    return new ArrayBuffer(size);
  }
  async _write(buffer : ArrayBuffer, offset: number){
    this.latestWriteRequest = {buffer,offset};
  }
}

export default DummySpace
