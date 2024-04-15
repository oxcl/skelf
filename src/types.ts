declare global {
  interface Buffer {}
}
interface IAbstractSpaceOrStream {
  readonly locked : boolean;
  readonly ready  : boolean;
  readonly closed : boolean;
  name  : string;
  close : () => Promise<void>;
}
export interface ISpace extends IAbstractSpaceOrStream {
  init  : () => Promise<ISpace>;
  read  : (size : Offset,offset? : Offset) => Promise<ISkelfBuffer>;
  write : (buffer : ISkelfBuffer | ArrayBuffer,offset? : Offset) => Promise<void>
}

export interface IReadableStream extends IAbstractSpaceOrStream {
  init  : () => Promise<IReadableStream>;
  read  : (size : Offset) => Promise<ISkelfBuffer>;
  skip  : (size : Offset) => Promise<void>;
}
export interface IWritableStream extends IAbstractSpaceOrStream {
  init  : () => Promise<IWritableStream>;
  write : (buffer : ISkelfBuffer | ArrayBuffer) => Promise<number>;
}

export type SkelfInput = ISpace | IReadableStream | ISkelfBuffer | ArrayBuffer | Uint8Array | ReadonlyArray<number> | Blob | Iterator<number> | AsyncIterator<number> | Iterator<number> | Buffer;
export type SkelfOutput = ISpace | IWritableStream | ISkelfBuffer | ArrayBuffer | Uint8Array | number[] | Buffer;

// since ArrayBuffers don't have the capability to work with bits, SkelfBuffer is a simple wrapper around
// ArrayBuffer class which adds the size of the buffer in bits using the bitLength property. when the data is
// less than 8 bits or has some leftover bits in the beginning this data is useful to know what parts are the
// actual size of the data that is being used.
// with functions that accept both SkelfBuffer nad ArrayBuffer, the bitLength of the ArrayBuffer is assumed to
// be byteLength*8.
export interface ISkelfBuffer extends ArrayBuffer {
  readonly bitLength : number;
}


export interface IStruct<T> {
  read  : (input : ISpace,offset? : Offset) => Promise<T>;
  write : (value : T,output : ISpace, offset? : Offset) => Promise<void>;
}

export type SpaceConstructorOptions = {
  readonly name   : string;
  readonly init?  : () => Promise<void>;
  readonly close? : () => Promise<void>;
  readonly read   : (size : number, offset : number) => Promise<ArrayBuffer>;
  readonly write  : (buffer : ArrayBuffer, offset : number) => Promise<void>;
}

export type ReadableStreamConstructorOptions = {
  readonly name   : string;
  readonly init?  : () => Promise<void>;
  readonly close? : () => Promise<void>;
  readonly skip?  : (size : number) => Promise<boolean>;
  readonly read   : (size : number) => Promise<ArrayBuffer | null>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};
