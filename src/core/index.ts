import * as corePrimitive from "./primitive/index.js"
import * as coreReadStream from "./read_stream/index.js"
import * as coreWriteStream from "./write_stream/index.js"
import * as coreStruct from "./struct/index.js"
import * as coreSpace from "./space/index.js"

export const primitive = corePrimitive
export const readStream = coreReadStream
export const writeStream = coreWriteStream
export const struct = coreStruct
export const space = coreSpace

export * from "./space/index.js"
export * from "./read_stream/index.js"
export * from "./write_stream/index.js"
export * from "./struct/index.js"
export * from "./primitive/index.js"
