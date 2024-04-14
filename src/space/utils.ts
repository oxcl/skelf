import units from "skelf/units"
// shift a Uint8Array object by bits
export function shiftUint8ByBits(uint8 : Uint8Array, shift : number){
  if(shift === 0) return;
  let leftoverOfPrevByte = 0, leftoverOfThisByte = 0;
  if(shift > 0){
    for(let i = 0;i < uint8.byteLength; i++) {
      // get the bits that will be cut from the right of the this byte to add them to the next byte later
      leftoverOfThisByte = (uint8[i] << (8-shift)) & 0xFF;
      // shift the byte by bit shift to the right
      uint8[i] >>= shift;
      // add the left overs from the previous byte that was shifted to this byte
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
  else{
    shift = -shift;
    for(let i = uint8.byteLength-1; i >= 0; --i){
      leftoverOfThisByte = uint8[i] >> (8-shift);
      uint8[i] <<= shift;
      uint8[i] |= leftoverOfPrevByte;
      leftoverOfPrevByte = leftoverOfThisByte;
    }
  }
}

// copy a buffer into new buffer with optional expanded space at the end
export function cloneBuffer(buffer : ArrayBuffer,expand : number = 0){
  const clonedBuffer = new ArrayBuffer(buffer.byteLength + expand);
  const lengthDouble = Math.floor(clonedBuffer.byteLength / Float64Array.BYTES_PER_ELEMENT);

  const float64 = new Float64Array(buffer,0, lengthDouble)
  const resultArray = new Float64Array(clonedBuffer,0, lengthDouble);

  for (let i = 0; i < resultArray.length; i++)
     resultArray[i] = float64[i];

  // copying over the remaining bytes
  const uint8 = new Uint8Array(buffer, lengthDouble * Float64Array.BYTES_PER_ELEMENT)
  const remainingArray = new Uint8Array(clonedBuffer, lengthDouble * Float64Array.BYTES_PER_ELEMENT);

  for (let i = 0; i < remainingArray.length; i++)
     remainingArray[i] = uint8[i];

  return clonedBuffer;
}
