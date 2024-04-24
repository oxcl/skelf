import {createDataType} from "skelf/data_type"
import {ConstraintError} from "skelf/errors"

export function fixedReserve(size : number){
  return createDataType<undefined>({
    name : `fixedReserve(${size})`,
    async read(reader){
      await reader.skip(size);
    },
    async write(writer,value){
      const emptyBuffer = new ArrayBuffer(size);
      await writer.write(emptyBuffer);
    }
  })
}

export function strictReserve(size : number,filler : number = 0){
  return createDataType<undefined>({
    name: `strictReserve(${size})`,
    async read(reader){
      const buffer = await reader.read(size);
      const uint8 = new Uint8Array(buffer);
      for(let i=0;i<buffer.byteLength;i++){
        if(uint8[i] !== filler) throw new ConstraintError(`
          data type ${this.name} failed to meet its constraint. byte at index ${i} in ${this.name} equals
          ${uint8[i]} while all bytes are constrained to be ${filler}.
        `)
      }
    },
    async write(writer,value = undefined){
      const filledBuffer = new Uint8Array(new Array(size).fill(filler)).buffer;
      await writer.write(filledBuffer);
    }
  })
}
