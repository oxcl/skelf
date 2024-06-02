import {
  SkelfReadStream
} from "skelf/read_stream"

import {
  StreamInitializedTwiceError,
  StreamIsNotReadyError,
  LockedStreamError,
  StreamIsClosedError,
  StreamClosedTwiceError
} from "skelf/errors"

class DummyStream extends SkelfReadStream {
  name = "dummyStream";
  initWasCalled = false;
  initWasCalledTwice = false;
  closeWasCalled = false;
  closeWasCalledTwice = false;
  override async _init(){
    if(this.initWasCalled) this.initWasCalledTwice = true;
    this.initWasCalled = true;
  }
  override async _close(){
    if(this.closeWasCalled) this.closeWasCalledTwice = true;
    this.closeWasCalled = true;
  }
  async _read(size : number){
    return new ArrayBuffer(size);
  }
}

class DummyArrayStream extends SkelfReadStream {
  name = "dummyArrayStream";
  array : number[];
  latestReadRequestSize  : number | null = null;
  latestSkipRequestSize  : number | null = null;
  constructor(){
    super();
    this.array = new Array(100).fill(null).map((value,index)=> index + 0xaa)
  }
  override async _skip(size :number){
    this.array = this.array.slice(size)
    this.latestSkipRequestSize = size;
  }
  async _read(size : number){
    //console.log("at first of read bruv",{size},this.array)
    const result = this.array.slice(0,size)
    this.array = this.array.slice(size);
    this.latestReadRequestSize = size;
    return new Uint8Array(result).buffer;
  }
}

let stream = new DummyStream();
beforeEach(()=>{
  stream = new DummyStream();
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
    test("read method throws when not ready",async ()=>{
      expect(async ()=> stream.read(5)).rejects.toThrow(StreamIsNotReadyError);
    })
    test("skip method throws when not ready",async ()=>{
      expect(async ()=> stream.skip(5)).rejects.toThrow(StreamIsNotReadyError)
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
    test("locked is handled properly with skip method",async ()=>{
      await stream.init();
      const promise = stream.skip(5) // this is intentionally not awaited
      expect(stream.locked).toBe(true);
      await promise;
      expect(stream.locked).toBe(false);
    })
    test("locked is handled properly with read method",async ()=>{
      await stream.init();
      const promise = stream.read(5); // this is intentionally not awaited
      expect(stream.locked).toBe(true);
      await promise;
      expect(stream.locked).toBe(false);
    })
  })
  describe("throws when locked",()=>{
    beforeEach(async ()=>await stream.init())
    test("read method throws when stream is locked",async ()=>{
      stream.read(5); // this is intentionally not awaited
      expect(async () => stream.read(5)).rejects.toThrow(LockedStreamError)
    })
    test("skip method throws when stream is locked",async ()=>{
      stream.read(5); // this is intentionally not awaited
      expect(async () => stream.skip(5)).rejects.toThrow(LockedStreamError)
    })
    test("close method throws when stream is locked",async ()=>{
      stream.read(5); // this is intentionally not awaited
      expect(async () => stream.close()).rejects.toThrow(LockedStreamError)
    })
  })
})

