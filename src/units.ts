const bit       = 1;
const b         = bit;

const byte      = 8;
const B         = byte;

const killobit  = 1024;
const Kb        = killobit;

const killobyte = byte * 1024;
const KB        = killobyte;

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
