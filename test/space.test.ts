import {
  SkelfSpace
} from "skelf/space"

import {
  SpaceIsNotReadyError,
  SpaceInitializedTwiceError,
  LockedSpaceError,
  SpaceIsClosedError,
  SpaceClosedTwiceError,
  ReadOutsideSpaceBoundaryError,
  WriteOutsideSpaceBoundaryError
} from "skelf/errors"
import {convertToSkelfBuffer} from "skelf/utils"



class DummySpace extends SkelfSpace {
  name = "dummySpace";
  initWasCalled = false;
  initWasCalledTwice = false;
  closeWasCalled = false;
  closeWasCalledTwice = false;
  latestReadRequest!  : {size : number, offset: number};
  latestWriteRequest! : {buffer : ArrayBuffer, offset: number}
  override async _init(){
    if(this.initWasCalled) this.initWasCalledTwice = true;
    this.initWasCalled = true;
  }
  override async _close(){
    if(this.closeWasCalled) this.closeWasCalledTwice = true;
    this.closeWasCalled = true;
  }
  async _read(size : number, offset: number){
    this.latestReadRequest = {size,offset};
    return new ArrayBuffer(size);
  }
  async _write(buffer : ArrayBuffer, offset: number){
    this.latestWriteRequest = {buffer,offset};
  }
}

class DummyArraySpace extends SkelfSpace {
  name ="dummyArraySpace";
  array = new Array(255).fill(null).map((_,index)=>index);
  async _read(size : number, offset : number){
    if(offset > 255) return null;
    return new Uint8Array(this.array.slice(offset,offset+size)).buffer;
  }
  async _write(buffer : ArrayBuffer, offset : number){
    if(offset + buffer.byteLength > 255) return null;
    [...new Uint8Array(buffer)].forEach((num,index)=> this.array[offset+index] = num);
    return true;
  }
}

let space = new DummySpace();
beforeEach(()=>{
  space = new DummySpace();
})
describe("ready flag",()=>{
  test("ready flag is handled properly",async ()=>{
    expect(space.ready).toBe(false);
    await space.init();
    expect(space.ready).toBe(true);
  })
  test("throws when initializing twice",async ()=>{
    await space.init();
    expect(async ()=> space.init()).rejects.toThrow(SpaceInitializedTwiceError);
  })
  describe("throws when not ready",()=>{
    test("read method throws when not ready",async ()=>{
      expect(async ()=> space.read(5,5)).rejects.toThrow(SpaceIsNotReadyError);
    })
    test("write method throws when not ready",async ()=>{
      expect(async ()=> space.write(new ArrayBuffer(5),5)).rejects.toThrow(SpaceIsNotReadyError)
    })
    test("close method throws when not ready",async ()=>{
      expect(async ()=> space.close()).rejects.toThrow(SpaceIsNotReadyError);
    })
  })
  test("_init() method is called once",async ()=>{
    await space.init();
    expect(space.initWasCalled).toBe(true);
    expect(space.initWasCalledTwice).toBe(false);
  })

})
describe("locked flag",()=>{
  describe("locked flag is handled properly",()=>{
    test("locked is false by default",async ()=>{
      expect(space.locked).toBe(false);
      await space.init();
      expect(space.locked).toBe(false);
    })
    test("locked is handeled properly with write method",async ()=>{
      await space.init();
      const promise = space.write(new ArrayBuffer(5),2) // this is intentionaly not awaited
      expect(space.locked).toBe(true);
      await promise;
      expect(space.locked).toBe(false);
    })
    test("locked is handeled properly with read method",async ()=>{
      await space.init();
      const promise = space.read(5,5); // this is intentionaly not awaited
      expect(space.locked).toBe(true);
      await promise;
      expect(space.locked).toBe(false);
    })
  })
  describe("throws when locked",()=>{
    beforeEach(async ()=>await space.init())
    test("read method throws when space is locked",async ()=>{
      space.read(5,5); // this is intentionaly not awaited
      expect(async () => space.read(5,5)).rejects.toThrow(LockedSpaceError)
    })
    test("write method throws when space is locked",async ()=>{
      space.read(5,5); // this is intentionaly not awaited
      expect(async () => space.write(new ArrayBuffer(5),5)).rejects.toThrow(LockedSpaceError)
    })
    test("close method throws when space is locked",async ()=>{
      space.read(5,5); // this is intentionaly not awaited
      expect(async () => space.close()).rejects.toThrow(LockedSpaceError)
    })
  })
})

describe("closed flag",()=>{
  beforeEach(async ()=>await space.init())
  test("closed flag is handled properly",async ()=>{
    expect(space.closed).toBe(false);
    await space.close();
    expect(space.closed).toBe(true);
  })
  test("throws when closing twice",async ()=>{
    await space.close();
    expect(async ()=> space.close()).rejects.toThrow(SpaceClosedTwiceError)
  })
  describe("thrown when closed",()=>{
    beforeEach(async ()=>{
      await space.close();
    })
    test("read method throws when space is closed",async ()=>{
      expect(async () => space.read(5,5)).rejects.toThrow(SpaceIsClosedError)
    })
    test("write method throws when space is closed",async ()=>{
      expect(async () => space.write(new ArrayBuffer(5),5)).rejects.toThrow(SpaceIsClosedError)
    })
  })
  test("_close() method is called once",async ()=>{
    expect(space.closeWasCalled).toBe(false);
    await space.close();
    expect(space.closeWasCalled).toBe(true);
    expect(space.closeWasCalledTwice).toBe(false);
  })

})

