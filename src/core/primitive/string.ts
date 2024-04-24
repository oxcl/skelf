import {createDataType} from "skelf/data_type"
import {ISkelfDataType,ISkelfReader} from "skelf/types"
import {ConstraintError} from "skelf/errors"

const decoder = new TextDecoder()
const encoder = new TextEncoder();

export const cstring = createDataType<string>({
  name: "cstring",
  async read(reader){
    const arr : number[] = [];
    let char : number;
    while(true){
      char = new DataView(await reader.read(1)).getUint8(0);
      if(char === 0) break;
      arr.push(char);
    };
    return decoder.decode(new Uint8Array(arr));
  },
  async write(writer,value){
    await writer.write(encoder.encode(value).buffer)
    await writer.write(new ArrayBuffer(1)); // write the terminating null character
  }
})

export function dynamicString(sizeDataType : ISkelfDataType<number>){
  return createDataType<string>({
    name: `dynamicString(${sizeDataType.name})`,
    async write(writer,string){
      const stringBuffer = encoder.encode(string).buffer;
      const stringSize = stringBuffer.byteLength;
      // pass the size of the string to the size data type to write it with the writer
      await sizeDataType.write(stringSize,writer);

      await writer.write(stringBuffer);
    },
    async read(reader){
      const stringSize = await sizeDataType.read(reader);
      const stringBuffer = await reader.read(stringSize);
      return decoder.decode(stringBuffer);
    }
  })
}

export function fixedString(size : number,filler : number | string | undefined = undefined){
  return createDataType<string>({
    name: `fixedString(${size})`,
    async read(reader){
      const buffer = await reader.read(size);
      return decoder.decode(new Uint8Array(buffer));
    },
    async write(writer,string){
      const buffer = encoder.encode(string).buffer;
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
        const fillerNumber = typeof filler === "number" ? filler : (filler!.charCodeAt(0));
        const fillerBuffer = new Uint8Array(new Array(size - buffer.byteLength).fill(fillerNumber)).buffer;
        await writer.write(fillerBuffer)
      }
    }
  })
}

export function constString(constantString : string){
  const constantBuffer = encoder.encode(constantString);
  return createDataType<string>({
    name: `constString("${constantString.slice(0,5)}${constantString.length > 5 ? "...":""}")`,
    async read(reader){
      const buffer = await reader.read(constantBuffer.byteLength);
      return decoder.decode(buffer);
    },
    async write(writer,string){
      await writer.write(constantBuffer);
    },
    constraint(string){
      if(string !== constantString)
        return `value of constant string '${this.name}' can only be '${constantString}' but recieved ${string}`
      return true;
    }
  })
}
