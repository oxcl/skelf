import {ISkelfBuffer,Offset,ISkelfReader,ISkelfReadStream,IOffsetBlock} from "skelf/types"
import {InvalidOffsetError,SkelfError,InvalidArgumentError,OutOfRangeError} from "skelf/errors"
import {SkelfSpace} from "skelf/space"
import {SkelfReadStream} from "skelf/read_stream"
import {SkelfWriteStream} from "skelf/write_stream"

// merge two bytes into one based by defining the bit size of the head
export function mergeBytes(headByte : number,tailByte : number,headSize : number){
  if(headSize > 8 || headSize < 0)
    throw new InvalidArgumentError(`
      invalid head size for mergeBytes function. headSize: ${headSize}
    `)
  return (headByte >> (8-headSize) << (8-headSize)) | (((tailByte << headSize) & 0xFF) >> headSize)
}

export function offsetToString(offset : Offset){
  if(typeof offset === "number")
    return `${offset}B`
  else if(typeof offset === "string")
    return offset;
  else
    return `${offset.bytes}B${offset.bits > 0 ? `${offset.bits}b` : ""}`
}

export function copyBuffer(
  source : ArrayBuffer,
  target : ArrayBuffer,
  offset : number,
  length : number,
  position : number
){
  if(length === 0) return;
  if(offset > source.byteLength || offset < 0){
    throw new InvalidArgumentError(`
      offset value for copyBuffer is invalid. offset: ${offset}, source length: ${source.byteLength}
    `)
  }
  if(length < 0){
    throw new InvalidArgumentError(`
      length value for copyBuffer is invalid. length: ${length}
    `)
  }
  if(length + offset > source.byteLength){
    throw new OutOfRangeError(`
      length + offset is larget than the size of the source array. length : ${length}, offset: ${offset},
      source array length: ${source.byteLength}
    `)
  }
  if(position < 0 || position + length > target.byteLength){
    throw new OutOfRangeError(`
      position value for target buffer is invalid or out of range. position : ${position}, length : ${length},
      target buffer length: ${target.byteLength}
    `)
  }
  // copying the big portions
  const bigPortionLength = Math.max(0,Math.floor((length-offset) / Float64Array.BYTES_PER_ELEMENT));
  const sourceDataView = new DataView(source,offset,bigPortionLength * Float64Array.BYTES_PER_ELEMENT);
  const targetDataView = new DataView(
    target,
    position,
    bigPortionLength * Float64Array.BYTES_PER_ELEMENT
  );

  for (let i = 0; i < bigPortionLength; i++)
    targetDataView.setFloat64(
      i*Float64Array.BYTES_PER_ELEMENT,
      sourceDataView.getFloat64(i*Float64Array.BYTES_PER_ELEMENT)
    );

  // copying over the remaining bytes in the small portion
  if(length === bigPortionLength * Float64Array.BYTES_PER_ELEMENT) return;
  const sourceArray = new Uint8Array(source,offset + bigPortionLength*Float64Array.BYTES_PER_ELEMENT)
  const targetArray = new Uint8Array(target,position + bigPortionLength*Float64Array.BYTES_PER_ELEMENT)

  for (let i = 0; i < sourceArray.length; i++)
    targetArray[i] = sourceArray[i];
}

// copy a buffer into new buffer with optional expanded space at the end and offseted bytes in the beginning
export function cloneBuffer(sourceBuffer : ArrayBuffer,expand : number = 0){
  if(expand === 0)
    return sourceBuffer.slice(0); // cloning the easy way

  const targetBuffer = new ArrayBuffer(sourceBuffer.byteLength + expand);
  copyBuffer(sourceBuffer,targetBuffer,0,sourceBuffer.byteLength,0);
  return targetBuffer;
}

