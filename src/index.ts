export interface IAbstractSpace {
  readonly locked : boolean;
  name : string;
  close : () => Promise<void>;
}
export interface IReadableSpace extends IAbstractSpace{
  read  : (size : Offset,offset? : Offset) => Promise<ArrayBuffer>;
}
export interface IWritableSpace extends IAbstractSpace {
  write : (chunk : ArrayBuffer,offset? : Offset) => Promise<number>
}
export interface ISpace extends IReadableSpace, IWritableSpace {}

export interface IAbstractStream {
  readonly locked : boolean;
  close : () => Promise<void>;
}
export interface IReadableStream extends IAbstractStream {
  read : (size : Offset) => Promise<ArrayBuffer>;
}
export interface IWritableStream extends IAbstractStream {
  write : (chunk : ArrayBuffer) => Promise<number>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};

// simple wrapper around ArrayBuffer to keep track of bit size of the buffer (useful when working with bits)
export class SkelfBuffer extends ArrayBuffer {
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
}

export interface Skelf<T> {
  read : (input : IReadableSpace | IReadableStream,offset? : Offset) => Promise<T>;
  write : (value : T,output : IWritableSpace | IWritableStream, offset? : Offset) => Promise<number>;
}
function convertToUint8Array(input : ArrayBuffer | Uint8Array){
  if(input instanceof Uint8Array)
    return input;
  else
    return new Uint8Array(input);
}
export class Space {
  #locked : boolean = false;
  readonly _close? : () => Promise<void>;
  readonly _read : (size : number, offset : number) => Promise<ArrayBuffer>;
  get locked(){ return this.#locked};
  async close(){
    if(this.locked)
      throw new LockedSpaceError(`
        trying to close space '${this.name}' while it's locked. this could be caused by a not awaited call
        to this method, which might be still pending.
      `)
    if(this._close) = await this._close();
  }
  async read(size : Offset, offset : Offset){
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
    const uint8 = convertToUint8Array(buffer);

    // zero out the beginning of the first byte which doesn't include the desired bits
    uint8[0] &= 0xFF >> leftoverBitsToOffset

    if(bitShift !== 0){
      // shift the bits into
      let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
      for(let i = 0; i < uint8.length; i++) {
        // get the bits that will be cut from the right of the this byte to add them to the next byte later
        leftoverOfThisByte = uint8[i] & (0xFF >> (8-bitShift));
        // shift the byte by bitShift to the right
        uint8[i] >>= bitShift;
        // add the left overs from the previous byte that was shifted to this byte
        uint8[i] |= leftoverOfPrevByte << (8-bitShift);
        leftoverOfPrevByte = leftoverOfThisByte;
      }
    }

    this.#locked = false;
    // if the size doesn't have leftover bits but the offset does. that means after shifting bits to correct
    // positions, there should be a redundant empty byte at the beginning of the buffer that was read.
    if(bitShift + leftoverBitsToOffset >= 8){
      return new SkelfBuffer(uint8.slice(1).buffer);
    }
    return new SkelfBuffer(buffer.buffer);
  }
}

export * from "skelf/units"
