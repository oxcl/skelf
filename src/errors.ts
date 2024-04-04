export abstract class SkelfError extends Error {
  abstract name : string;
  constructor(message : string,options : { cause? : any, context? : any}){
    super(message.replace(/\n[ \t]+/," "),options);
  }
}

export class InvalidOffsetError extends Error {
  name = "INVALID_OFFSET_ERROR"
}
