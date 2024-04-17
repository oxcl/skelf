import {WritableStream} from "skelf"

type WritableStreamConstructorOptions = {
  readonly name   : string;
  readonly init?  : () => Promise<void>;
  readonly close? : () => Promise<void>;
  readonly write  : (buffer : ArrayBuffer) => Promise<void>;
}

export class GenericWritableStream extends WritableStream {
  readonly name : string;
  private readonly options : WritableStreamConstructorOptions;
  protected override async _init(){
    if(this.options.init) return await this.options.init();
  };
  protected override async _close(){
    if(this.options.close) return await this.options.close();
  }
  protected override async _write(buffer : ArrayBuffer){
    return this.options.write(buffer);
  };

  constructor(options : WritableStreamConstructorOptions){
    super();
    this.name = options.name;
    this.options = options;
  }

  static async create(options : WritableStreamConstructorOptions){
    return await new GenericWritableStream(options).init();
  }
}

export default GenericWritableStream
