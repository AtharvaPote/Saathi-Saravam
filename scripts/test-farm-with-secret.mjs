// Real Sarvam contract check using only synthetic in-memory farm records.
import assert from 'node:assert/strict';
import {chatMessages} from '../app/lib/chat-prompt.ts';
import {toolsFor,actionFromTool} from '../app/lib/action-registry.ts';
import {prepareMessage,decideMessage,seed,today,farmSummary} from '../app/lib/domain.ts';
process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');let input='';
console.log('Ready for synthetic farm test secret on stdin (input is hidden).');
process.stdin.on('data',async chunk=>{
 input+=chunk;if(!/[\r\n]/.test(input))return;process.stdin.pause();process.stdin.setRawMode(false);const key=input.trim();input='';
 try{
  const s=seed('farm');s.tasks=[];
  async function turn(text,language='en-IN'){
   const messages=chatMessages(s,'farm',{text,language},today(),{name:'Test farmer',business:'Synthetic QA farm'});
   for(let round=0;round<3;round++){
    const r=await fetch('https://api.sarvam.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','api-subscription-key':key},body:JSON.stringify({model:'sarvam-105b',reasoning_effort:null,temperature:0.1,max_tokens:1500,tools:toolsFor('farm'),tool_choice:'auto',messages}),signal:AbortSignal.timeout(45000)});
    assert.equal(r.status,200,`Sarvam status ${r.status}`);const d=await r.json(),m=d.choices?.[0]?.message,calls=m?.tool_calls||[];
    if(calls.length&&calls.every(c=>c.function.name==='read_farm')){messages.push(m);for(const c of calls)messages.push({role:'tool',tool_call_id:c.id,content:JSON.stringify({crops:s.farmCrops,expenses:s.farmExpenses,tasks:s.tasks,summary:farmSummary(s)})});continue;}
    s.messages.push({id:crypto.randomUUID(),role:'user',text,at:new Date().toISOString()});
    if(!calls.length){assert.ok(m.content);s.messages.push({id:crypto.randomUUID(),role:'assistant',text:m.content,at:new Date().toISOString()});return {reply:m.content};}
    assert.equal(calls.length,1);console.log('Native tool:',calls[0].function.name);const action=actionFromTool(calls[0].function.name,JSON.parse(calls[0].function.arguments),'farm',s,text);return prepareMessage(s,action,'farm',language);
   }
   throw new Error('Too many record lookups');
  }
  let p=await turn(`Add a growing Onion crop in plot North test, 2 acres, sowing date ${today()}, location Nashik. No variety recorded.`);
  assert.equal(p.action?.type,'farm_crop');assert.equal(p.action.area,2);assert.equal(p.action.areaUnit,'acres');assert.equal(s.farmCrops.length,0);decideMessage(s,p.id,'confirm','farm');assert.equal(s.farmCrops.length,1);console.log('PASS crop native tool, structured review and explicit confirmation');
  const cropId=s.farmCrops[0].id;
  p=await turn('I paid 1250 rupees for seeds today for the saved Onion crop in North test. Record that expense.');
  assert.equal(p.action?.type,'farm_expense');assert.equal(p.action.amount,1250);assert.equal(p.action.cropId,cropId);assert.equal(p.action.category,'seeds');assert.equal(s.farmExpenses.length,0);decideMessage(s,p.id,'confirm','farm');assert.equal(farmSummary(s).totalExpenses,1250);console.log('PASS paid expense matched to the saved crop, never saved before confirmation');
  p=await turn('North test वाले प्याज़ के खेत में कल मिट्टी की नमी जाँचने का काम जोड़ो।','hi-IN');
  assert.equal(p.action?.type,'task');assert.equal(p.action.cropId,cropId);assert.equal(p.action.date,new Date(Date.parse(today())+86400000).toISOString().slice(0,10));assert.equal(s.tasks.length,0);decideMessage(s,p.id,'confirm','farm');console.log('PASS Hindi crop-linked task with relative India date');
  p=await turn('Mark the saved Onion crop in North test as harvested.');assert.equal(p.action?.type,'farm_crop');assert.equal(p.action.id,cropId);assert.equal(p.action.stage,'harvested');assert.equal(s.farmCrops[0].stage,'growing');decideMessage(s,p.id,'confirm','farm');assert.equal(s.farmCrops[0].stage,'harvested');assert.equal(s.farmExpenses[0].cropId,cropId);console.log('PASS stage update preserves crop identity and its expenses');
  p=await turn('I planted wheat. Add it to my crops.');assert.equal(p.action,undefined);assert.ok(p.reply);assert.equal(s.farmCrops.length,1);console.log('PASS incomplete crop request asks for details without inventing a record');
  console.log('PASS five live synthetic farmer checks');process.exit(0);
 }catch(e){console.error(e.message);process.exit(1);}
});
