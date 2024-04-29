import {LoggerConfiguredTwiceError,InvalidArgumentError} from "skelf/errors"
import {groom} from "skelf/utils"

interface LoggerConfiguration {
  enable ?: boolean;
  verbose ?: (message : string) => void;
  log ?: (message : string) => void;
  warn ?: (message : string) => void;
  error ?: (message : string) => void;
  level ?: "verbose" | "warn" | "error" | "quiet";
  colors ?: boolean;
}

export class SkelfLogger {
  private static options : LoggerConfiguration = {};
  private static isConfigured : boolean = false;
  static configure({enable,verbose,log,warn,error,level,colors} : LoggerConfiguration){
    if(SkelfLogger.isConfigured){
      throw new LoggerConfiguredTwiceError(`
        trying to configure skelf logger twice. skelf logger can be configured only once and it must be
        configured before any logger objects are created.
      `)
    }
    if(enable === false) return;
    if(level) SkelfLogger.options.level = level;
    else SkelfLogger.options.level = "warn";

    const levelNumber = levelStringToNumber(SkelfLogger.options.level);

    if(levelNumber >= 5){
      if(verbose) SkelfLogger.options.verbose = verbose;
      else SkelfLogger.options.verbose = (message : string) => console.log(message);
    }
    if(levelNumber >= 4){
      if(log) SkelfLogger.options.log = log;
      else SkelfLogger.options.log = (message : string) => console.log(message);
    }

    if(levelNumber >= 3){
      if(warn) SkelfLogger.options.warn = warn
      else if(log) SkelfLogger.options.warn = log
      else SkelfLogger.options.warn = (message : string) => console.warn(message);
    }

    if(levelNumber >= 2){
      if(error) SkelfLogger.options.error = error
      else if(log) SkelfLogger.options.error = error
      else SkelfLogger.options.error = (message : string) => console.error(message);
    }

    SkelfLogger.options.colors = colors ?? false;

    SkelfLogger.isConfigured = true;
  }

  constructor(private scope : string){}

  verbose(message : string){
    if(!SkelfLogger.options.verbose) return;
    if(!SkelfLogger.isConfigured) SkelfLogger.configure({});
    SkelfLogger.options.verbose(logify(message,this.scope,"say",SkelfLogger.options.colors!))
  }
  log(message : string){
    if(!SkelfLogger.options.log) return;
    if(!SkelfLogger.isConfigured) SkelfLogger.configure({});
    SkelfLogger.options.log(logify(message,this.scope,"log",SkelfLogger.options.colors!));
  }

  warn(message : string){
    if(!SkelfLogger.options.warn) return;
    if(!SkelfLogger.isConfigured) SkelfLogger.configure({});
    SkelfLogger.options.warn(logify(message,this.scope,"warn",SkelfLogger.options.colors!));
  }

  error(message : string){
    if(!SkelfLogger.options.error) return;
    if(!SkelfLogger.isConfigured) SkelfLogger.configure({});
    SkelfLogger.options.error(logify(message,this.scope,"error",SkelfLogger.options.colors!));
  }
}

function levelStringToNumber(levelString : string){
  switch(levelString){
  case "verbose": return 5;
  case "log": return 4;
  case "warn": return 3;
  case "error": return 2;
  case "quiet": return 1;
  default:
    throw new InvalidArgumentError(`level "${levelString}" for skelf logger is not defined.`)
  }
}

function logify(message : string, scope : string, level : string,colors : boolean){
  const levelColor = getLevelColor(level);
  const scopeColor = getScopeColor(scope);
  scope = `(${scope})`
  const nc = "\x1b[0m"
  return `${colors?"\x1b[90m":""}[${new Date().toISOString()}]${colors?nc:""} ` +
        `${colors?scopeColor:""}${scope.padEnd(9,' ')}${colors?nc:""} ` +
        `${colors?levelColor:""}${level.toUpperCase().padEnd(5,' ')}${colors?nc:""}: ` +
        `${colors&&level==="say"?levelColor:""}${groom(message)}${colors?nc:""}`
}


function getScopeColor(scope : string){
  if(scope === "space") return "\x1b[34m";
  if(scope === "rstream") return "\x1b[94m";
  if(scope === "wstream") return "\x1b[35m";
  if(scope === "type") return "\x1b[32m";
  if(scope === "struct") return "\x1b[33m"
  return "\x1b[36m"
}

function getLevelColor(level : string){
  if(level === "say") return "\x1b[97m"
  if(level === "log") return "\x1b[0m"
  if(level === "warn") return "\x1b[33m"
  if(level === "error") return "\x1b[31m"
  return ""
}

export default SkelfLogger
