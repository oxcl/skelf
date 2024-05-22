import {Offset} from "skelf/types"
import {
  mergeBytes,
  copyBuffer,
  cloneBuffer,
  shiftUint8ByBits,
  OffsetBlock,
  offsetToBlock
} from "skelf/utils"

import {
  InvalidArgumentError,
  OutOfRangeError
} from "skelf/errors"

describe('utils.mergeBytes()',()=>{
  const cases : [[number,number,number],number][] = [
    [[0xFF,0x95,0],    0x95],
    [[0x00,0x00,0],    0x00],
    [[0x82,0x0A,1],    0x8A],
    [[0x8C,0x3C,1],    0xBC],
    [[0x6F,0x13,3],    0x73],
    [[0xF0,0x0F,4],    0xFF],
    [[0x40,0x04,4],    0x44],
    [[0x90,0x02,4],    0x92],
    [[0x88,0x07,5],    0x8F],
    [[0x49,0x00,7],    0x48],
    [[0x00,0xFF,8],    0x00],
    [[0xD5,0x00,8],    0xD5],
    [[0x00,0x00,8],    0x00],
    [[0xFF,0x00,8],    0xFF],
  ] as const;
  test.each(cases)('#%# given %j as input %d is returned',(input,output)=>{
    expect(mergeBytes(...input)).toBe(output);
  })
  test('throws on invalid input',()=>{
    expect(()=>mergeBytes(0xFF,0xFF,10)).toThrow(InvalidArgumentError);
    expect(()=>mergeBytes(0xFF,0xFF,-5)).toThrow(InvalidArgumentError);
  })
})

describe('utils.copyBuffer()',()=>{
  describe(`throws on invalid inputs`,() => {

    const source = new ArrayBuffer(5);
    const target = new ArrayBuffer(5);

    test("throws with invalid offset",()=>{
      expect(()=> copyBuffer(source,target,-1,4,0)).toThrow(InvalidArgumentError);
      expect(()=> copyBuffer(source,target,5,4,0)).toThrow(OutOfRangeError);
    })

    test("throws with invalid length",()=>{
      expect(()=> copyBuffer(source,target,0,-1,0)).toThrow(InvalidArgumentError);
    })

    test("throws with invalid chunk size",()=>{
      expect(()=> copyBuffer(source,target,2,4,0)).toThrow(OutOfRangeError);
      expect(()=> copyBuffer(source,target,0,6,0)).toThrow(OutOfRangeError);
      expect(()=> copyBuffer(source,target,2,3,0)).not.toThrow(OutOfRangeError);
    })

    test("throws with invalid position",()=>{
      expect(()=> copyBuffer(source,target,0,3,5)).toThrow(OutOfRangeError);
      expect(()=> copyBuffer(source,target,0,1,5)).toThrow(OutOfRangeError);

      expect(()=> copyBuffer(source,target,2,2,-1)).toThrow(OutOfRangeError);
      expect(()=> copyBuffer(source,target,2,3,3)).toThrow(OutOfRangeError);

      expect(()=> copyBuffer(source,target,0,0,5)).not.toThrow(OutOfRangeError);
      expect(()=> copyBuffer(source,target,2,0,5)).not.toThrow(OutOfRangeError);

    })
  })
  describe(`copies to target buffer correctly`,()=>{
    // sourceArray,destinationArray,offset,length,position
    const cases : [number[],number[],number,number,number][] = [
      [
        [0,1,2,3,4,5,6,7,8,9,10],
        [0,1,2,3,4,5,6,7,8,9,10],
        0,10,0
      ],
      [
        [255,35,0,50],
        [255,35,0,50,0,0,0,0],
        0,4,0
      ],
      [
        [1,2,3,4,5,6,7,8,9,10,11,12],
        [1,2,3],
        0,3,0
      ],
      [
        [1,2,3,4,5,6,7,8,9,10,11,12],
        [7,8,9],
        6,3,0
      ],
      [
        [1,2,3,4,5,6,7,8,9,10],
        [0,0,1,2,3],
        0,3,2
      ],
      [
        [1,2,3,4,5,6,7,8,9,10],
        [0,0,0,0,0,0,0,5,6,7,8],
        4,4,7
      ],
      [
        [1,2,5,7],
        [1,2,5,7],
        0,4,0
      ],
      [
        new Array(20).fill(null).map((item,index)=>index),
        new Array(20).fill(null).map((item,index)=>index),
        0,20,0
      ],
      [
        new Array(100).fill(null).map((item,index)=>index % 255),
        new Array(100 + 50).fill(null).map((item,index)=>index < 50 ? 0 : (index - 50) % 255),
        0,100,50
      ],
      [
        new Array(1024 * 1024).fill(null).map((item,index)=>index % 255),
        new Array(1024 * 1024 + 500).fill(null).map((item,index)=>index < 500 ? 0 : (index - 500) % 255),
        0,1024 * 1024,500
      ],
    ] as const;
    test.each(cases)(`#%# copies source to buffer correctly`,(sourceArr,targetArr,offset,length,pos)=>{
      const source = new Uint8Array(sourceArr).buffer;
      const target = new ArrayBuffer(targetArr.length);
      copyBuffer(source,target,offset,length,pos);
      expect([...new Uint8Array(target)].every((item,index) => item === targetArr[index])).toBe(true)
    })
  })
})

