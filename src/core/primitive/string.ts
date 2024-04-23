import {createDataType} from "skelf/data_type"

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
