export interface IAbstractSpace {
  readonly locked : boolean;
  name : string;
  close : () => Promise<void>;
}
export interface IReadableSpace extends IAbstractSpace{
  read  : (offset : Offset,size : Offset) => Promise<ArrayBuffer>;
}
export interface IWritableSpace extends IAbstractSpace {
  write : (chunk : ArrayBuffer,offset : Offset) => Promise<number>
}
export interface ISpace extends IReadableSpace, IWritableSpace {}

export interface IAbstractStream {
  readonly locked : boolean;
  close : () => Promise<void>;
}
export interface IReadableStream extends IAbstractStream {
  read : (size : Offset) => Promise<ArrayBuffer>;
}
export interface IWritableStream extends IAbstractStream {
  write : (chunk : ArrayBuffer) => Promise<number>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};

export interface Skelf<T> {
  read : (input : IReadableSpace | IReadableStream,offset? : Offset) => Promise<T>;
  write : (value : T,output : IWritableSpace | IWritableStream, offset? : Offset) => Promise<number>;
}

export * from "skelf/units"
