import {ISpace,ISkelfBuffer,Offset,SpaceConstructorArguments} from "skelf/types"
import {LockedSpaceError,InvalidOffsetError} from "skelf/errors"
import units from "skelf/units"

// simple wrapper around ArrayBuffer to keep track of bit size of the buffer (useful when working with bits)
export class SkelfBuffer extends ArrayBuffer implements ISkelfBuffer{
  constructor(
    size : any,
    bitLength : number
  ){
    super(size);
    this.#bitLength = bitLength;
  }
  #bitLength : number
  get bitLength(){ return this.#bitLength };
  get bitPadding(){ return this.byteLength*8 - this.#bitLength }
  static Wrap(rawBuffer : ArrayBuffer,bitLength : number){
    return new Proxy(rawBuffer,{
      get(target,prop,reciever){
        if(prop === "bitLength")
          return bitLength;
        else if(prop === "bitPadding")
          return rawBuffer.byteLength*8 - bitLength;
        else
          return Reflect.get(target,prop,reciever);
      }
    }) as SkelfBuffer;
  }
}

export class Space implements ISpace {
  #locked : boolean = false;
  get locked(){ return this.#locked};
  private readonly _close? : SpaceConstructorArguments['close'];
  private readonly _read : SpaceConstructorArguments['read'];
  private readonly _write : SpaceConstructorArguments['write'];
  readonly name : string;
  constructor(options : SpaceConstructorArguments){
    this.name = options.name;
    this._close = options.close;
    this._read = options.read;
    this._write = options.write;
  }
  async close(){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to close space '${this.name}' while it's locked. this could be caused by a not awaited call
        to this method, which might be still pending.
      `)
    if(this._close) await this._close();
  }
  async read(size : Offset, offset : Offset = 0){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to read from space '${this.name}' while it's locked. this could be caused by a not awaited
        call to this method, which might be still pending.
      `)
    this.#locked = true;
    const totalBitsToOffset = offsetToBits(offset); // convert offset to bits
    const wholeBytesToOffset = Math.floor(totalBitsToOffset / 8); // calculate offset in whole bytes
    const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover offset bits
    const sizeInBits = offsetToBits(size); // convert size to bits
    const bytesToRead = Math.ceil((leftoverBitsToOffset + sizeInBits) / 8) // how many bytes to cover all bits
    const bitShift = (bytesToRead*8 - (leftoverBitsToOffset + sizeInBits)) % 8; // how many bits to shift right

    const buffer = await this._read(bytesToRead,wholeBytesToOffset);
    const uint8 = new Uint8Array(buffer);

    // zero out the beginning of the first byte which doesn't include the desired bits
    uint8[0] &= 0xFF >> leftoverBitsToOffset

    if(bitShift !== 0){
      shiftArrayByBits(uint8,bitShift);
    }

    this.#locked = false;
    // if the size doesn't have leftover bits but the offset does. that means after shifting bits to correct
    // positions, there should be a redundant empty byte at the beginning of the buffer that was read.
    if(bitShift + leftoverBitsToOffset >= 8){
      return SkelfBuffer.Wrap(uint8.slice(1).buffer,sizeInBits);
    }
    return SkelfBuffer.Wrap(buffer,sizeInBits);
  }

  async write(buffer : ISkelfBuffer,offset : Offset = 0){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to write to space '${this.name}' while it's locked. this could be caused by a not awaited
        call to this method, which might be still pending.
      `)
    this.#locked = true;

    const totalBitsToOffset = offsetToBits(offset); // convert offset to bits
    let wholeBytesToOffset = Math.floor(totalBitsToOffset / 8); // calculate offset in whole bytes
    const leftoverBitsToOffset = totalBitsToOffset % 8; // calculate the leftover offset bits

    if(leftoverBitsToOffset === 0 && buffer.bitPadding === 0){
      await this._write(buffer,wholeBytesToOffset);
    }
  }
}

function shiftArrayByBits(uint8 : Uint8Array, shift : number){
  // shift the bits into
  let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
  if(shift === 0) {
    return;
  }
  else if(shift > 0){
    for(let i = uint8.length-1;i >= 0; --i) {
      // get the bits that will be cut from the right of the this byte to add them to the next byte later
      leftoverOfThisByte = (uint8[i] << (8-shift)) & 0xFF;
      // shift the byte by bit shift to the right
      uint8[i] >>= shift;
      // add the left overs from the previous byte that was shifted to this byte
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
  else{
    shift = -shift;
    for(let i = 0; i < uint8.length; i++){
      leftoverOfThisByte = uint8[i] >> (8-shift);
      uint8[i] <<= shift;
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
}

function offsetToBits(offset : Offset){
  if(typeof offset === "number"){
    return offset * 8;
  }
  if(typeof offset === "string"){
    const parsedOffset = parseOffsetString(offset);
    return parsedOffset.amount * parsedOffset.unit;
  }
  if(Array.isArray(offset)){
    return offset[0] * offset[1];
  }
  return offset.amount * offset.unit;
}

export function parseOffsetString(offsetString : string){
  const amount = Number.parseInt(offsetString);
  if(Number.isNaN(amount))
    throw new InvalidOffsetError(`failed to parse the amount portion of the offset string '${offsetString}'.`);

  const unitString = offsetString.slice(offsetString.search(/[A-Za-z]/));
  switch(unitString){
  case "b": case "bit": case "bits":
    return {amount, unit: units.bit};
  case "B": case "Byte": case "Bytes":
    return {amount, unit: units.byte};
  case "Kb": case "kb": case "Killobit": case "killobit": case "KilloBit": case "killoBit": case "Killobits":
  case "killobits": case "KilloBits": case "killoBits":
    return {amount, unit: units.killobit};
  case "KB": case "kB": case "Killobyte": case "killobyte": case "KilloByte": case "killoByte":
  case "Killobytes": case "killobytes": case "KilloBytes": case "killoBytes":
    return {amount, unit: units.killobyte};
  default:
    throw new InvalidOffsetError(`unable to parse unknown unit '${unitString}' in offset string
                                 '${offsetString}' with amount being: ${amount}.`);
  }
}


export * from "skelf/units"
export * from "skelf/types"
