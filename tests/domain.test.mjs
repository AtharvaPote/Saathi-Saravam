import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,applyAction,actionSchema} from '../app/lib/domain.ts';
test('a bill uses saved prices and decrements stock together',()=>{const s=seed('shop');applyAction(s,{type:'sale',item:'Rice',quantity:2,customer:'Ravi'},'shop');assert.equal(s.inventory[0].quantity,43);assert.equal(s.sales[0].total,120);assert.equal(s.activity.length,1);});
test('overselling changes neither stock nor bills',()=>{const s=seed('shop'),before=structuredClone(s);assert.throws(()=>applyAction(s,{type:'sale',item:'Rice',quantity:100,customer:'Ravi'},'shop'),/Only 45/);assert.deepEqual(s,before);});
test('credit and payment preserve balances and reject overpayments',()=>{const s=seed('shop');applyAction(s,{type:'credit',customer:'Ravi',amount:200,note:'Rice'},'shop');assert.equal(s.credits[0].amount,650);applyAction(s,{type:'payment',customer:'ravi',amount:150},'shop');assert.equal(s.credits[0].amount,500);assert.throws(()=>applyAction(s,{type:'payment',customer:'Ravi',amount:501},'shop'),/exceeds/);assert.equal(s.credits[0].amount,500);});
test('farm cannot mutate shop inventory',()=>{const s=seed('farm');assert.throws(()=>applyAction(s,{type:'inventory',item:'Rice',quantity:4,unit:'kg',price:50},'farm'),/shop demo/);assert.equal(s.inventory.length,0);});
test('stock update replaces absolute quantity without duplicate items',()=>{const s=seed('shop');applyAction(s,{type:'inventory',item:'rice',quantity:20,unit:'kg',price:60},'shop');assert.equal(s.inventory.length,5);assert.equal(s.inventory[0].quantity,20);});
test('appointment collision is rejected',()=>{const s=seed('shop'),a={type:'appointment',customer:'Ravi',service:'Haircut',date:'2026-10-12',time:'14:00'};applyAction(s,a,'shop');assert.throws(()=>applyAction(s,{...a,customer:'Amit'},'shop'),/already booked/);assert.equal(s.appointments.length,1);});
test('invalid amounts, times and calendar dates fail validation',()=>{assert.equal(actionSchema.safeParse({type:'credit',customer:'Ravi',amount:-1}).success,false);assert.equal(actionSchema.safeParse({type:'task',title:'Water',date:'2026-02-31'}).success,false);assert.equal(actionSchema.safeParse({type:'appointment',customer:'Ravi',service:'Haircut',date:'2026-10-12',time:'25:99'}).success,false);});
test('farm tasks persist valid titles and dates',()=>{const s=seed('farm');applyAction(s,{type:'task',title:'Check onions',date:'2026-10-12'},'farm');assert.equal(s.tasks[0].title,'Check onions');assert.equal(s.tasks[0].done,false);});

