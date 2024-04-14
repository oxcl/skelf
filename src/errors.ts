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
export class SpaceInitializedTwiceError extends SkelfError {
  override name = "SPACE_INITIALIZED_TWICE_ERROR"
}
export class SpaceIsNotReadyError extends SkelfError {
  override name = "SPACE_IS_NOT_READY_ERROR";
}
export class SpaceIsClosedError extends SkelfError {
  override name = "SPACE_IS_CLOSED_ERROR"
}

export class StreamInitializedTwiceError extends SkelfError {
  override name = "STREAM_INITIALIZED_TWICE_ERROR";
}
export class LockedStreamError extends SkelfError {
  override name = "LOCKED_STREAM_ERROR";
}
export class StreamIsNotReadyError extends SkelfError {
  override name = "STREAM_IS_NOT_READY_ERROR";
}
export class StreamIsClosedError extends SkelfError {
  override name = "STREAM_IS_CLOSED_ERROR";
}
