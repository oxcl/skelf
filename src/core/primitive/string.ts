import {createDataType} from "skelf/data_type"
import {ISkelfDataType,ISkelfReader} from "skelf/types"
import {ConstraintError} from "skelf/errors"
import {OffsetBlock,readUntil} from "skelf/utils"

const decoder = new TextDecoder();
function decode(buffer : ArrayBuffer){
  return decoder.decode(buffer);
}
const encoder = new TextEncoder();
function encode(string : string){
  return encoder.encode(string).buffer;
}

export function delimitedString(delimiter : string,limit : number = Infinity){
  const delimiterBuffer = encode(delimiter);
  function constraintDelimitedString(value : string){
    const delimiterIndex = (value + delimiter).indexOf(delimiter);
    if(delimiterIndex !== value.length){
      return `
        delimitedString can not contain its own delimitter!.
        delimiter: '${delimiter}'.
        string: '${value}'.
        delimiter found at index: '${delimiterIndex}'
      `
    }
    else return true;
  }
  return createDataType<string>({
    name: `delimitedString("${delimiter}")`,
    read: async function readDelimitedString(reader){
      const buffer = await readUntil(reader,delimiterBuffer,limit);
      return decode(new Uint8Array(buffer));
    },
    write: async function writeDelimitedString(writer,value){
      const constraintResult = constraintDelimitedString(value);
      if(constraintResult !== true){
        throw new ConstraintError(constraintResult);
      }
      const buffer = encode(value);
      await writer.write(buffer);
      await writer.write(delimiterBuffer);
    }
  })
}

export const cstring = delimitedString("\0")
cstring.name = "cstring"

export function dynamicString(sizeDataType : ISkelfDataType<number>){
  return createDataType<string>({
    name: `dynamicString(${sizeDataType.name})`,
    write: async function writeDynamicString(writer,string){
      const stringBuffer = encode(string);
      const stringSize = stringBuffer.byteLength;
      // pass the size of the string to the size data type to write it with the writer
      try {
        await sizeDataType.write(stringSize,writer);
      }
      catch(e){
        if(e instanceof ConstraintError){
          throw new ConstraintError(`
            ${sizeDataType} is not capable of holding the length of the dynamicString.
            byte length of the string: ${stringBuffer.byteLength}.
            size data type constraint: ${e.message}.
          `)
        }
        else throw e
      }

      await writer.write(stringBuffer);
    },
    read: async function readDynamicString(reader){
      const stringSize = await sizeDataType.read(reader);
      const stringBuffer = await reader.read(stringSize);
      return decode(stringBuffer);
    }
  })
}

export function fixedString(size : number,filler : number | string | undefined = undefined){
  const fillerNumber = !filler ? 0 : typeof filler === "number" ? filler : (filler!.charCodeAt(0));
  return createDataType<string>({
    name: `fixedString(${size})`,
    size: new OffsetBlock(size),
    read: async function readFixedString(reader){
      const buffer = await reader.read(size);
      const uint8 = new Uint8Array(buffer);
      const fillerIndex = uint8.indexOf(fillerNumber)
      if(fillerIndex === -1)
        return decode(uint8)
      else
        return decode(uint8.slice(0,fillerIndex))
    },
    write: async function writeFixedString(writer,string){
      if(string.split("").every((char)=> char.charCodeAt(0) === fillerNumber))
        throw new ConstraintError(`
          string for fixedString contains it's own filler (delimiter)
          string: ${string}.
          delimiter char code: ${fillerNumber}.
        `)
      const buffer = encode(string);
      if(buffer.byteLength > size)
        throw new ConstraintError(`
          '${string}' is too big for '${this.name}' because ${this.name} is a fixed string with the
          size of ${size} bytes while the provided string is ${buffer.byteLength} in size
        `)
      if(buffer.byteLength < size && filler === undefined)
        throw new ConstraintError(`
          '${string} is too small for '${this.name}' since ${this.name} is a fixed string with the size of
          ${size} but the provided string is only ${buffer.byteLength} bytes. you can fix this by making the
          string match the size of the fixed string data type of provide a filler value for it so that
          the empty bytes are filled with the specified filler
        `)
      await writer.write(buffer);
      if(buffer.byteLength < size){
        const fillerBuffer = new Uint8Array(new Array(size - buffer.byteLength).fill(fillerNumber)).buffer;
        await writer.write(fillerBuffer)
      }
    }
  })
}

export function constString(constantString : string){
  const constantBuffer = encode(constantString);
  return createDataType<string>({
    name: `constString("${constantString.slice(0,15)}${constantString.length > 5 ? "...":""}")`,
    size: new OffsetBlock(constantBuffer.byteLength),
    read: async function readConstString(reader){
      const buffer = await reader.read(constantBuffer.byteLength);
      return decode(buffer);
    },
    write: async function writeConstString(writer,string){
      await writer.write(constantBuffer);
    },
    constraint: function constraintConstString(string){
      if(string !== constantString)
        return `value of constant string '${this.name}' can only be '${constantString}' but '${string}' was
        recieved instead.`
      return true;
    }
  })
}