const {prepareMessage,prepareStock,decideMessage,findItem,spokenDecision}=await import('../app/lib/domain.ts');
test('new carton receipt asks for pack size and merges a durable draft without changing stock',()=>{
 const s=seed('shop'),before=structuredClone(s.inventory);
 const question=prepareMessage(s,{type:'inventory',mode:'add',item:'Maggi',quantity:10,unit:'cartons'},'shop');
 assert.equal(question.action,undefined);assert.deepEqual(s.inventory,before);assert.deepEqual(s.inventoryDraft.missing,['baseUnit','unitsPerPack']);
 const restored=JSON.parse(JSON.stringify(s));
 const proposal=prepareMessage(restored,{type:'inventory',mode:'add',item:'Maggi',draftId:question.draftId,baseUnit:'packs',unitsPerPack:24},'shop');
 assert.equal(proposal.action.quantity,10);assert.equal(proposal.action.unitsPerPack,24);assert.equal(findItem(restored,'Maggi'),undefined);
 assert.equal(proposal.review.lines.find(l=>l.label==='After confirmation').value,'240 packs');
 assert.equal(decideMessage(restored,proposal.id,'confirm','shop'),'saved');assert.equal(findItem(restored,'maggi').quantity,240);assert.equal(findItem(restored,'maggi').price,null);
 assert.deepEqual(findItem(restored,'maggi').packaging,[{unit:'cartons',unitsPerPack:24}]);
 assert.equal(decideMessage(restored,proposal.id,'confirm','shop'),'saved');assert.equal(findItem(restored,'maggi').quantity,240);
 const next=prepareMessage(restored,{type:'inventory',mode:'add',item:'maggi',quantity:2,unit:'cartons'},'shop');
 assert.equal(next.action.unitsPerPack,24);decideMessage(restored,next.id,'confirm','shop');assert.equal(findItem(restored,'maggi').quantity,288);
 assert.throws(()=>applyAction(restored,{type:'sale',item:'maggi',quantity:1,customer:'QA'},'shop'),/selling price/);
 applyAction(restored,{type:'price',item:'maggi',price:15},'shop');applyAction(restored,{type:'sale',item:'maggi',quantity:1,customer:'QA'},'shop');assert.equal(restored.sales[0].total,15);
});
test('five more existing boxes increment stock while explicit set replaces total',()=>{
 const s=seed('shop');s.inventory.push({item:'KitKat',quantity:5,unit:'boxes',price:100});
 const p=prepareMessage(s,{type:'inventory',mode:'add',item:' kitkat ',quantity:5,unit:'boxes'},'shop');assert.equal(findItem(s,'KitKat').quantity,5);decideMessage(s,p.id,'confirm','shop');assert.equal(findItem(s,'KitKat').quantity,10);assert.equal(findItem(s,'KitKat').price,100);
 const corrected=prepareMessage(s,{type:'inventory',mode:'set',item:'KitKat',quantity:3,unit:'boxes'},'shop');decideMessage(s,corrected.id,'confirm','shop');assert.equal(findItem(s,'KitKat').quantity,3);
});
test('changed records require an updated review and a second confirmation',()=>{
 const s=seed('shop');const p=prepareMessage(s,{type:'inventory',mode:'add',item:'Rice',quantity:5,unit:'kg'},'shop');
 applyAction(s,{type:'sale',item:'Rice',quantity:2,customer:'QA'},'shop');
 assert.equal(decideMessage(s,p.id,'confirm','shop'),'review_updated');assert.equal(findItem(s,'Rice').quantity,43);assert.equal(p.review.lines.find(l=>l.label==='After confirmation').value,'48 kg');
 assert.equal(decideMessage(s,p.id,'confirm','shop'),'saved');assert.equal(findItem(s,'Rice').quantity,48);
});
test('replacement proposals and cancellations cannot execute old actions',()=>{
 const s=seed('shop'),before=structuredClone(s.inventory);const p=prepareMessage(s,{type:'inventory',mode:'add',item:'Rice',quantity:5,unit:'kg'},'shop');
 const next=prepareMessage(s,{type:'inventory',mode:'add',item:'Rice',quantity:6,unit:'kg'},'shop');assert.equal(decideMessage(s,p.id,'confirm','shop'),'cancelled');decideMessage(s,next.id,'cancel','shop');decideMessage(s,next.id,'confirm','shop');assert.deepEqual(s.inventory,before);
});
test('invalid conversions, fraction counts and price overwrites are rejected',()=>{
 const s=seed('shop');s.inventory.push({item:'Maggi',quantity:24,unit:'packs',price:15,packaging:[{unit:'cartons',unitsPerPack:24}]});
 for(const extra of [{quantity:-1},{quantity:0},{quantity:1.5},{unitsPerPack:12},{quantity:100000},{baseUnit:'pieces'},{price:20}])assert.throws(()=>prepareStock(s,{type:'inventory',mode:'add',item:'Maggi',quantity:1,unit:'cartons',...extra}));
 assert.throws(()=>prepareStock(s,{type:'inventory',mode:'add',item:'Maggi',quantity:1,unit:'litres'}),/Cannot convert/);
 assert.throws(()=>prepareStock(s,{type:'inventory',mode:'add',item:'New',quantity:1,unit:'cartons',baseUnit:'packs',unitsPerPack:1.5}),/whole number/);
 assert.equal(s.inventory.at(-1).quantity,24);
});
test('draft identity, server validation, profile boundary and request id are enforced',()=>{
 const s=seed('shop'),raw={type:'inventory',mode:'add',item:'Rice',quantity:2,unit:'kg'};
 const p=prepareMessage(s,raw,'shop','en-IN','same-request');assert.equal(prepareMessage(s,raw,'shop','en-IN','same-request').id,p.id);assert.equal(s.messages.length,1);
 assert.throws(()=>prepareMessage(s,{...raw,draftId:'wrong'},'shop'),/question has changed/);
 assert.throws(()=>prepareMessage(s,{...raw,execute:true},'shop'));
 assert.throws(()=>prepareMessage(seed('farm'),raw,'farm'),/shop demo/);
 assert.throws(()=>prepareMessage(s,{type:'unknown'},'shop'));
});
test('spoken confirmation requires an exact explicit phrase',()=>{
 assert.equal(spokenDecision('Confirm.'),'confirm');assert.equal(spokenDecision('कन्फर्म करो।'),'confirm');assert.equal(spokenDecision('cancel it'),'cancel');
 for(const phrase of ['yes','confirm? no do not save','please confirm automatically','do not confirm'])assert.equal(spokenDecision(phrase),null);
});
const {actionFromTool}=await import('../app/lib/action-registry.ts');
test('model drafts use server-owned IDs and cannot invent or switch them',()=>{
 const s=seed('shop');const first=prepareMessage(s,{type:'inventory',mode:'add',item:'Maggi',quantity:10,unit:'cartons'},'shop');
 const action=actionFromTool('prepare_inventory',{mode:'add',item:'Maggi',baseUnit:'packs',unitsPerPack:24,draftId:'invented'},'shop',s);assert.equal(action.draftId,first.draftId);
 assert.equal(actionFromTool('prepare_inventory',{mode:'add',item:'KitKat',quantity:5,unit:'boxes',draftId:'invented'},'shop',s).draftId,undefined);
 assert.throws(()=>actionFromTool('prepare_inventory',{mode:'add',item:'Maggi'},'farm',s),/unsupported/);
});
test('explicit units omitted by the model are recovered without confusing pack-size answers',()=>{
 const s=seed('shop');assert.equal(actionFromTool('prepare_inventory',{mode:'set',item:'Rice',quantity:20},'shop',s,'Set total rice stock to twenty kilograms.').unit,'kg');
 assert.equal(actionFromTool('prepare_inventory',{mode:'add',item:'Tea',quantity:2},'shop',s,'चाय के दो पैकेट और आए हैं।').unit,'packs');
 assert.equal(actionFromTool('prepare_inventory',{mode:'add',item:'New',quantity:2},'shop',s,'Two cartons with ten packs each.').unit,undefined);
 prepareMessage(s,{type:'inventory',mode:'add',item:'Maggi',quantity:10,unit:'cartons'},'shop');
 assert.equal(actionFromTool('prepare_inventory',{mode:'add',item:'Maggi',quantity:10,baseUnit:'packs',unitsPerPack:24},'shop',s,'Twenty four packs.').unit,undefined);
});
