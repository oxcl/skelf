import {
  SkelfWriteStream
} from "skelf/write_stream"

import {
  convertToSkelfBuffer
} from "skelf/utils"

import {
  StreamInitializedTwiceError,
  LockedStreamError,
  StreamIsNotReadyError,
  StreamIsClosedError,
  StreamReachedWriteLimitError,
  StreamClosedTwiceError
} from "skelf/errors"

import {DummyWriteStream} from "skelf/core"

class DummyArrayStream extends SkelfWriteStream {
  name = "dummyStream";
  array : number[];
  offset = 0;
  get touched(){
    return this.array.slice(0,this.offset);
  }
  constructor(){
    super();
    this.array = new Array(100).fill(null).map((value,index) => 0xa5 + index)
  }
  override async _write(buffer : ArrayBuffer){
    for(const num of new Uint8Array(buffer)){
      this.array[this.offset++] = num;
    }
  }
}

let stream = new DummyWriteStream();
beforeEach(()=>{
  stream = new DummyWriteStream();
})

describe("ready flag",()=>{
  test("ready flag is handled properly",async ()=>{
    expect(stream.ready).toBe(false);
    await stream.init();
    expect(stream.ready).toBe(true);
  })
  test("throws when initializing twice",async ()=>{
    await stream.init();
    expect(async ()=> stream.init()).rejects.toThrow(StreamInitializedTwiceError);
  })
  describe("throws when not ready",()=>{
    test("write method throws when not ready",async ()=>{
      expect(async ()=> stream.write(new ArrayBuffer(5))).rejects.toThrow(StreamIsNotReadyError);
    })
    test("flush method throws when not ready",async ()=>{
      expect(async ()=> stream.flush()).rejects.toThrow(StreamIsNotReadyError);
    })
    test("close method throws when not ready",async ()=>{
      expect(async ()=> stream.close()).rejects.toThrow(StreamIsNotReadyError);
    })
  })
  test("_init() method is called once",async ()=>{
    await stream.init();
    expect(stream.initWasCalled).toBe(true);
    expect(stream.initWasCalledTwice).toBe(false);
  })
})
describe("locked flag",()=>{
  describe("locked flag is handled properly",()=>{
    test("locked is false by default",async ()=>{
      expect(stream.locked).toBe(false);
      await stream.init();
      expect(stream.locked).toBe(false);
    })
    test("locked is handled properly with write method",async ()=>{
      await stream.init();
      const promise = stream.write(new ArrayBuffer(5)); // this is intentionally not awaited
      expect(stream.locked).toBe(true);
      await promise;
      expect(stream.locked).toBe(false);
    })
    test("locked is handled properly with flush method",async ()=>{
      await stream.init();
      stream["cacheSize"] = 5;
      const promise = stream.flush(); // this is intentionally not awaited
      expect(stream.locked).toBe(true);
      await promise;
      expect(stream.locked).toBe(false);
    })
  })
  describe("throws when locked",()=>{
    beforeEach(async ()=> await stream.init())
    test("write method throws when stream is locked",async ()=>{
      stream.write(new ArrayBuffer(5)); // this is intentionally not awaited
      expect(async () => stream.write(new ArrayBuffer(5))).rejects.toThrow(LockedStreamError)
    })
    test("flush method throws when stream is locked",async ()=>{
      stream.write(new ArrayBuffer(5)); // this is intentionally not awaited
      expect(async () => stream.flush()).rejects.toThrow(LockedStreamError)
    })
    test("close method throws when stream is locked",async ()=>{
      stream.write(new ArrayBuffer(5)); // this is intentionally not awaited
      expect(async () => stream.close()).rejects.toThrow(LockedStreamError)
    })
  })
})

const cacheCases = [
//[size,byte,index]
  [0   ,0x00,0    ],
  [2   ,0x40,1    ],
  [5   ,0x98,2    ],
  [7   ,0xd6,3    ]
] as const;

const cases = [
//[bytes,bits,index,array]
  [0    ,1   ,0    ,[0x01]],
  [0    ,4   ,1    ,[0x0e]],
  [0    ,7   ,2    ,[0x8c]],
  [1    ,0   ,3    ,[0x66]],
  [1    ,3   ,4    ,[0x99,0x05]],
  [2    ,0   ,5    ,[0x00,0x43]],
  [3    ,7   ,6    ,[0x00,0xe9,0x01,0xff]]
] as const;


const expectedResults = [
  [
//  [cacheSize,cacheByte,expectedArray]
    [1        ,0x80     ,[]],
    [4        ,0xe0     ,[]],
    [7        ,0x18     ,[]],
    [0        ,0x00     ,[0x66]],
    [3        ,0xa0     ,[0x99]],
    [0        ,0x00     ,[0x00,0x43]],
    [7        ,0xfe     ,[0x00,0xe9,0x01]]
  ],
  [
    [3        ,0x60     ,[]],
    [6        ,0x78     ,[]],
    [1        ,0x00     ,[0x46]],
    [2        ,0x80     ,[0x59]],
    [5        ,0x68     ,[0x66]],
    [2        ,0xc0     ,[0x40,0x10]],
    [1        ,0x80     ,[0x40,0x3a,0x40,0x7f]]
  ],
  [
    [6        ,0x9c     ,[]],
    [1        ,0x00     ,[0x9f]],
    [4        ,0xc0     ,[0x98]],
    [5        ,0x30     ,[0x9b]],
    [0        ,0x00     ,[0x9c,0xcd]],
    [5        ,0x18     ,[0x98,0x02]],
    [4        ,0xf0     ,[0x98,0x07,0x48,0x0f]]
  ],
  [
    [0        ,0x00     ,[0xd7]],
    [3        ,0xc0     ,[0xd7]],
    [6        ,0x30     ,[0xd6]],
    [7        ,0xcc     ,[0xd6]],
    [2        ,0x40     ,[0xd7,0x33]],
    [7        ,0x86     ,[0xd6,0x00]],
    [6        ,0xfc     ,[0xd6,0x01,0xd2,0x03]]
  ]
];
describe.each(cacheCases)("writes correctly when %d bits are cached",(cacheSize,cacheByte,cacheIndex)=>{
  let stream = new DummyArrayStream();
  beforeEach(async ()=>{
    stream = await new DummyArrayStream().init();
    stream["cacheSize"] = cacheSize;
    stream["cacheByte"] = cacheByte;
  })
  test.each(cases)("#%# write %d bytes and %d bits",async (bytes,bits,index,array) => {
    const [
      expectedCacheSize,
      expectedCacheByte,
      expectedArray
    ] = expectedResults[cacheIndex][index];
    const buffer = convertToSkelfBuffer(new Uint8Array(array).buffer,{bytes,bits})
    await stream.write(buffer);
    expect(stream["cacheSize"]).toBe(expectedCacheSize)
    expect(stream["cacheByte"]).toBe(expectedCacheByte)
    expect(stream.touched).toEqual(expectedArray)
  })
})
