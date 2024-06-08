import {
  createDataType,
  SpaceReader,
  SpaceWriter,
  StreamReader,
  StreamWriter
} from "skelf/data_type"
import {ISkelfReader,ISkelfWriter,Offset,ISkelfBuffer} from "skelf/types"
import {OffsetBlock,offsetToBlock,convertToSkelfBuffer} from "skelf/utils"


class DummyReader implements ISkelfReader {
  readonly name = "dummyReader";
  readonly type = "reader";
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
  readonly name = "dummyWriter";
  readonly type = "writer"
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

const dummy = createDataType<ArrayBuffer>({
  name: "dummy",
  async read(reader){
    return await reader.read(1);
  },
  async write(writer,value){
    await writer.write(value);
  }
})
