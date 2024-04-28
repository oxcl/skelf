import {Offset,ISkelfBuffer} from "skelf/types"
import {createDataType} from "skelf/data_type"
import {ConstraintError} from "skelf/errors"
import {offsetToString,offsetToBits,convertToSkelfBuffer} from "skelf/utils"

export function fixedReserve(size : Offset){
  const sizeInBits = offsetToBits(size)
  return createDataType<undefined>({
    name : `fixedReserve(${offsetToString(size)})`,
    size : sizeInBits,
    read: async function readFixedReserve(reader){
      await reader.skip(size);
    },
    write: async function writeFixedReserve(writer,value){
      const emptyBuffer = new ArrayBuffer(Math.ceil(sizeInBits/8));
      await writer.write(convertToSkelfBuffer(emptyBuffer,sizeInBits));
    }
  })
}

export function strictReserve(size : Offset,filler : number = 0){
  return createDataType<undefined>({
    name: `strictReserve(${size})`,
    size : offsetToBits(size),
    read: async function readStrictReserve(reader){
      const buffer = await reader.read(size);
      const uint8 = new Uint8Array(buffer);
      for(let i=0;i<buffer.byteLength;i++){
        if(uint8[i] !== filler) throw new ConstraintError(`
          data type ${this.name} failed to meet its constraint. byte at index ${i} in ${this.name} equals
          ${uint8[i]} while all bytes are constrained to be ${filler}.
        `)
      }
    },
    write: async function writeStrictReserve(writer,value = undefined){
      const sizeInBits = offsetToBits(size)
      const bytesCeil = Math.ceil(sizeInBits/8);
      const filledBuffer = new Uint8Array(new Array(bytesCeil).fill(filler)).buffer;
      await writer.write(convertToSkelfBuffer(filledBuffer,sizeInBits));
    }
  })
}