describe("closed flag",()=>{
  beforeEach(async ()=>await stream.init())
  test("closed flag is handled properly",async ()=>{
    expect(stream.closed).toBe(false);
    await stream.close();
    expect(stream.closed).toBe(true);
  })
  test("throws when closing twice",async ()=>{
    await stream.close();
    expect(async ()=> stream.close()).rejects.toThrow(StreamClosedTwiceError)
  })
  describe("thrown when closed",()=>{
    beforeEach(async ()=>{
      await stream.close();
    })
    test("read method throws when stream is closed",async ()=>{
      expect(async () => stream.read(5)).rejects.toThrow(StreamIsClosedError)
    })
    test("skip method throws when stream is closed",async ()=>{
      expect(async () => stream.skip(5)).rejects.toThrow(StreamIsClosedError)
    })
  })
  test("_close() method is called once",async ()=>{
    expect(stream.closeWasCalled).toBe(false);
    await stream.close();
    expect(stream.closeWasCalled).toBe(true);
    expect(stream.closeWasCalledTwice).toBe(false);
  })
})
const cacheCases = [
  //  [cacheSize,cacheByte,index]
  [0        ,0x00     ,0    ],
  [1        ,0x01     ,1    ],
  [3        ,0x05     ,2    ],
  [7        ,0x5f     ,3    ]
];
const cases = [
  //  [bytes,bits,index]
  [0    ,1   ,0    ],
  [0    ,3   ,1    ],
  [0    ,5   ,2    ],
  [0    ,7   ,3    ],
  [1    ,0   ,4    ],
  [1    ,6   ,5    ],
  [3    ,0   ,6    ],
  [3    ,4   ,7    ],
] as const;
const expectedResults = [
  [
    //    [cacheSize,cacheByte,skipSize,readSize],
    [7        ,0x2a     ,null    ,1       ],
    [5        ,0x0a     ,null    ,1       ],
    [3        ,0x02     ,null    ,1       ],
    [1        ,0x00     ,null    ,1       ],
    [0        ,0x00     ,1       ,null    ],
    [2        ,0x03     ,1       ,1       ],
    [0        ,0x00     ,3       ,null    ],
    [4        ,0x0d     ,3       ,1       ],
  ],
  [
    [0        ,0x00     ,null    ,null    ],
    [6        ,0x2a     ,null    ,1       ],
    [4        ,0x0a     ,null    ,1       ],
    [2        ,0x02     ,null    ,1       ],
    [1        ,0x00     ,null    ,1       ],
    [3        ,0x03     ,1       ,1       ],
    [1        ,0x00     ,2       ,1       ],
    [5        ,0x0d     ,3       ,1       ],
  ],
  [
    [2        ,0x01     ,null    ,null    ],
    [0        ,0x00     ,null    ,null    ],
    [6        ,0x2a     ,null    ,1       ],
    [4        ,0x0a     ,null    ,1       ],
    [3        ,0x02     ,null    ,1       ],
    [5        ,0x0b     ,1       ,1       ],
    [3        ,0x04     ,2       ,1       ],
    [7        ,0x2d     ,3       ,1       ],
  ],
  [
    [6        ,0x1f     ,null    ,null    ],
    [4        ,0x0f     ,null    ,null    ],
    [2        ,0x03     ,null    ,null    ],
    [0        ,0x00     ,null    ,null    ],
    [7        ,0x2a     ,null    ,1       ],
    [1        ,0x00     ,null    ,1       ],
    [7        ,0x2c     ,2       ,1       ],
    [3        ,0x04     ,2       ,1       ]
  ]
] as const;

describe.each(cacheCases)("skips when %d bits are cached", (cacheSize,cacheByte,cacheIndex)=>{
  let stream = new DummyArrayStream();
  beforeEach(async ()=>{
    stream = await new DummyArrayStream().init();
    stream["cacheSize"] = cacheSize;
    stream["cacheByte"] = cacheByte;
  })
  test.each(cases)("#%# skips %d bytes and %d bits",async (skipBytes,skipBits,skipIndex)=>{
    const [
      expectedCacheSize,
      expectedCacheByte,
      expectedSkipSize,
      expectedReadSize
    ] = expectedResults[cacheIndex][skipIndex];
    await stream.skip({bytes: skipBytes, bits: skipBits})
    expect(stream["latestSkipRequestSize"]).toBe(expectedSkipSize)
    expect(stream["latestReadRequestSize"]).toBe(expectedReadSize)
    expect(stream["cacheSize"]).toBe(expectedCacheSize)
    expect(stream["cacheByte"]).toBe(expectedCacheByte)
  })
})

