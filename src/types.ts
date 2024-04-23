// pollyfill for node.js Buffer type
declare global {
  interface Buffer {}
}

export interface ISkelfSpace {
  readonly locked : boolean;
  readonly ready  : boolean;
  readonly closed : boolean;
  name  : string;
  close : () => Promise<void>;
  init  : () => Promise<ISkelfSpace>;
  read  : (size : Offset,offset? : Offset) => Promise<ISkelfBuffer>;
  write : (buffer : ISkelfBuffer | ArrayBuffer,offset? : Offset) => Promise<void>
}

export interface ISkelfReadStream {
  readonly locked : boolean;
  readonly ready  : boolean;
  readonly closed : boolean;
  name  : string;
  close : () => Promise<void>;
  init  : () => Promise<ISkelfReadStream>;
  read  : (size : Offset) => Promise<ISkelfBuffer>;
  skip  : (size : Offset) => Promise<void>;
}

export interface ISkelfWriteStream {
  readonly locked : boolean;
  readonly ready  : boolean;
  readonly closed : boolean;
  name  : string;
  close : () => Promise<void>;
  init  : () => Promise<ISkelfWriteStream>;
  write : (buffer : ISkelfBuffer | ArrayBuffer) => Promise<void>;
  flush : () => Promise<void>;
}

// since ArrayBuffers don't have the capability to work with bits, SkelfBuffer is a simple wrapper around
// ArrayBuffer class which adds the size of the buffer in bits using the bitLength property. when the data is
// less than 8 bits or has some leftover bits in the beginning this data is useful to know what parts are the
// actual size of the data that is being used.
// with functions that accept both SkelfBuffer nad ArrayBuffer, the bitLength of the ArrayBuffer is assumed to
// be byteLength*8.
export interface ISkelfBuffer extends ArrayBuffer {
  readonly bitLength : number;
}

export type SkelfInput = ISkelfSpace | ISkelfReadStream | ISkelfReader |
  ISkelfBuffer | ArrayBuffer | Uint8Array | Buffer | // TODO: add blob support
  ReadonlyArray<number> |
  Iterator<number> | AsyncIterator<number> | { [Symbol.iterator] : () => IterableIterator<number>};

export type SkelfOutput = ISkelfSpace | ISkelfWriteStream | ISkelfWriter |
  ISkelfBuffer | ArrayBuffer | Uint8Array | Buffer |
  number[];

export interface ISkelfDataType<T> {
  name : string;
  read  : (input : SkelfInput,offset? : Offset) => Promise<T>;
  write : (value : T,output : SkelfOutput, offset? : Offset) => Promise<void>;
  constraint : (value : T) => boolean | string;
}

export interface ISkelfReader {
  readonly skip : (size : Offset) => Promise<void>;
  readonly read : (size : Offset) => Promise<ISkelfBuffer>;
}

export interface ISkelfWriter {
  readonly write : (buffer : ISkelfBuffer | ArrayBuffer) => Promise<void>;
  readonly flush : () => Promise<void>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};
