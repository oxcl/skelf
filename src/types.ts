interface IAbstractSpaceOrStream {
  readonly locked : boolean;
  readonly ready  : boolean;
  readonly closed : boolean;
  name  : string;
  init  : () => Promise<void>;
  close : () => Promise<void>;
}
export interface ISpace extends IAbstractSpaceOrStream {
  read  : (size : Offset,offset? : Offset) => Promise<ISkelfBuffer>;
  write : (buffer : ISkelfBuffer | ArrayBuffer,offset? : Offset) => Promise<void>
}

export interface IReadableStream extends IAbstractSpaceOrStream {
  read  : (size : Offset) => Promise<ISkelfBuffer>;
}
export interface IWritableStream extends IAbstractSpaceOrStream {
  write : (buffer : ISkelfBuffer | ArrayBuffer) => Promise<number>;
}

export type SkelfInput = ISpace | IReadableStream | ISkelfBuffer | ArrayBuffer | Uint8Array | number[] | Blob;
export type SkelfOutput = ISpace | IWritableStream;

export interface ISkelfBuffer {
  readonly bitLength : number;
  readonly buffer : ArrayBuffer;
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

export type Offset = number | string | [number,number] | { amount : number, unit : number};
