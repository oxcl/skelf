import {ReadableStream} from "skelf"

type ReadableStreamConstructorOptions = {
  readonly name   : string;
  readonly init?  : () => Promise<void>;
  readonly close? : () => Promise<void>;
  readonly skip?  : (size : number) => Promise<boolean>;
  readonly read   : (size : number) => Promise<ArrayBuffer | null>;
}

export class GenericReadableStream extends ReadableStream {
  readonly name : string;
  private readonly options : ReadableStreamConstructorOptions;
  protected override async _init(){
    if(this.options.init) return await this.options.init();
  };
  protected override async _close(){
    if(this.options.close) return await this.options.close();
  }
  protected override async _skip(size : number){
    if(this.options.skip) return await this.options.skip(size);
    else return await super._skip(size);
  }
  protected override async _read(size : number){
    return this.options.read(size);
  };

  constructor(options : ReadableStreamConstructorOptions){
    super();
    this.name = options.name;
    this.options = options;
  }

  static async create(options : ReadableStreamConstructorOptions){
    return await new GenericReadableStream(options).init();
  }
}

export default GenericReadableStream
