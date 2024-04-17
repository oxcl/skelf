import {SkelfSpace} from "skelf"

type SpaceConstructorOptions = {
  readonly name   : string;
  readonly init?  : () => Promise<void>;
  readonly close? : () => Promise<void>;
  readonly read   : (size : number, offset : number) => Promise<ArrayBuffer>;
  readonly write  : (buffer : ArrayBuffer, offset : number) => Promise<void>;
}

export class GenericSpace extends SkelfSpace {
  readonly name : string;
  private readonly options : SpaceConstructorOptions;
  protected override async _init(){
    if(this.options.init) this.options.init();
  };
  protected override async _close(){
    if(this.options.close) return this.options.close();
  }
  protected override async _read(size : number, offset : number){
    return this.options.read(size,offset)
  };
  protected override async _write(buffer : ArrayBuffer, offset : number){
    return this.options.write(buffer, offset);
  }

  constructor(options : SpaceConstructorOptions){
    super();
    this.name = options.name;
    this.options = options;
  }
  // create a new space object and initialize it so that it's ready to use
  static async create(options : SpaceConstructorOptions){
    return await new GenericSpace(options).init();
  }
}
export default GenericSpace
