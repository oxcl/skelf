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

export type SkelfStructInput = ISkelfSpace | ISkelfReadStream | ISkelfBuffer | ArrayBuffer | Uint8Array |  ReadonlyArray<number> | Blob | Iterator<number> | AsyncIterator<number> | Buffer | { [Symbol.iterator] : IterableIterator<number>};

export type SkelfStructOutput = ISkelfSpace | ISkelfWriteStream | ISkelfBuffer | ArrayBuffer | Uint8Array | number[] | Buffer;

export interface ISkelfStruct<T> {
  read  : (input : SkelfStructInput,offset? : Offset) => Promise<T>;
  write : (value : T,output : SkelfStructOutput, offset? : Offset) => Promise<void>;
  constraint : (value : T) => boolean;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};
