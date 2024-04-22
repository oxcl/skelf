import {createDataType} from "skelf/data_type"
import {InvalidIntegerSizeError} from "skelf/errors"
import {convertToSkelfBuffer} from "skelf/utils"

function createIntDataType(size : number,signed : boolean,littleEndian : boolean,name : string){
  if(size <= 1 && signed )
    throw new InvalidIntegerSizeError(`
      failed to create integer data type because size of ${size} bits is invalid for a signed integer.
      signed integers should atleast have a size of  2 bits.
    `)
  if(size <= 0 || size > 32)
    throw new InvalidIntegerSizeError(`
      failed to create ${size} bit ${signed ? "signed" : "unsigned"} integer data type.
      size of ${signed ? "signed" : "unsigned"} integer must be equal to or between ${signed?2:1} and 32.
    `);

  let decodeFunction : (view : DataView) => number;
  let encodeFunction : (view : DataView,value : number) => void;

  if(size <= 8 && signed){
    decodeFunction = (view) => view.getInt8(0);
    encodeFunction = (view,value) => view.setInt8(0,value);
  }
  else if(size <= 8 && !signed){
    decodeFunction = (view) => view.getUint8(0);
    encodeFunction = (view,value) => view.setUint8(0,value);
  }
  else if(size <= 16 && signed){
    decodeFunction = (view) => view.getInt16(0,littleEndian);
    encodeFunction = (view,value) => view.setInt16(0,value,littleEndian);
  }
  else if(size <= 16 && !signed){
    decodeFunction = (view) => view.getUint16(0,littleEndian);
    encodeFunction = (view,value) => view.setUint16(0,value,littleEndian);
  }
  else if(size <= 24 && signed){
    if(littleEndian){
      encodeFunction = (view,value) => {
        const signedValue = value >= 0 ? value : 0xFFFFFF + value + 1;
        view.setUint16(0,signedValue & 0x00FFF,littleEndian);
        view.setUint8(2,signedValue >> 16);
      }
      decodeFunction = (view) => {
        const value = view.getUint16(0,littleEndian) + view.getUint8(2) << 16;
        if(value & 0x800000) return -(0xFFFFFF - value + 1)
        else return value;
      }
    }
    else {
      encodeFunction = (view,value) => {
        const signedValue = value >= 0 ? value : 0xFFFFFF + value + 1;
        view.setUint16(1,signedValue & 0x00FFFF,littleEndian);
        view.setUint8(0,signedValue >> 16);
      }
      decodeFunction = (view) => {
        const value = view.getUint16(1,littleEndian) + view.getUint8(0) << 16;
        if(value & 0x800000) return -(0xFFFFFF - value + 1)
        else return value;
      }
    }
  }
  else if(size <= 24 && !signed){
    if(littleEndian){
      decodeFunction = (view) => view.getUint16(0,littleEndian) + view.getUint8(2) << 16;
      encodeFunction = (view,value) => {
        view.setUint16(0,value & 0x00FFFF,littleEndian);
        view.setUint8(2,value >>> 16);
      }
    }
    else {
      decodeFunction = (view) => view.getUint16(1,littleEndian) + view.getUint8(0) << 16;
      encodeFunction = (view,value) => {
        view.setUint16(1,value & 0x00FFFF,littleEndian);
        view.setUint8(0,value >>> 16);
      }
    }
  }
  else if(size <= 32 && signed){
    decodeFunction = (view) => view.getInt32(0,littleEndian);
    encodeFunction = (view,value) => view.setInt32(0,value,littleEndian);
  }
  else if(size <= 32 && !signed){
    decodeFunction = (view) => view.getUint32(0,littleEndian);
    encodeFunction = (view,value) => view.setUint32(0,value,littleEndian);
  }

  return createDataType<number>({
    name : name,
    async read(reader){
      const buffer = await reader.read(`${size}b`);
      return decodeFunction(new DataView(buffer));
    },
    async write(writer,value){
      const buffer = new ArrayBuffer(Math.ceil(size / 8));
      encodeFunction(new DataView(buffer),value);
      await writer.write(convertToSkelfBuffer(buffer,size));
    }
  })
}


export const int      = (size : number) => createIntDataType(size,true,true,`int${size}`);
export const uint     = (size : number) => createIntDataType(size,false,true,`int${size}`);
export const intBE    = (size : number) => createIntDataType(size,true,false,`int${size}`);
export const uintBE   = (size : number) => createIntDataType(size,false,false,`int${size}`);

export const int8     = int(8);
export const uint8    = uint(8);
export const byte     = int8;
export const ubyte    = uint8;

export const int16    = int(16);
export const uint16   = uint(16);
export const int16BE  = intBE(16);
export const uint16BE = uintBE(16);
export const short    = int16;
export const ushort   = uint16;
export const shortBE  = int16BE;
export const ushortBE = uint16BE;

export const int32    = int(32);
export const uint32   = uint(32);
export const int32BE  = intBE(32);
export const uint32BE = uintBE(32);

export default int