describe("utils.cloneBuffer()",() => {
  const cases = [0,5,100,1024,1024*1024].map((size)=>[
    size,
    new Uint8Array(new Array(size).fill(null).map((item,index)=>index))
  ]) as [number,Uint8Array][];
  test.each(cases)(`#%# clone buffer of size %d`,(size,uint8)=>{
    expect(
      [...new Uint8Array(cloneBuffer(uint8.buffer))].every((item,index)=> item === uint8[index])
    ).toBe(true);
  })
})

describe("utils.shiftUint8ByBits()",()=>{
  test("throws on invalid input",()=>{
    expect(()=> shiftUint8ByBits(new Uint8Array(5),-10)).toThrow(InvalidArgumentError)
    expect(()=> shiftUint8ByBits(new Uint8Array(5),10)).toThrow(InvalidArgumentError)
    expect(()=> shiftUint8ByBits(new Uint8Array(0),5)).toThrow(InvalidArgumentError)
    expect(()=> shiftUint8ByBits(new Uint8Array(0),0)).not.toThrow()
    expect(()=> shiftUint8ByBits(new Uint8Array(5),0)).not.toThrow()
  })

  const cases : [number,number,number[],number[]][] = [
    [
      -1, 0x01,
      [0xab,0xcd,0xef],
      [0x57,0x9b,0xde]
    ],
    [
      -4, 0x00,
      [0x00,0x00,0x0F],
      [0x00,0x00,0xF0]
    ],
    [
      -7, 0x00,
      [0x00,0x00,0xFF],
      [0x00,0x7F,0x80]
    ],
    [
      1, 0x80,
      [0xab,0xcd,0xef],
      [0x55,0xe6,0xf7]
    ],
    [
      4, 0xf0,
      [0x01,0xaa,0xdf],
      [0x00,0x1a,0xad]
    ],
    [
      7, 0x98,
      [0x00,0x00,0xaa,0xbb,0xcc],
      [0x00,0x00,0x01,0x55,0x77]
    ]
  ] as const;

  test.each(cases)(`#%# shift by %d bits`,(shift,overflow,before,after)=>{
    const uint8 = new Uint8Array(before);
    const actualOverflow = shiftUint8ByBits(uint8,shift);
    expect([...uint8].every((item,index)=>item === after[index])).toBe(true);
    expect(actualOverflow).toBe(overflow);
  })
})

describe("utils.OffsetBlock",()=>{
  describe("constructor()",()=>{
    const cases : [number,number,number,number][] = [
      [20,5,20,5],
      [5,18,7,2],
      [-5,24,-2,0],
      [0,80,10,0],
      [50,-4,49,4],
    ] as const;
    test.each(cases)(`#%# OffsetBlock(%d,%d) should be %d bytes, %d bits`,(iBytes,iBits,oBytes,oBits)=>{
      expect(new OffsetBlock(iBytes,iBits)).toEqual({bytes: oBytes, bits: oBits})
    })
  })
  describe("incrementByBits()",()=>{
    let offset = new OffsetBlock();
    const cases : [number,number,number][] = [
      [1,4,0],
      [3,4,2],
      [-5,3,2],
      [-7,3,0],
      [-14,2,1]
    ] as const;

    test.each(cases)(`#%# (3,7) incremented by %d bits is (%d,%d)`,(inc,bytes,bits)=>{
      const offset = new OffsetBlock(3,7);
      offset.incrementByBits(inc);
      expect(offset.bytes).toBe(bytes);
      expect(offset.bits).toBe(bits);
    })
  })
})

describe("utils.offsetToBlock()",()=>{
  const cases : [Offset,number,number][] = [
    ["50b",6,2],
    ["12 B",12,0],
    ["1kb",125,0],
    ["1kB",1024,0],
    ["3 KB",3 * 1024,0],
    ["3 Bytes",3,0],
    ["12 bits",1,4],
    ["128 Bytes",128,0],
    [50,50,0],
    ["40 killobytes",40 * 1024,0],
    [{bytes : 5, bits : 3},5,3]
  ] ;
  test.each(cases)("#%# offset %j is %d bytes and %d bits",(offset,bytes,bits)=>{
    expect(offsetToBlock(offset)).toEqual(new OffsetBlock(bytes,bits))
  })
})
