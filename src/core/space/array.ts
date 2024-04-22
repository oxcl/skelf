import {SkelfSpace} from "skelf/space"

export class ArraySpace extends SkelfSpace {
  static count : number = 0;
  readonly name : string;
  constructor(readonly array : number[] = [], name : string | undefined = undefined){
    super();
    this.name = `arraySpace:${name ?? ArraySpace.count++}`;
  }
  async _read(size : number,offset : number){
    return new Uint8Array(this.array.slice(offset,offset + size)).buffer;
  }
  async _write(buffer : ArrayBuffer, offset : number){
    const uint8 = new Uint8Array(buffer);
    for(let i=0;i<uint8.byteLength;i++){
      this.array[offset + i] = uint8[i];
    }
  }
}
export default ArraySpace
