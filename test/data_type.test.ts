import {
  createDataType,
} from "skelf/data_type"
import {ISkelfReader,ISkelfWriter,Offset} from "skelf/types"
import {OffsetBlock,offsetToBlock,convertToSkelfBuffer} from "skelf/utils"

class DummyReader implements ISkelfReader {
  readonly name = "dummyReader",
  offset = new OffsetBlock(0,0);
  callTrace : Offset[] = []
  async read(size : Offset){
    this.callTrace.push(size)
    const block = offsetToBlock(size);
    this.offset = this.offset.add(block)
    return convertToSkelfBuffer(new ArrayBuffer(block.bytes),block)
  }
  async skip(size : Offset){
    return;
  }
}


class DummyWriter implements ISkelfWriter {
  readonly name = "dummyWriter",
  offset = new OffsetBlock(0,0);
  callTrace : Offset[] = []
  async write(buffer : ArrayBuffer | ISkelfBuffer){
    const sizeBlock = (buffer as ISkelfBuffer).size ?? new OffsetBlock(buffer.byteLength);
    this.callTrace.push(sizeBlock)
    this.offset = this.offset.add(sizeBlock)
    return;
  }
  async flush(){
    return;
  }
}
