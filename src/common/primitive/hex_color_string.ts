import {createDataType,fixedString} from "skelf"

export const hexColorString = fixedString(7)

hexColorString.constraint = (value) => {
  if(value.search(/^#[a-fA-F0-9]{6}$/) == 0) return true;
  else return `value '${value}' does not meet the constraint for a hex color format`
}

export default hexColorString;
