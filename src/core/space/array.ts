import {SkelfSpace} from "skelf/space"

export class ArraySpace extends SkelfSpace {
  static count : number = 0;
  readonly name : string;
  readonly array : number[];
  constructor(arrayOrNumber : number | number[] = [], name : string | undefined = undefined){
    super();
    this.array = (typeof arrayOrNumber === "number") ? new Array(arrayOrNumber) : arrayOrNumber;
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
