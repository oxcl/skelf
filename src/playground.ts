import {NodeFileSpace} from "skelf/node"
import {createStruct,primitives} from "skelf"

const space = await new NodeFileSpace("test.txt").init();

const personStruct = createStruct("person",{
  name: primitives.dynamicString(primitives.int8),
  age : primitives.int8,
  role : primitives.cstring
})

const companyStruct = createStruct("company",{
  name : primitives.fixedString(255,"\0"),
  hasPhone : primitives.bool,
  phoneNumber : (struct)=>{
    if(struct.hasPhone) return primitives.fixedString(10)
    else return undefined
  },
  manager : personStruct,
  workers : primitives.dynamicArray(primitives.int8,personStruct),
  endMark : primitives.constString("END")
})


const ali = {
  name : "ali",
  age : 20,
  role : "ceo"
}

const john = {
  name : "john smith",
  age : 18,
  role : "programmer"
}

const sarah = {
  name : "sarah saharrah",
  age: 32,
  role : "sales"
}

const company = {
  name : "acme corp",
  hasPhone : false,
  phoneNumber : undefined,
  manager: ali,
  workers: [john,sarah],
  endMark : "END"
}

await companyStruct.write(company,space);



await space.close();
