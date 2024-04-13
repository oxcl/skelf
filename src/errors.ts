export abstract class SkelfError extends Error {
  abstract override name : string;
  context? : any;
  constructor(message : string,{cause,context} : { cause? : any, context? : any} = {}){
    super(message.replace(/\n[ \t]+/," "));
    super.cause = cause;
    this.context = context;
  }
}

export class InvalidOffsetError extends SkelfError {
  override name = "INVALID_OFFSET_ERROR"
}

export class LockedSpaceError extends SkelfError {
  override name = "LOCKED_SPACE_ERROR"
}

export class InvalidSpaceOptionsError extends SkelfError {
  override name = "INVALID_SPACE_OPTIONS_ERROR"
}