// shift a Uint8Array object by bits
export function shiftUint8ByBits(uint8 : Uint8Array, shift : number){
  if(shift > 8 || shift < -8)
    throw new InvalidArgumentError(`
      shifting a uint8Array by more than 8 bits is not possible. shift: ${shift}, array: ${uint8}
    `);
  if(shift === 0) return 0;
  if(uint8.byteLength === 0)
    throw new InvalidArgumentError(`
      shifting a uint8Array with length of 0 is impossible.
    `)
  let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
  if(shift > 0){
    for(let i = 0;i < uint8.byteLength; i++) {
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
    for(let i = uint8.byteLength-1; i >= 0; --i){
      leftoverOfThisByte = uint8[i] >> (8-shift);
      uint8[i] <<= shift;
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
  return leftoverOfPrevByte;
}

// wrap a ArrayBuffer object and turn it into a SkelfBuffer by adding the bitLength property.
export function convertToSkelfBuffer(buffer : ArrayBuffer,size : IOffsetBlock){
  (buffer as any).size = size;
  return buffer as ISkelfBuffer;
};

export function groom(str : string){
  return str.replace(/\n[ \t]+/g," ").trim();
}

export function isSpace(obj : any){
  return (obj instanceof SkelfSpace) ||
    (typeof obj === "object" && typeof obj.read === "function" && typeof obj.write === "function");
}
export function isWriteStream(obj : any){
  return (obj instanceof SkelfWriteStream) ||
    (typeof obj === "object" && typeof obj.write === "function" && typeof obj.flush === "function");
}
export function isWriter(obj : any){
  return typeof obj === "object" && typeof obj.write === "function" && typeof obj.flush === "function" &&
    typeof obj.offset === "number";
}

export function isReadStream(obj : any){
  return (obj instanceof SkelfReadStream) ||
    (typeof obj === "object" && typeof obj.read === "function" && typeof obj.skip === "function");
}
export function isReader(obj :any){
  return typeof obj === "object" && typeof obj.read === "function" && typeof obj.skip === "function" &&
    typeof obj.offset === "number";
}

export function isBufferLike(obj : any){
  return obj instanceof ArrayBuffer || obj instanceof Uint8Array;
}

export function isFileHandle(obj : any){
  return (obj.constructor && obj.constructor.name === "FileHandle") || (typeof obj === "object" && typeof obj.read === "function" && typeof obj.write === "function" && typeof obj.close === "function");
}

export class OffsetBlock implements IOffsetBlock {
  bits : number;
  bytes : number;
  constructor(
    bytes : number = 0,
    bits : number =  0
  ){
    this.bytes = bytes + Math.floor(bits / 8)
    this.bits = bits % 8;
    if(this.bits<0){
      this.bits = 8 + this.bits;
    }
  }

  incrementByBits(bitsIncrement : number){
    this.bytes += Math.floor((this.bits+bitsIncrement) / 8);
    this.bits  = (this.bits + bitsIncrement) % 8;
    if(this.bits<0){
      this.bits = 8 + this.bits;
    }
  }
  incrementByBytes(byteIncrement : number){
    this.bytes += byteIncrement;
  }
  add(size : IOffsetBlock){
    return new OffsetBlock(this.bytes+size.bytes,this.bits+size.bits);
  }
  subtract(size : IOffsetBlock){
    return this.add({
      bytes: -size.bytes,
      bits: -size.bits
    })
  }
  ceil(){
    return this.bytes + (this.bits ? +1 : 0);
  }
  floor(){
    return this.bytes;
  }
  isEqual(block : IOffsetBlock){
    return this.bytes === block.bytes && this.bits === block.bits;
  }
  isZero(){
    return this.bytes === 0 && this.bits === 0;
  }
  static isZero(offset : IOffsetBlock){
    return offset.bytes === 0 && offset.bits === 0;
  }
  multiply(number : number){
    return new OffsetBlock(this.bytes*number,this.bits*number);
  }
  static enhance(block : IOffsetBlock){
    return new OffsetBlock(block.bytes,block.bits);
  }
  static clone(block : IOffsetBlock){
    return OffsetBlock.enhance(block);
  }
  toString(){
    return offsetToString(this);
  }
}

// convert offset values to bits
export function offsetToBlock(offset : Offset){
  if(typeof offset === "number"){
    return new OffsetBlock(offset);
  }
  if(typeof offset === "string"){
    return OffsetBlock.enhance(parseOffsetString(offset));
  }
  return OffsetBlock.enhance(offset);
}

// parse strings as offset values containing amount+unit values
function parseOffsetString(offsetString : string){
  const amount = Number.parseInt(offsetString);
  if(Number.isNaN(amount))
    throw new InvalidOffsetError(`failed to parse the amount portion of the offset string '${offsetString}'.`);

  const unitString = offsetString.slice(offsetString.search(/[A-Za-z]/));
  switch(unitString){
  case "b": case "bit": case "bits":
    return {bytes: Math.floor(amount / 8), bits: amount % 8};
  case "B": case "Byte": case "Bytes":
    return {bytes: amount, bits: 0};
  case "Kb": case "kb": case "Killobit": case "killobit": case "KilloBit": case "killoBit": case "Killobits":
  case "killobits": case "KilloBits": case "killoBits":
    return {bytes: Math.floor(amount / 8 * 1000), bits: 0};
  case "KB": case "kB": case "Killobyte": case "killobyte": case "KilloByte": case "killoByte":
  case "Killobytes": case "killobytes": case "KilloBytes": case "killoBytes":
    return {bytes: amount * 1024, bits: 0};
  default:
    throw new InvalidOffsetError(`
      unable to parse unknown unit '${unitString}' in offset string
      '${offsetString}' with amount being: ${amount}.`
    );
  }
}

export const ZERO_BUFFER = convertToSkelfBuffer(new ArrayBuffer(0),new OffsetBlock(0,0))
