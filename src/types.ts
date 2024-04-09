export interface ISpace {
  readonly locked : boolean;
  name : string;
  close : () => Promise<void>;
  read  : (size : Offset,offset? : Offset) => Promise<ArrayBuffer>;
  write : (buffer : ISkelfBuffer,offset? : Offset) => Promise<void>
}

export interface IAbstractStream {
  readonly locked : boolean;
  close : () => Promise<void>;
}
export interface IReadableStream extends IAbstractStream {
  read : (size : Offset) => Promise<ArrayBuffer>;
}
export interface IWritableStream extends IAbstractStream {
  write : (buffer : ArrayBuffer) => Promise<number>;
}

export interface ISkelfBuffer extends ArrayBuffer{
  readonly bitLength : number;
  readonly bitPadding : number;
};


export interface ISkelf<T> {
  read : (input : ISpace | IReadableStream,offset? : Offset) => Promise<T>;
  write : (value : T,output : ISpace | IWritableStream, offset? : Offset) => Promise<number>;
}

export type SpaceConstructorArguments = {
  readonly name : string;
  readonly close? : () => Promise<void>;
  readonly read   : (size : number, offset : number) => Promise<ArrayBuffer>;
  readonly write  : (buffer : ArrayBuffer, offset : number) => Promise<void>;
}

export type Offset = number | string | [number,number] | { amount : number, unit : number};
