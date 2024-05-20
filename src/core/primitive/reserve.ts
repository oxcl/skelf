import {Offset,ISkelfBuffer} from "skelf/types"
import {createDataType} from "skelf/data_type"
import {ConstraintError} from "skelf/errors"
import {offsetToString,offsetToBlock,convertToSkelfBuffer} from "skelf/utils"

export function fixedReserve(size : Offset){
  const sizeBlock = offsetToBlock(size)
  return createDataType<undefined>({
    name : `fixedReserve(${offsetToString(size)})`,
    size : sizeBlock,
    read: async function readFixedReserve(reader){
      await reader.skip(size);
    },
    write: async function writeFixedReserve(writer,value){
      const emptyBuffer = new ArrayBuffer(sizeBlock.ceil());
      await writer.write(convertToSkelfBuffer(emptyBuffer,sizeBlock));
    }
  })
}

export function strictReserve(size : Offset,filler : number = 0){
  const sizeBlock = offsetToBlock(size);
  return createDataType<undefined>({
    name: `strictReserve(${offsetToString(size)})`,
    size : sizeBlock,
    read: async function readStrictReserve(reader){
      const buffer = await reader.read(sizeBlock);
      const uint8 = new Uint8Array(buffer);
      for(let i=0;i<buffer.byteLength;i++){
        if(uint8[i] !== filler) throw new ConstraintError(`
          data type ${this.name} failed to meet its constraint. byte at index ${i} in ${this.name} equals
          ${uint8[i]} while all bytes are constrained to be ${filler}.
        `)
      }
    },
    write: async function writeStrictReserve(writer,value = undefined){
      const filledBuffer = new Uint8Array(new Array(sizeBlock.ceil()).fill(filler)).buffer;
      await writer.write(convertToSkelfBuffer(filledBuffer,sizeBlock));
    }
  })
}
