import * as corePrimitives from "./primitive/index.js"
import * as coreReadStreams from "./read_stream/index.js"
import * as coreWriteStreams from "./write_stream/index.js"
import * as coreStructs from "./struct/index.js"
import * as coreSpaces from "./space/index.js"

export const primitives = corePrimitives
export const readStreams = coreReadStreams
export const writeStreams = coreWriteStreams
export const structs = coreStructs
export const spaces = coreSpaces

export * from "./space/index.js"
export * from "./read_stream/index.js"
export * from "./write_stream/index.js"
export * from "./struct/index.js"
export * from "./primitive/index.js"
