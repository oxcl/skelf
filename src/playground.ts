import {int,int8,uint,ArraySpace,float32,float64,cstring,dynamicString,createStruct} from "skelf";
import {NodeFileSpace} from "skelf/node"

const space = await new NodeFileSpace("test.txt").init();

const personStruct = createStruct("person",{
  name: dynamicString(int8),
  age : int8
})

const companyStruct = createStruct("company",{
  name : dynamicString(int8),
  type : int8,
  body : (struct)=> Math.random() > 0.5 ? dynamicString(int8) : int8,
  ceo: personStruct,
  rank: int8
})

//const company = {
//  name : "alfa",
//  type : int8,
//  ceo : {
//    name : "ronagh",
//    age : 5
//  },
//  rank: 1
//}
//
//await companyStruct.write(company,space);

await space.close();
