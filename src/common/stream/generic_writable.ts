import {SkelfWriteStream} from "skelf"

type WriteStreamConstructorOptions = {
  readonly name   : string;
  readonly init?  : () => Promise<void>;
  readonly close? : () => Promise<void>;
  readonly write  : (buffer : ArrayBuffer) => Promise<void>;
}

export class GenericWriteStream extends SkelfWriteStream {
  readonly name : string;
  private readonly options : WriteStreamConstructorOptions;
  protected override async _init(){
    if(this.options.init) return await this.options.init();
  };
  protected override async _close(){
    if(this.options.close) return await this.options.close();
  }
  protected override async _write(buffer : ArrayBuffer){
    return this.options.write(buffer);
  };

  constructor(options : WriteStreamConstructorOptions){
    super();
    this.name = options.name;
    this.options = options;
  }

  static async create(options : WriteStreamConstructorOptions){
    return await new GenericWriteStream(options).init();
  }
}

export default GenericWriteStream