describe("reading",()=>{
  describe("_read method is called with correct arguments",() =>{
    beforeEach(async ()=> space.init());
    const cases = [
      [10,0,10,0],
      [1,2,1,2],
      [5,6,5,6],
      ["1b",0,1,0],
      ["7b",0,1,0],
      ["7b","1b",1,0],
      [1,"1b",2,0],
      ["14b",0,2,0],
      ["3B","4b",4,0],
      ["1b","120B",1,120],
      [5,"81b",6,10]
    ] as const;
    test.each(cases)("#%# read(%p, %p) should call _read(%p, %p)",async (iSize,iOffset,oSize,oOffset)=>{
      await space.read(iSize,iOffset);
      expect(space.latestReadRequest).toEqual({size: oSize, offset: oOffset});
    })
  })
  describe("read method returns the correct buffer",()=>{
    let space = new DummyArraySpace();
    beforeEach(async ()=> {
      space = new DummyArraySpace();
      await space.init()
    });

    const cases = [
      [1,0,                        [0],1,0 ],
      [1,1,                        [1],1,0 ],
      [1,44,                       [44],1,0 ],
      [5,10,                       [10,11,12,13,14],5,0 ],
      [15,2,                       [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],15,0],
      ["2b","2b",                  [0x00],0,2],
      ["2b",{bytes: 120,bits: 2},  [0x03],0,2],
      ["1b","15b",                 [0x01],0,1],
      ["3b",1,                     [0x00],0,3],
      ["3b",140,                   [0x04],0,3],
      ["12b",{bytes: 200, bits: 4},[0x8c,0x09],1,4],
      [1,{bytes: 150,bits: 5},     [0xd2],1,0]
    ] as const;
    test.each(cases)("#%# read(%p,%p) => %p",async (size,offset,expectedResult,resultBytes,resultBits)=>{
      const result = await space.read(size,offset);
      //console.log({result,expectedResult})
      expect(compareBuffers(result,new Uint8Array(expectedResult).buffer)).toBe(true);
      expect(result.size).toEqual({bytes : resultBytes, bits: resultBits})
    })
  })
  describe("read method handles out of boundary responses correctly",()=>{
    let space = new DummyArraySpace();
    beforeEach(async ()=> {
      space = new DummyArraySpace();
      await space.init()
    });
    const cases = [
      [1,255],
      [2,254],
      [55,250],
      [0,256],
      [20,500],
      [100,240]
    ];
    test.each(cases)("#%# for read(#d,#d) should throw out of boundary",(size,offset)=>{
      expect(async ()=> space.read(size,offset)).rejects.toThrow(ReadOutsideSpaceBoundaryError)
    })
  })
})

describe("writing",()=>{
  let space = new DummyArraySpace();
  beforeEach(async ()=> space = await new DummyArraySpace().init())
  describe("write ArrayBuffers correctly",()=>{
    const cases = [
      [[0,1,2,3],0,                            [0,1,2,3],0],
      [[5,7,9,20,44],20,                       [5,7,9,20,44],20],
      [[0xf0,0xf0,0xf0,0xf0],"4b",             [0x0f,0x0f,0x0f,0x0f,0x04],0],
      [[0x09,0x10,0xaa],{bytes: 240, bits: 5}, [0xf0,0x48,0x85,0x53],240]
    ] as const;
    test.each(cases)(
      "#%# write %p to offset %p",
      async (array,offset,expectedResult,checkOffset)=>{
        await space.write(new Uint8Array(array).buffer,offset);
        expect(space.array.slice(checkOffset,checkOffset+expectedResult.length)).toEqual(expectedResult);
      }
    )
  })
  describe("write SkelfBuffers correctly",()=>{
    const cases = [
      [[0,1,2,3],4,0,0,                           [0,1,2,3],0],
      [[0x0f],0,4,"4b",                           [0x0f,0x01],0],
      [[0xaa,0xa0],2,0,"5b",                      [0x05,0x55,0x02],0],
      [[0xfa,0x0b],1,4,"13b",                     [0x07,0xd5,0x83],1],
      [[0xfa,0x0b],1,4,"13b",                     [0x07,0xd5,0x83],1],
      [[0xf0,0x52,0x0c],2,3,{bytes: 80, bits: 3}, [0x5e,0x0a,0x52,0x53],80]
    ] as const;
    test.each(cases)(
      "#%# write %p with %p bytes and %p bits to offset %p",
      async (array,bytes,bits,offset,expectedResult,checkOffset)=>{
        await space.write(convertToSkelfBuffer(new Uint8Array(array).buffer,{bytes,bits}),offset);
        expect(space.array.slice(checkOffset,checkOffset+expectedResult.length)).toEqual(expectedResult);
      }
    )
  })
  describe("write method handles out of boundary responses correctly",()=>{
    let space = new DummyArraySpace();
    beforeEach(async ()=> {
      space = new DummyArraySpace();
      await space.init()
    });
    const cases = [
      [10,255],
      [2,254],
      [55,250],
      [0,256],
      [20,500],
      [100,240]
    ];
    test.each(cases)("#%# for write(#d,#d) should throw out of boundary",(size,offset)=>{
      expect(
        async ()=> space.write(new Uint8Array(size).buffer,offset)
      ).rejects.toThrow(WriteOutsideSpaceBoundaryError)
    })
  })
})

function compareBuffers(buf1 : ArrayBuffer, buf2 : ArrayBuffer){
  if (buf1.byteLength != buf2.byteLength) return false;
  var dv1 = new Uint8Array(buf1);
  var dv2 = new Uint8Array(buf2);
  for (var i = 0 ; i != buf1.byteLength ; i++){
    if (dv1[i] != dv2[i]) return false;
  }
  return true;
}
