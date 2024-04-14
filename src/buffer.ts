import {ISkelfBuffer} from "skelf/types"
// since ArrayBuffers don't have the capability to work with bits, SkelfBuffer is a simple wrapper around
// ArrayBuffer class which adds the size of the buffer in bits using the bitLength property. when the data is
// less than 8 bits or has some leftover bits in the beginning this data is useful to know what is the actual
// size of the data that is being used
// with functions that accept both SkelfBuffer nad ArrayBuffer, the bitLength of the ArrayBuffer is assumed to
// be byteLength*8

// simple wrapper around ArrayBuffer to add bitLength.
export class SkelfBuffer implements ISkelfBuffer{
  constructor(
    readonly buffer : ArrayBuffer,
    readonly bitLength : number
  ){}
}

export default SkelfBuffer
