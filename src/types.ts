export interface ISpace {
  readonly locked : boolean;
  name  : string;
  close : () => Promise<void>;
  read  : (size : Offset,offset? : Offset) => Promise<ISkelfBuffer>;
  write : (buffer : ISkelfBuffer,offset? : Offset) => Promise<void>
}

export interface ISkelfBuffer {
  readonly bitLength : number;
  readonly buffer : ArrayBuffer;
}

export interface IAbstractStream {
  readonly locked : boolean;
  close : () => Promise<void>;
}

export interface IReadableStream extends IAbstractStream {
  read  : (size : Offset) => Promise<ISkelfBuffer>;
}

export interface IWritableStream extends IAbstractStream {
  write : (buffer : ISkelfBuffer) => Promise<number>;
}

export interface ISkelf<T> {
  read  : (input : ISpace | IReadableStream,offset? : Offset) => Promise<T>;
  write : (value : T,output : ISpace | IWritableStream, offset? : Offset) => Promise<number>;
}

export type SpaceConstructorOptions = {
  readonly name   : string;
  readonly close? : () => Promise<void>;
  readonly read   : (size : number, offset : number) => Promise<ArrayBuffer>;
  readonly write  : (buffer : ArrayBuffer, offset : number) => Promise<void>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};
