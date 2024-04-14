export const bit       = 1;
export const b         = bit;

export const byte      = 8;
export const B         = byte;

export const char      = byte;
export const Char      = byte;
export const C         = byte;

export const short     = byte*2;
export const Short     = byte*2;
export const S         = byte*2;

export const int       = byte*4;
export const Int       = byte*4;
export const I         = byte*4;

export const long      = byte*8;
export const Long      = byte*8;
export const L         = byte*8;

export const killobit  = 1024;
export const Kb        = killobit;

export const killobyte = byte * 1024;
export const KB        = killobyte;

export const units = {
  bit,
  b,
  byte,
  B,
  killobit,
  Kb,
  killobyte,
  KB,
} as const;

export default units
