export const bit       = 1;
export const b         = bit;

export const byte      = 8;
export const B         = byte;

export const killobit  = 1024;
export const Kb        = killobit;

export const killobyte = 1024 * 8;
export const KB        = killobyte;

export const unit = {
  bit,
  b,
  byte,
  B,
  killobit,
  Kb,
  killobyte,
  KB,
} as const;



export default unit
