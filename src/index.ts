import {NodeFileSpace} from "skelf/space/node"
import {IStruct,ISpace,Offset,IReadableStream,IWritableStream} from "skelf/types"
import {StreamInitializedTwiceError,LockedStreamError,StreamIsClosedError,StreamIsNotReadyError} from "skelf/errors"
import {offsetToBits} from "#utils"
import * as fs from "node:fs";

abstract class BaseReadableStream implements IReadableStream {
  abstract readonly name : string;

  #locked = true;
  get locked(){ return this.#locked }

  #ready = false;
  get ready(){ return this.#ready }

  #closed = false;
  get closed(){ return this.#closed }

  async init(){
    if(this.ready)
      throw new StreamInitializedTwiceError(`initializing stream '${this.name}' while already initialized.`);
    await this._init();
  }

  async close(){
    if(this.locked)
      throw new LockedStreamError(`
        trying to close stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending. or the stream might not be initialized yet.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        trying to close stream '${this.name}' while it's not initialized. spaces should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `)
    if(this.closed)
      throw new StreamIsClosedError(`trying to close space '${this.name}' while it's already closed.`)
    await this._close();
    this.#closed = true;
  }

  read(size : Offset,offset : Offset){
    if(this.locked)
      throw new LockedStreamError(`
        trying to read from stream '${this.name}' while it's locked. this could be caused by a not awaited call
        to a read/write method, which might be still pending. or the stream might not be initialized yet.
      `);
    if(!this.ready)
      throw new StreamIsNotReadyError(`
        trying to read from stream '${this.name}' while it's not initialized spaces should be first initialized
        with the init method before using them. this could be caused by a not awaited call to the init method.
      `);
    if(this.closed)
      throw new StreamIsClosedError(`trying to read from space '${this.name}' while it's already closed.`)
    this.#locked = true;

    this.#locked = false;
  }
}

export * from "skelf/space"
export * from "skelf/units"
export * from "skelf/types"
