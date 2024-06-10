import {ISkelfDataType,ISkelfSpace} from "skelf/types"
import {AsymmetricDataTypeError} from "skelf/errors"

function deepEqual(x : any, y : any) {
  if (x === y) {
    return true;
  }
  else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
    if (Object.keys(x).length != Object.keys(y).length)
      return false;

    for (var prop in x) {
      if (y.hasOwnProperty(prop))
        {
          if (! deepEqual(x[prop], y[prop]))
            return false;
        }
      else
        return false;
    }

    return true;
  }
  else
    return false;
}

export async function testDataTypeSymmetry<T>(
  dataType : ISkelfDataType<T>,
  space : ISkelfSpace,
  sample : T,
  testFunction : (one : any, two : any ) => boolean = deepEqual
){
  await dataType.write(sample,space)
  const result = await dataType.read(space)
  if(!testFunction(result,sample)){
    throw new AsymmetricDataTypeError(`
      data type ${dataType.name} is asymmetric for the provided sample value.
      sample: "${JSON.stringify(sample,null,2).slice(0,200)}".
      received: "${JSON.stringify(result,null,2).slice(0,200)}".
    `)
  }
}
