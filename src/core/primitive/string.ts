import {createDataType} from "skelf/data_type"
import {ISkelfDataType,ISkelfReader} from "skelf/types"

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
