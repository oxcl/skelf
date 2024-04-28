import {LoggerConfiguredTwiceError,InvalidArgumentError} from "skelf/errors"
import {groom} from "skelf/utils"
export class Logger {
  private static options : LoggerConfiguration = {};
  private static isConfigured : boolean = false;
  static configure(options : LoggerConfiguration){
    if(Logger.isConfigured){
      throw new LoggerConfiguredTwiceError(`
        trying to configure skelf logger twice. skelf logger can be configured only once and it must be
        configured before any logger objects are created.
      `)
    }
    if(options.enable === false) return;
    if(options.level) Logger.options.level = options.level;
    else Logger.options.level = "warn";

    const levelNumber = levelStringToNumber(Logger.options.level);

    if(levelNumber >= 5){
      if(options.verbose) Logger.options.verbose = options.verbose;
      else Logger.options.verbose = (message : string) => console.log(message);
    }
    if(levelNumber >= 4){
      if(options.log) Logger.options.log = options.log;
      else Logger.options.log = (message : string) => console.log(message);
    }

    if(levelNumber >= 3){
      if(options.warn) Logger.options.warn = options.warn
      else if(options.log) Logger.options.warn = options.log
      else Logger.options.warn = (message : string) => console.warn(message);
    }

    if(levelNumber >= 2){
      if(options.error) Logger.options.error = options.error
      else if(options.log) Logger.options.error = options.error
      else this.options.error = (message : string) => console.error(message);
    }

    Logger.options.colors = options.colors ?? false;

    Logger.isConfigured = true;
  }

  constructor(private scope : string){
  }

  verbose(message : string){
    if(!Logger.options.verbose) return;
    if(!Logger.isConfigured) Logger.configure({});
    Logger.options.verbose(logify(message,this.scope,"say",Logger.options.colors!))
  }
  log(message : string){
    if(!Logger.options.log) return;
    if(!Logger.isConfigured) Logger.configure({});
    Logger.options.log(logify(message,this.scope,"log",Logger.options.colors!));
  }

  warn(message : string){
    if(!Logger.options.warn) return;
    if(!Logger.isConfigured) Logger.configure({});
    Logger.options.warn(logify(message,this.scope,"warn",Logger.options.colors!));
  }

  error(message : string){
    if(!Logger.options.error) return;
    if(!Logger.isConfigured) Logger.configure({});
    Logger.options.error(logify(message,this.scope,"error",Logger.options.colors!));
  }
}

interface LoggerConfiguration {
  enable ?: boolean;
  verbose ?: (message : string) => void;
  log ?: (message : string) => void;
  warn ?: (message : string) => void;
  error ?: (message : string) => void;
  level ?: "verbose" | "warn" | "error" | "quiet";
  colors ?: boolean;
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

export default Logger
