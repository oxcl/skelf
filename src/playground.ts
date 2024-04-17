import {DumbWritableStream} from "skelf"

const stream = await new DumbWritableStream().init();

const uint8 = new Uint8Array([257])
await stream.write(uint8.buffer);

await stream.close();

console.log(stream.array)
