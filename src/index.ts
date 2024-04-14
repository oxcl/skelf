import {NodeFileSpace} from "skelf/space/node"
import {IStruct,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError} from "skelf/error"
import * as fs from "node:fs";

const struct : IStruct<number> = {
  async read(input : ISpace,offset : Offset = 0){
    const buffer = await input.read(1,offset);
    return new Uint8Array(buffer.buffer)[0];
  },
  async write(value : number,output : ISpace,offset : Offset = 0){
    await output.write(new Uint8Array([value]).buffer,offset);
  }
}

class ReadableStream implements IReadableStream {
  #locked = true;
  get locked(){ return this.#locked }
  readonly name : string;

  init(){
    return new Promise<void>((resolve,reject)=>{
      if(this.locked)
        return reject(new StreamInitializedTwiceError(`
          stream ${this.name} is already initialized.
        `));
      const stream = fs.createReadStream("test.txt");
      stream.on("readable",()=>{
        this.locked = false;
        return resolve();
      })
    })
  }

  close(){
    if(this.locked)
      throw new LockedStreamError(`
        trying to close stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending. or the stream might not be initialized yet.
      `);
  }
}

const space = await NodeFileSpace.create("test.txt")

await space.close();


export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
