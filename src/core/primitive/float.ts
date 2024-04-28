import {createDataType} from "skelf/data_type"

function createFloat(size : 32 | 64,littleEndian : boolean){
  return createDataType<number>({
    name: `float${size}${littleEndian ? "" : "BE"}`,
    size,
    read: async function readFloat(reader){
      const buffer = await reader.read(`${size}b`);
      return new DataView(buffer)[`getFloat${size}`](0,littleEndian)
    },
    write: async function writeFloat(writer,value){
      const buffer = new ArrayBuffer(size / 8);
      new DataView(buffer)[`setFloat${size}`](0,value,littleEndian);
      await writer.write(buffer);
    }
  })
}

export const float32   = createFloat(32,false);
export const float32BE = createFloat(32,true);
export const float64   = createFloat(64,false);
export const float64BE = createFloat(64,true);
