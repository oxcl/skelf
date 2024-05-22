export abstract class SkelfError extends Error {
  abstract override name : string;
  context? : any;
  constructor(message : string,{cause,context} : { cause? : any, context? : any} = {}){
    super(message.replace(/\n[ \t]+/g," "));
    super.cause = cause;
    this.context = context;
  }
}

export class InvalidArgumentError extends SkelfError {
  override name = "INVALID_ARGUMENT_ERROR";
}
export class OutOfRangeError extends SkelfError {
  override name = "OUT_OF_RANGE_ERROR";
}

// when the value of the offset is not syntactically correct this error is thrown. a different error is thrown
// when the offset is out of bound or logically invalid.
export class InvalidOffsetError extends SkelfError {
  override name = "INVALID_OFFSET_ERROR"
}

export class SpaceIsNotReadyError extends SkelfError {
  override name = "SPACE_IS_NOT_READY_ERROR";
}
export class SpaceInitializedTwiceError extends SkelfError {
  override name = "SPACE_INITIALIZED_TWICE_ERROR"
}
export class LockedSpaceError extends SkelfError {
  override name = "LOCKED_SPACE_ERROR"
}
export class WriteOutsideSpaceBoundaryError extends SkelfError {
  override name = "WRITE_OUTSIDE_SPACE_BOUNDARY_ERROR"
}
export class ReadOutsideSpaceBoundaryError extends SkelfError {
  override name = "READ_OUTSIDE_SPACE_BOUNDARY_ERROR"
}
export class SpaceIsClosedError extends SkelfError {
  override name = "SPACE_IS_CLOSED_ERROR"
}

export class StreamIsNotReadyError extends SkelfError {
  override name = "STREAM_IS_NOT_READY_ERROR";
}
export class StreamInitializedTwiceError extends SkelfError {
  override name = "STREAM_INITIALIZED_TWICE_ERROR";
}
export class LockedStreamError extends SkelfError {
  override name = "LOCKED_STREAM_ERROR";
}
export class StreamReachedReadLimitError extends SkelfError {
  override name = "STREAM_REACHED_READ_LIMIT_ERROR";
}
export class StreamReachedWriteLimitError extends SkelfError {
  override name = "STREAM_REACHED_WRITE_LIMIT_ERROR";
}
export class StreamIsClosedError extends SkelfError {
  override name = "STREAM_IS_CLOSED_ERROR";
}

export class UnknownInputForDataType extends SkelfError {
  override name = "UNKNOWN_INPUT_FOR_DATA_TYPE";
}
export class UnknownOutputForDataType extends SkelfError {
  override name = "UNKNOWN_OUTPUT_FOR_DATA_TYPE";
}

export class InvalidIntegerSizeError extends SkelfError {
  override name = "INVALID_INTEGER_SIZE";
}

export class ConstraintError extends SkelfError {
  override name = "CONSTRAINT_ERROR"
}
export class UnexpectedSizeError extends SkelfError {
  override name = "BIGGER_THAN_EXPECTED_ERROR";
}

export class LoggerConfiguredTwiceError extends SkelfError {
  override name = "LOGGER_CONFIGURED_TWICE_ERROR"
}