describe("reading",()=>{
  let stream = new DummyArrayStream();
  beforeEach(async ()=>{
    stream = await new DummyArrayStream().init();
  })
  const cacheCases = [
//  [cacheSize,cacheByte,index]
    [0        ,0x00     ,0    ],
    [1        ,0x01     ,1    ],
    [3        ,0x05     ,2    ],
    [7        ,0x5f     ,3    ]
  ];
  const cases = [
//  [bytes,bits,index]
    [0    ,1   ,0    ],
    [0    ,3   ,1    ],
    [0    ,5   ,2    ],
    [0    ,7   ,3    ],
    [1    ,0   ,4    ],
    [1    ,6   ,5    ],
    [3    ,0   ,6    ],
    [3    ,4   ,7    ],
  ] as const;
  const expectedResults = [
    [
//    [cacheSize,cacheByte,readSize,[result]],
      [7        ,0x2a     ,1       ,[0x01]],
      [5        ,0x0a     ,1       ,[0x05]],
      [3        ,0x02     ,1       ,[0x15]],
      [1        ,0x00     ,1       ,[0x55]],
      [0        ,0x00     ,1       ,[0xaa]],
      [2        ,0x03     ,2       ,[0xaa,0x2a]],
      [0        ,0x00     ,3       ,[0xaa,0xab,0xac]],
      [4        ,0x0d     ,4       ,[0xaa,0xab,0xac,0x0a]]
    ],
    [
      [0        ,0x00     ,null    ,[0x01]],
      [6        ,0x2a     ,1       ,[0x06]],
      [4        ,0x0a     ,1       ,[0x1a]],
      [2        ,0x02     ,1       ,[0x6a]],
      [1        ,0x00     ,1       ,[0xd5]],
      [3        ,0x03     ,2       ,[0xd5,0x15]],
      [1        ,0x00     ,3       ,[0xd5,0x55,0xd6]],
      [5        ,0x0d     ,4       ,[0xd5,0x55,0xd6,0x05]]
    ],
    [
      [2        ,0x01     ,null    ,[0x01]],
      [0        ,0x00     ,null    ,[0x05]],
      [6        ,0x2a     ,1       ,[0x16]],
      [4        ,0x0a     ,1       ,[0x5a]],
      [3        ,0x02     ,1       ,[0xb5]],
      [5        ,0x0b     ,2       ,[0xb5,0x15]],
      [3        ,0x04     ,3       ,[0xb5,0x55,0x75]],
      [7        ,0x2d     ,4       ,[0xb5,0x55,0x75,0x09]]
    ],
    [
      [6        ,0x1f     ,null    ,[0x01]],
      [4        ,0x0f     ,null    ,[0x05]],
      [2        ,0x03     ,null    ,[0x17]],
      [0        ,0x00     ,null    ,[0x5f]],
      [7        ,0x2a     ,1       ,[0xbf]],
      [1        ,0x00     ,1       ,[0xbf,0x15]],
      [7        ,0x2c     ,3       ,[0xbf,0x55,0x57]],
      [3        ,0x04     ,3       ,[0xbf,0x55,0x57,0x05]]
    ]
  ] as const;
  describe.each(cacheCases)("reads when %d bits are cached", (cacheSize,cacheByte,cacheIndex)=>{
    beforeEach(()=>{
      stream["cacheSize"] = cacheSize;
      stream["cacheByte"] = cacheByte;
    })
    test.each(cases)("#%# reads %d bytes and %d bits",async (bytes,bits,index)=>{
      const [
        expectedCacheSize,
        expectedCacheByte,
        expectedReadSize,
        expectedArray
      ] = expectedResults[cacheIndex][index];
      const result = await stream.read({bytes,bits})
      expect(stream["latestReadRequestSize"]).toBe(expectedReadSize)
      expect(stream["cacheSize"]).toBe(expectedCacheSize)
      expect(stream["cacheByte"]).toBe(expectedCacheByte)
      expect(new Uint8Array(result)).toEqual(new Uint8Array(expectedArray))
    })
  })
})
