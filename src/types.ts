export interface ISpace {
  readonly locked : boolean;
  name  : string;
  close : () => Promise<void>;
  read  : (size : Offset,offset? : Offset) => Promise<ISkelfBuffer>;
  write : (buffer : ISkelfBuffer | ArrayBuffer,offset? : Offset) => Promise<void>
}

export interface ISkelfBuffer {
  readonly bitLength : number;
  readonly buffer : ArrayBuffer;
}

export interface IReadableStream {
  readonly locked : boolean;
  read  : (size : Offset) => Promise<ISkelfBuffer>;
  close : () => Promise<void>;
}

export interface IWritableStream {
  readonly locked : boolean;
  write : (buffer : ISkelfBuffer | ArrayBuffer) => Promise<number>;
  close : () => Promise<void>;
}

export type SkelfInput = ISpace | IReadableStream | ISkelfBuffer | ArrayBuffer;
export type SkelfOutput = ISpace | IWritableStream;

export interface ISkelf<T> {
  read  : (input : ISpace,offset? : Offset) => Promise<T>;
  write : (value : T,output : ISpace, offset? : Offset) => Promise<void>;
}

export type SpaceConstructorOptions = {
  readonly name   : string;
  readonly close? : () => Promise<void>;
  readonly read   : (size : number, offset : number) => Promise<ArrayBuffer>;
  readonly write  : (buffer : ArrayBuffer, offset : number) => Promise<void>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};
