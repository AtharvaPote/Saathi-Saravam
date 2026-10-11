import { z } from 'zod';
export type Profile = 'shop' | 'farm';
export const profiles = {
  shop: { name: 'Meena', fullName: 'Meena Sharma', business: 'Meena Kirana Store', email: 'shop@saathi.demo', location: 'Jaipur, Rajasthan', initials: 'MS' },
  farm: { name: 'Ramesh', fullName: 'Ramesh Patil', business: 'Patil Family Farm', email: 'farmer@saathi.demo', location: 'Nashik, Maharashtra', initials: 'RP' },
};
export const unitSchema = z.enum(['kg','litres','packs','pieces','boxes','cartons']);
export type Unit = z.infer<typeof unitSchema>;
const name = z.string().trim().min(1).max(100);
const amount = z.number().finite().positive().max(1000000);
const price = z.number().finite().min(0).max(100000);
const quantity = z.number().finite().min(0).max(1000000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Use a valid date');
export const farmStageSchema=z.enum(['planned','growing','harvested']);
export const farmCategorySchema=z.enum(['seeds','fertiliser','labour','irrigation','equipment','transport','other']);
const farmAmount=amount.refine(n=>Math.abs(n*100-Math.round(n*100))<0.000001,'Use at most two decimal places');
const farmArea=z.number().finite().positive().max(100000).refine(n=>Math.abs(n*10000-Math.round(n*10000))<0.000001,'Use at most four decimal places');
// Partial stock requests are allowed only at the planning boundary.
export const stockRequestSchema = z.object({
 type:z.literal('inventory'),mode:z.enum(['add','set']).default('add'),item:name,
 quantity:quantity.optional(),unit:unitSchema.optional(),baseUnit:unitSchema.optional(),
 unitsPerPack:z.number().finite().positive().max(100000).optional(),price:price.nullable().optional(),
 draftId:z.string().max(100).optional(),
}).strict();
export type StockRequest=z.infer<typeof stockRequestSchema>;
export const actionSchema = z.discriminatedUnion('type', [
 z.object({type:z.literal('inventory'),mode:z.enum(['add','set']).default('set'),item:name,quantity,unit:unitSchema,baseUnit:unitSchema.optional(),unitsPerPack:z.number().finite().positive().max(100000).optional(),price:price.nullable().optional()}).strict(),
 z.object({type:z.literal('price'),item:name,price}).strict(),
 z.object({type:z.literal('credit'),customer:name,amount,note:z.string().max(200).default('')}).strict(),
 z.object({type:z.literal('payment'),customer:name,amount}).strict(),
 z.object({type:z.literal('sale'),item:name,quantity:quantity.refine(n=>n>0),customer:name}).strict(),
 z.object({type:z.literal('task'),title:name,date,cropId:name.optional()}).strict(),
 z.object({type:z.literal('task_status'),id:name,done:z.boolean()}).strict(),
 z.object({type:z.literal('farm_crop'),id:name.optional(),plot:name,crop:name,variety:z.string().trim().max(100).default(''),area:farmArea,areaUnit:z.enum(['acres','hectares']),sownOn:date,location:name,stage:farmStageSchema}).strict(),
 z.object({type:z.literal('farm_expense'),cropId:name.optional(),category:farmCategorySchema,amount:farmAmount,date,note:z.string().trim().max(200).default('')}).strict(),
 z.object({type:z.literal('appointment'),customer:name,service:name,date,time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict(),
]);
export type Action=z.infer<typeof actionSchema>;
export type InventoryItem={item:string;quantity:number;unit:Unit;price:number|null;packaging?:{unit:Unit;unitsPerPack:number}[]};
export type FarmCrop={id:string;plot:string;crop:string;variety:string;area:number;areaUnit:'acres'|'hectares';sownOn:string;location:string;stage:z.infer<typeof farmStageSchema>};
export type FarmExpense={id:string;cropId?:string;category:z.infer<typeof farmCategorySchema>;amount:number;date:string;note:string};
export type Review={basis:string;summary:string;lines:{label:string;value:string}[]};
export type Message={id:string;role:'user'|'assistant';text:string;at:string;action?:Action;review?:Review;status?:'pending'|'saved'|'cancelled';requestId?:string;draftId?:string};
export type State={
 inventory:InventoryItem[];
 credits:{customer:string;amount:number;note:string}[];
 sales:{id:string;item:string;quantity:number;total:number;customer:string;at:string}[];
 tasks:{id:string;title:string;date:string;done:boolean;cropId?:string}[];
 farmCrops?:FarmCrop[];farmExpenses?:FarmExpense[];
 appointments:{id:string;customer:string;service:string;date:string;time:string}[];
 messages:Message[];activity:{id:string;text:string;at:string}[];usage:{start:number;count:number};
 inventoryDraft?:{id:string;request:StockRequest;question:string;missing:string[];updatedAt:string};
};
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const normalizeName=(v:string)=>v.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export const findItem=(s:State,item:string)=>s.inventory.find(i=>normalizeName(i.item)===normalizeName(item));
const rounded=(n:number)=>Math.round(n*10000)/10000;
export const farmCropLabel=(crop:FarmCrop)=>`${crop.crop} · ${crop.plot} · ${crop.sownOn}`;
export function farmSummary(s:State){
 const crops=s.farmCrops||[],expenses=s.farmExpenses||[];const centsByCrop:Record<string,number>={};let total=0,general=0;
 for(const e of expenses){const cents=Math.round(e.amount*100);total+=cents;if(e.cropId)centsByCrop[e.cropId]=(centsByCrop[e.cropId]||0)+cents;else general+=cents;}
 return {totalExpenses:total/100,generalExpenses:general/100,expensesByCrop:Object.fromEntries(crops.map(c=>[c.id,(centsByCrop[c.id]||0)/100])),activeCrops:crops.filter(c=>c.stage!=='harvested').length,overdueTasks:s.tasks.filter(t=>!t.done&&t.date<today()).length};
}
export function upgradeState(s:State):State{return {...s,farmCrops:s.farmCrops||[],farmExpenses:s.farmExpenses||[]};}
export function seed(profile:Profile):State{
 return {inventory:profile==='shop'?[{item:'Rice',quantity:45,unit:'kg',price:60},{item:'Wheat flour',quantity:30,unit:'kg',price:45},{item:'Sunflower oil',quantity:8,unit:'litres',price:140},{item:'Sugar',quantity:4,unit:'kg',price:42},{item:'Tea',quantity:18,unit:'packs',price:30}]:[],credits:profile==='shop'?[{customer:'Ravi',amount:450,note:'Groceries'},{customer:'Sunita',amount:280,note:'Monthly essentials'},{customer:'Amit',amount:120,note:'Tea and sugar'}]:[],sales:[],farmCrops:[],farmExpenses:[],tasks:profile==='farm'?[{id:'seed-task',title:'Check soil moisture in the onion plot',date:today(),done:false}]:[],appointments:[],messages:[],activity:[],usage:{start:Date.now(),count:0}};
}
export function describe(a:Action){
 if(a.type==='inventory')return `${a.mode==='add'?'Receive':'Set total to'} ${a.quantity} ${a.unit} of ${a.item}`;
 if(a.type==='price')return `Set ${a.item} selling price to ₹${a.price} per base unit`;
 if(a.type==='credit')return `Add ₹${a.amount} to ${a.customer}'s udhaar${a.note?' · '+a.note:''}`;
 if(a.type==='payment')return `Record ₹${a.amount} received from ${a.customer}`;
 if(a.type==='sale')return `Bill ${a.customer} for ${a.quantity} of ${a.item} at the saved price`;
 if(a.type==='task')return `${a.title} · ${a.date}`;
 if(a.type==='task_status')return a.done?'Complete farm task':'Reopen farm task';
 if(a.type==='farm_crop')return `${a.id?'Update':'Add'} ${a.crop} · ${a.plot}`;
 if(a.type==='farm_expense')return `Record ₹${a.amount} for ${a.category} · ${a.date}`;
 return `${a.service} for ${a.customer} · ${a.date} at ${a.time}`;
}
const counted=(unit:Unit)=>!['kg','litres'].includes(unit);
export function prepareStock(s:State,raw:unknown):{action?:Action;request:StockRequest;question?:string;missing:string[]}{
 const request=stockRequestSchema.parse(raw);
 const old=findItem(s,request.item);if(old)request.item=old.item;
 const ask=(question:string,...missing:string[])=>({request,question,missing});
 if(request.quantity===undefined)return ask(`How many ${request.unit||'units'} of ${request.item} ${request.mode==='add'?'did you receive':'should the total be'}?`,'quantity');
 if(request.mode==='add'&&request.quantity<=0)throw new Error('Received quantity must be greater than zero.');
 if(!request.unit)return ask(`What unit are you counting ${request.item} in—cartons, boxes, packs, pieces, kg or litres?`,'unit');
 const container=['cartons','boxes'].includes(request.unit);
 const baseUnit=old?.unit||request.baseUnit||(!container?request.unit:undefined);
 if(old&&request.baseUnit&&request.baseUnit!==old.unit)throw new Error(`${old.item} is tracked in ${old.unit}. Keep that base unit so existing stock stays correct.`);
 if(!baseUnit)return ask(`How many individual packs or pieces are in one ${request.unit==='cartons'?'carton':'box'} of ${request.item}? Tell me the number and the unit, for example “24 packs per carton”.`,'baseUnit','unitsPerPack');
 const saved=old?.packaging?.find(p=>p.unit===request.unit);
 let factor:number;
 if(request.unit===baseUnit){factor=1;if(request.unitsPerPack!==undefined&&request.unitsPerPack!==1)throw new Error('No packaging conversion is needed when the units are the same.');}
 else{
  if(!container)throw new Error(`Cannot convert ${request.unit} to ${baseUnit}. Please use the saved base unit.`);
  if(saved&&request.unitsPerPack!==undefined&&saved.unitsPerPack!==request.unitsPerPack)throw new Error(`The saved ${request.unit} size for ${request.item} is ${saved.unitsPerPack} ${baseUnit}. Use a distinct item name for a different pack size.`);
  const conversion=saved?.unitsPerPack??request.unitsPerPack;
  if(conversion===undefined)return ask(`How many ${baseUnit} are in one ${request.unit==='cartons'?'carton':'box'} of ${request.item}?`,'unitsPerPack');
  factor=conversion;
 }
 if(counted(request.unit)&&!Number.isInteger(request.quantity))throw new Error(`Enter a whole number of ${request.unit}.`);
 if(counted(baseUnit)&&!Number.isInteger(factor))throw new Error(`The number of ${baseUnit} in a package must be a whole number.`);
 const converted=rounded(request.quantity*factor);
 const total=request.mode==='add'?rounded((old?.quantity||0)+converted):converted;
 if(!Number.isFinite(total)||total>1000000)throw new Error('The resulting stock exceeds the supported limit.');
 if(old&&request.price!=null&&old.price!=null&&request.price!==old.price)throw new Error('Change the selling price separately so receiving stock does not overwrite it.');
 const action:Action={type:'inventory',mode:request.mode,item:request.item,quantity:request.quantity,unit:request.unit,baseUnit,...(request.unit!==baseUnit?{unitsPerPack:factor}:{}),...(request.price!==undefined?{price:request.price}:{})};
 return {request,action,missing:[]};
}
export function applyAction(s:State,raw:unknown,profile:Profile){
 const a=actionSchema.parse(raw);
 if(profile==='farm'&&!['task','task_status','farm_crop','farm_expense'].includes(a.type))throw new Error('Use the shop demo for business records.');
 if(profile==='shop'&&(a.type==='farm_crop'||a.type==='farm_expense'||(a.type==='task'&&a.cropId)))throw new Error('Use the farmer demo for farm records.');
 if(a.type==='inventory'){
  const ready=prepareStock(s,a);if(!ready.action)throw new Error(ready.question);const stock=ready.action as Extract<Action,{type:'inventory'}>;
  const existing=findItem(s,stock.item);const factor=stock.unitsPerPack??1;const baseUnit=stock.baseUnit??stock.unit;
  const delta=rounded(stock.quantity*factor);const total=stock.mode==='add'?rounded((existing?.quantity||0)+delta):delta;
  const packaging=[...(existing?.packaging||[])];if(stock.unit!==baseUnit&&!packaging.some(p=>p.unit===stock.unit))packaging.push({unit:stock.unit,unitsPerPack:factor});
  const row:InventoryItem={item:existing?.item||stock.item,quantity:total,unit:baseUnit,price:existing?.price??stock.price??null,packaging};
  if(existing)Object.assign(existing,row);else s.inventory.push(row);
 }else if(a.type==='price'){
  const item=findItem(s,a.item);if(!item)throw new Error('Receive this item into inventory first.');item.price=a.price;
 }else if(a.type==='credit'||a.type==='payment'){
  let c=s.credits.find(x=>normalizeName(x.customer)===normalizeName(a.customer));
  if(a.type==='payment'&&(!c||c.amount<a.amount))throw new Error('Payment exceeds this customer’s outstanding udhaar.');
  if(!c){c={customer:a.customer,amount:0,note:''};s.credits.push(c);}
  c.amount=Math.round((c.amount+(a.type==='credit'?a.amount:-a.amount))*100)/100;if(a.type==='credit')c.note=a.note;
 }else if(a.type==='sale'){
  const item=findItem(s,a.item);if(!item)throw new Error('Receive this item into inventory first.');
  if(item.price==null)throw new Error(`Set a selling price for ${item.item} before making a bill.`);
  if(counted(item.unit)&&!Number.isInteger(a.quantity))throw new Error(`Enter a whole number of ${item.unit}.`);
  if(item.quantity<a.quantity)throw new Error(`Only ${item.quantity} ${item.unit} of ${item.item} is available.`);
  item.quantity=rounded(item.quantity-a.quantity);s.sales.unshift({id:crypto.randomUUID(),...a,item:item.item,total:Math.round(item.price*a.quantity*100)/100,at:new Date().toISOString()});
 }else if(a.type==='farm_crop'){
  const crops=s.farmCrops||[],old=a.id?crops.find(c=>c.id===a.id):undefined;
  if(a.id&&!old)throw new Error('Crop record not found. Choose a saved crop.');
  if(a.stage!=='planned'&&a.sownOn>today())throw new Error('A growing or harvested crop cannot have a future sowing date.');
  if(old&&(normalizeName(old.plot)!==normalizeName(a.plot)||normalizeName(old.crop)!==normalizeName(a.crop)||old.sownOn!==a.sownOn))throw new Error('Keep the saved crop, plot and sowing date. Add a new crop record for a different season.');
  if(!old&&crops.some(c=>normalizeName(c.plot)===normalizeName(a.plot)&&normalizeName(c.crop)===normalizeName(a.crop)&&c.sownOn===a.sownOn))throw new Error('This crop and plot already have a record for that sowing date. Edit the saved record instead.');
  const {type,id,...fields}=a;
  if(old)Object.assign(old,fields,{crop:old.crop,plot:old.plot});else crops.unshift({id:crypto.randomUUID(),...fields});
  s.farmCrops=crops;
 }else if(a.type==='farm_expense'){
  if(a.date>today())throw new Error('Record only expenses already paid. Use a farm task for a planned purchase.');
  if(a.cropId&&!(s.farmCrops||[]).some(c=>c.id===a.cropId))throw new Error('Crop record not found. Choose a saved crop or a general farm expense.');
  const {type,...fields}=a;s.farmExpenses=[{id:crypto.randomUUID(),...fields},...(s.farmExpenses||[])];
 }else if(a.type==='task'){
  if(a.cropId&&!(s.farmCrops||[]).some(c=>c.id===a.cropId))throw new Error('Crop record not found. Choose a saved crop.');
  s.tasks.unshift({id:crypto.randomUUID(),title:a.title,date:a.date,done:false,...(a.cropId?{cropId:a.cropId}:{})});
 }
 else if(a.type==='task_status'){const task=s.tasks.find(t=>t.id===a.id);if(!task)throw new Error('Task not found.');task.done=a.done;}
 else{
  if(s.appointments.some(x=>x.date===a.date&&x.time===a.time))throw new Error('This appointment slot is already booked. Choose another time.');s.appointments.unshift({id:crypto.randomUUID(),...a});
 }
 s.activity.unshift({id:crypto.randomUUID(),text:describe(a),at:new Date().toISOString()});s.activity=s.activity.slice(0,150);return s;
}
export function previewAction(s:State,a:Action,profile:Profile):Review{
 const after=applyAction(structuredClone(s),a,profile);let relevant:unknown=null;const lines:Review['lines']=[];
 if(a.type==='inventory'||a.type==='price'||a.type==='sale'){
  const old=findItem(s,a.item),next=findItem(after,a.item)!;relevant=old??null;
  lines.push({label:'Item',value:next.item},{label:'Current stock',value:`${old?.quantity||0} ${next.unit}`});
  if(a.type==='inventory'){
   if(a.unit!==next.unit)lines.push({label:'Packaging',value:`1 ${a.unit==='cartons'?'carton':'box'} = ${a.unitsPerPack} ${next.unit}`});
   lines.push({label:a.mode==='add'?'Received':'Set total',value:`${a.quantity} ${a.unit}`},{label:'After confirmation',value:`${next.quantity} ${next.unit}`},{label:'Selling price',value:next.price==null?'Not set · add later':`₹${next.price} / ${next.unit}`});
  }else if(a.type==='price')lines.push({label:'New selling price',value:`₹${a.price} / ${next.unit}`});
  else lines.push({label:'Bill total',value:`₹${after.sales[0].total}`},{label:'Remaining stock',value:`${next.quantity} ${next.unit}`});
 }else if(a.type==='credit'||a.type==='payment'){
  const old=s.credits.find(c=>normalizeName(c.customer)===normalizeName(a.customer));const next=after.credits.find(c=>normalizeName(c.customer)===normalizeName(a.customer))!;relevant=old??null;lines.push({label:'Before',value:`₹${old?.amount||0}`},{label:'After confirmation',value:`₹${next.amount}`});
 }else if(a.type==='farm_crop'){
  const old=(s.farmCrops||[]).find(c=>c.id===a.id);relevant=old||(s.farmCrops||[]).filter(c=>normalizeName(c.plot)===normalizeName(a.plot)&&normalizeName(c.crop)===normalizeName(a.crop)&&c.sownOn===a.sownOn);
  lines.push({label:'Crop / plot',value:`${a.crop} · ${a.plot}`},{label:'Location',value:a.location},{label:'Sowing date',value:a.sownOn},{label:'Area',value:`${a.area} ${a.areaUnit}`},{label:'Variety',value:a.variety||'Not recorded'});
  if(old)lines.push({label:'Before',value:`${old.area} ${old.areaUnit} · ${old.stage}`});
  lines.push({label:'After confirmation',value:`${a.area} ${a.areaUnit} · ${a.stage}`});
 }else if(a.type==='farm_expense'){
  const crop=(s.farmCrops||[]).find(c=>c.id===a.cropId);const before=farmSummary(s),next=farmSummary(after);relevant={crop:crop||null,total:before.totalExpenses};
  lines.push({label:'For',value:crop?farmCropLabel(crop):'General farm expense'},{label:'Category',value:a.category},{label:'Amount paid',value:`₹${a.amount}`},{label:'Date paid',value:a.date},{label:'Note',value:a.note||'—'},{label:'Recorded expenses before',value:`₹${before.totalExpenses}`},{label:'After confirmation',value:`₹${next.totalExpenses} recorded expenses`});
 }else if(a.type==='task'){
  const crop=(s.farmCrops||[]).find(c=>c.id===a.cropId);relevant=crop||null;lines.push({label:'Task',value:a.title},{label:'Due date',value:a.date},{label:'For',value:crop?farmCropLabel(crop):'General task'});
 }else if(a.type==='appointment')relevant=s.appointments.filter(x=>x.date===a.date&&x.time===a.time);
 else if(a.type==='task_status'){
  const task=s.tasks.find(t=>t.id===a.id)!;relevant=task;lines.push({label:'Task',value:task.title},{label:'Due date',value:task.date},{label:'After confirmation',value:a.done?'Completed':'To do'});
 }
 return {summary:describe(a),basis:JSON.stringify(relevant),lines};
}
const local=(lang:string,en:string,hi:string,mr:string)=>lang==='hi-IN'?hi:lang==='mr-IN'?mr:en;
export function prepareMessage(s:State,raw:unknown,profile:Profile,language='en-IN',requestId?:string):Message{
 if(requestId){const previous=s.messages.find(m=>m.requestId===requestId);if(previous)return previous;}
 let action:Action|undefined;let draftId:string|undefined;let question:string|undefined;
 if((raw as {type?:string})?.type==='inventory'){
  if(profile==='farm')throw new Error('Use the shop demo for inventory.');
  let incoming=stockRequestSchema.parse(raw);const saved=s.inventoryDraft;
  if(incoming.draftId){
   if(!saved||saved.id!==incoming.draftId)throw new Error('This inventory question has changed. Please repeat the full stock request.');
   if(normalizeName(saved.request.item)!==normalizeName(incoming.item)||saved.request.mode!==incoming.mode)throw new Error('Finish this item first or start a new stock request.');
   incoming={...saved.request,...Object.fromEntries(Object.entries(incoming).filter(([,v])=>v!==undefined))};
  }
  const result=prepareStock(s,incoming);action=result.action;
  if(!action){
   draftId=incoming.draftId||crypto.randomUUID();question=result.question!;
   const unit=result.request.unit,base=result.request.baseUnit||findItem(s,result.request.item)?.unit;
   if(result.missing.includes('unitsPerPack'))question=local(language,question,`${result.request.item} के एक ${unit==='cartons'?'कार्टन':'बॉक्स'} में कितने ${base||'पैक या पीस'} हैं? संख्या और इकाई बताइए।`,`${result.request.item} च्या एका ${unit==='cartons'?'कार्टन':'बॉक्स'}मध्ये किती ${base||'पॅक किंवा नग'} आहेत? संख्या आणि एकक सांगा.`);
   s.inventoryDraft={id:draftId,request:result.request,question,missing:result.missing,updatedAt:new Date().toISOString()};
  }
 }else action=actionSchema.parse(raw);
 let review:Review|undefined;
 if(action){review=previewAction(s,action,profile);delete s.inventoryDraft;}
 // One review at a time makes both corrections and spoken confirmations unambiguous.
 for(const m of s.messages)if(m.status==='pending')m.status='cancelled';
 const message:Message={id:crypto.randomUUID(),role:'assistant',at:new Date().toISOString(),requestId,text:question||local(language,'Please review this change. Say “confirm” or tap Confirm & save. Nothing has been saved yet.','यह बदलाव जाँच लें। “कन्फर्म” कहें या Confirm & save दबाएँ। अभी कुछ सेव नहीं हुआ है।','हा बदल तपासा. “कन्फर्म” म्हणा किंवा Confirm & save दाबा. अजून काही जतन झालेले नाही.'),...(action?{action,review,status:'pending' as const}:{}),...(draftId?{draftId}:{})};
 s.messages.push(message);s.messages=s.messages.slice(-100);return message;
}
export function decideMessage(s:State,id:string,decision:'confirm'|'cancel',profile:Profile):'saved'|'cancelled'|'review_updated'{
 const m=s.messages.find(m=>m.id===id);if(!m?.action)throw new Error('This action is no longer available.');
 if(m.status==='saved'||m.status==='cancelled')return m.status;
 if(decision==='cancel'){m.status='cancelled';return 'cancelled';}
 const fresh=previewAction(s,m.action,profile);
 if(m.review&&m.review.basis!==fresh.basis){m.review=fresh;m.text='Your records changed while this review was open. Check the updated details and confirm again.';return 'review_updated';}
 applyAction(s,m.action,profile);m.review=fresh;m.status='saved';return 'saved';
}
export function spokenDecision(text:string):'confirm'|'cancel'|null{
 const word=text.normalize('NFKC').toLowerCase().replace(/[.!?।]/g,'').trim();
 if(['confirm','yes confirm','confirm and save','save it','yes save it','कन्फर्म','कन्फर्म करो','हाँ सेव करो','सेव करो','होय जतन करा','जतन करा'].includes(word))return 'confirm';
 if(['cancel','cancel it','do not save','dont save','रद्द करो','रद्द करें','रद्द करा'].includes(word))return 'cancel';return null;
}
