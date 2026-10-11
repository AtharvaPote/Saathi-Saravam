import type { Profile, State } from './domain';
const text={type:'string',minLength:1,maxLength:100};
const number={type:'number',minimum:0,maximum:1000000};
const positive={type:'number',exclusiveMinimum:0,maximum:1000000};
const unit={type:'string',enum:['kg','litres','packs','pieces','boxes','cartons']};
const object=(properties:Record<string,unknown>,required:string[])=>({type:'object',properties,required,additionalProperties:false});
// This catalog is returned to API clients and sent unchanged to Sarvam as function tools.
export const actionDefinitions=[
 {name:'prepare_inventory',actionType:'inventory',profiles:['shop'],description:'Prepare a stock change for user review, NEVER execute it. mode add means newly received stock; mode set means an explicit absolute stock count. Send known fields only. For new cartons/boxes omit unknown baseUnit/unitsPerPack so the server asks the user. Never guess package size or price. To answer the current inventory follow-up, preserve its item/mode and omit unchanged fields. The server manages draft identifiers; do not supply one.',parameters:object({mode:{type:'string',enum:['add','set']},item:text,quantity:number,unit,baseUnit:unit,unitsPerPack:{type:'number',exclusiveMinimum:0,maximum:100000},price:{type:'number',minimum:0,maximum:100000}},['mode','item'])},
 {name:'prepare_price',actionType:'price',profiles:['shop'],description:'Prepare an explicitly requested selling-price change for an existing item. Price is per saved base unit. Requires confirmation.',parameters:object({item:text,price:number},['item','price'])},
 {name:'prepare_credit',actionType:'credit',profiles:['shop'],description:'Prepare ADDING an amount to a customer’s udhaar. Adds to the current balance, never replaces it. Requires confirmation.',parameters:object({customer:text,amount:positive,note:{type:'string',maxLength:200}},['customer','amount'])},
 {name:'prepare_payment',actionType:'payment',profiles:['shop'],description:'Prepare recording a received payment, subtracting from outstanding udhaar. Requires confirmation.',parameters:object({customer:text,amount:positive},['customer','amount'])},
 {name:'prepare_sale',actionType:'sale',profiles:['shop'],description:'Prepare a bill for an existing item. Quantity is in its saved base unit and the saved selling price is used. Ask for customer if missing. Stock decreases only after confirmation.',parameters:object({item:text,quantity:positive,customer:text},['item','quantity','customer'])},
 {name:'prepare_task',actionType:'task',profiles:['shop','farm'],description:'Prepare a dated task. Ask for a missing date, or resolve relative dates using today in India. Requires confirmation.',parameters:object({title:text,date:{type:'string',description:'YYYY-MM-DD'}},['title','date'])},
 {name:'prepare_task_status',actionType:'task_status',profiles:['shop','farm'],description:'Prepare completing or reopening an existing task using its exact ID. Requires confirmation.',parameters:object({id:text,done:{type:'boolean'}},['id','done'])},
 {name:'prepare_appointment',actionType:'appointment',profiles:['shop'],description:'Prepare a clinic or salon booking for confirmation. Time is India time. This saves a record only; it does not place a call or notify anyone.',parameters:object({customer:text,service:text,date:{type:'string',description:'YYYY-MM-DD'},time:{type:'string',description:'HH:mm in IST'}},['customer','service','date','time'])},
] as const;
export function toolsFor(profile:Profile){return [
 {type:'function',function:{name:'read_inventory',description:'Read the current inventory, base units, saved carton/box sizes and selling prices. Read only.',parameters:object({query:{type:'string',maxLength:100}},[])}},
 ...actionDefinitions.filter(d=>d.profiles.some(p=>p===profile)).map(d=>({type:'function',function:{name:d.name,description:d.description,parameters:d.parameters}})),
].filter(t=>profile==='shop'||t.function.name!=='read_inventory');}
export function actionFromTool(name:string,args:unknown,profile:Profile,context?:State,utterance=''){
 const definition=actionDefinitions.find(d=>d.name===name&&d.profiles.some(p=>p===profile));
 if(!definition||!args||typeof args!=='object'||Array.isArray(args))throw new Error('Saathi requested an unsupported action. Nothing was changed.');
 if('type' in args)throw new Error('Invalid tool arguments.');
 const action:any={...args,type:definition.actionType};
 if(action.type==='inventory'){
  // Workflow IDs belong to the server, never to model-generated arguments.
  delete action.draftId;
  const draft=context?.inventoryDraft;
  const normalized=(value:unknown)=>typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase():'';
  if(draft&&normalized(action.item)===normalized(draft.request.item)&&action.mode===draft.request.mode)action.draftId=draft.id;
  // Recover an explicitly spoken unit omitted by the model, never a guessed conversion.
  // Do not do this on a draft answer: '24 packs' describes packaging, not the original cartons.
  if(!action.draftId&&action.unit===undefined&&action.quantity!==undefined){const unit=explicitInventoryUnit(utterance);if(unit)action.unit=unit;}
 }
 return action;
}

export function explicitInventoryUnit(text:string){
 const patterns=[['kg','kg|kgs|kilo|kilos|kilogram|kilograms|किलो|किलोग्राम'],['litres','litre|litres|liter|liters|लीटर|लिटर'],['packs','pack|packs|packet|packets|पैक|पैकेट|पॅक'],['pieces','piece|pieces|पीस|नग'],['boxes','box|boxes|बॉक्स'],['cartons','carton|cartons|कार्टन']] as const;
 const matches=patterns.filter(([,words])=>new RegExp(`(?:^|[\\s\\d.,])(?:${words})(?=$|[\\s.,!?;।])`,'iu').test(text));
 return matches.length===1?matches[0][0]:undefined;
}
