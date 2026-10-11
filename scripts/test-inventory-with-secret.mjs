// Provider contract test. Uses only the synthetic records defined here in memory.
// Does not read the workspace database, prior chats, customer records, or environment secrets.
import assert from 'node:assert/strict';
import {chatMessages} from '../app/lib/chat-prompt.ts';
import {toolsFor,actionFromTool} from '../app/lib/action-registry.ts';
import {prepareMessage,decideMessage,findItem,seed,today} from '../app/lib/domain.ts';
process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');let input='';
console.log('Ready for synthetic inventory test secret on stdin (input is hidden).');
process.stdin.on('data',async chunk=>{
 input+=chunk;if(!/[\r\n]/.test(input))return;process.stdin.pause();process.stdin.setRawMode(false);const key=input.trim();input='';
 try{
  const s=seed('shop');s.inventory=[];s.credits=[];s.sales=[];s.messages=[];s.tasks=[];s.appointments=[];
  async function turn(text){
   const messages=chatMessages(s,'shop',{text,language:'en-IN'},today(),{name:'Test shop',business:'Synthetic QA store'});
   const r=await fetch('https://api.sarvam.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','api-subscription-key':key},body:JSON.stringify({model:'sarvam-105b',reasoning_effort:null,temperature:0.1,max_tokens:1300,tools:toolsFor('shop'),tool_choice:'auto',messages}),signal:AbortSignal.timeout(45000)});
   if(!r.ok)throw new Error(`Sarvam status ${r.status}`);const d=await r.json(),m=d.choices?.[0]?.message,calls=m?.tool_calls;
   if(!calls?.length){console.log('Model text instead of action:',m?.content);throw new Error('Expected native prepare tool call');}
   assert.equal(calls.length,1);console.log('Native tool:',calls[0].function.name, calls[0].function.arguments);
   const action=actionFromTool(calls[0].function.name,JSON.parse(calls[0].function.arguments),'shop',s);
   s.messages.push({id:crypto.randomUUID(),role:'user',text,at:new Date().toISOString()});return prepareMessage(s,action,'shop');
  }
  let p=await turn('I acquired 10 cartons of Maggi. It is a new item.');assert.equal(p.action,undefined);assert.equal(s.inventoryDraft.request.quantity,10);assert.equal(s.inventory.length,0);
  p=await turn('One carton contains 24 packs.');assert.equal(p.action?.quantity,10);assert.equal(p.action?.unitsPerPack,24);assert.equal(s.inventory.length,0);decideMessage(s,p.id,'confirm','shop');assert.equal(findItem(s,'Maggi').quantity,240);console.log('PASS live new-product clarification, 10×24 and confirmation');
  p=await turn('I received another 2 cartons of Maggi.');assert.equal(p.action?.mode,'add');assert.equal(p.action?.unitsPerPack,24);decideMessage(s,p.id,'confirm','shop');assert.equal(findItem(s,'Maggi').quantity,288);console.log('PASS saved packaging reused without another question');
  s.inventory.push({item:'KitKat',quantity:5,unit:'boxes',price:100});p=await turn('I bought 5 more boxes of KitKat.');assert.equal(p.action?.mode,'add');assert.equal(findItem(s,'KitKat').quantity,5);decideMessage(s,p.id,'confirm','shop');assert.equal(findItem(s,'KitKat').quantity,10);console.log('PASS existing KitKat increases from 5 to 10 boxes');
  p=await turn('Test Customer के उधार में 200 रुपये जोड़ो। नोट: QA सामान।');assert.equal(p.action?.type,'credit');assert.equal(p.action?.amount,200);assert.equal(s.credits.length,0);console.log('PASS Hindi request produces a structured credit proposal without saving');
  console.log('PASS synthetic Sarvam integration tests');process.exit(0);
 }catch(e){console.error(e.message);process.exit(1);}
});
