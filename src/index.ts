interface Unit<T> {
  read : (input : Input) => Promise<T>;
  write : (value : T,output : Output) => Promise<number>;
  constraint? : () => boolean;
}

interface IHandle {
  getOffset : () => Promise<number>;
}
interface IInputHandle {
  read : (size : number) => Promise<Uint8Array>;
}

interface IOutputHandle {
  write : (chunk : Uint8Array) => Promise<number>;
}

class InputHandle {

}

const byte = {
  read(input : Input){
    if(input.locked)
      throw new SkelfError(`can't read a ReadableStream input when it's locked. awaiting a previous call to a
                            Unit or a function that uses this stream might fix the issue.`);
    const reader = input.getReader();
    reader.read()
  }
} as Unit<number>

class SkelfError extends Error {
  constructor(msg : string){
    super(`skelf: ${msg}`.replace(/\n +/," "));
  }
}
