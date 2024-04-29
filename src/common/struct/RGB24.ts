import {createStruct,uint8} from "skelf"

export const RGB24 = createStruct("RGB24",{
  r : uint8,
  g : uint8,
  b : uint8
})

export default RGB24;
