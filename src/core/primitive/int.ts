//import {createDataType} from "skelf/data_type"
//import {InvalidIntegerSize} from "skelf/errors"
//
//function createIntDataType(size : number,signed : boolean,littleEndian : boolean,name : string){
//  if(size <= 1 && signed )
//    throw new InvalidIntegerSizeError(`
//      failed to create integer data type because size of ${size} bits is invalid for a signed integer.
//      signed integers should atleast have a size of  2 bits.
//    `)
//
//  const bytesNeeded = Math.ceil(size / 8);
//  if(bytesNeeded <= 0 || bytesNeeded > 4)
//    throw new InvalidIntegerSizeError(`
//      failed to create ${size} bit ${signed ? "signed" : "unsigned"} integer data type.
//      size of ${signed ? "signed" : "unsigned"} integer must be equal to or between ${signed?2:1} and 32.
//    `);
//
//  let decodeFunction : (view : DataView) => number;
//  let encodeFunction : (view : DataView,value : number) => void;
//
//  return createDataType<number>({
//    name : name,
//    async read(reader){
//      const buffer = await reader.read(size);
//      return decodeFunction(new DataView(buffer));
//    },
//    async write(writer,value){
//      const buffer = new ArrayBuffer(bytesNeeded);
//      await writer.write(encodeFunction(new DataView(buffer),value));
//    }
//  })
//}
//
//
//export const int      = (size : number) => createIntDataType(size,true,true,`int${size}`);
//export const uint     = (size : number) => createIntDataType(size,false,true,`int${size}`);
//export const intBE    = (size : number) => createIntDataType(size,true,false,`int${size}`);
//export const uintBE   = (size : number) => createIntDataType(size,false,false,`int${size}`);
//
//export const int8     = int(8);
//export const uint8    = uint(8);
//export const byte     = int8;
//export const ubyte    = uint8;
//
//export const int16    = int(16);
//export const uint16   = uint(16);
//export const int16BE  = intBE(16);
//export const uint16BE = uintBE(16);
//export const short    = int16;
//export const ushort   = uint16;
//export const shortBE  = int16BE;
//export const ushortBE = uint16BE;
//
//export const int32    = int(32);
//export const uint32   = uint(32);
//export const int32BE  = intBE(32);
//export const uint32BE = uintBE(32);
//
//export default int
