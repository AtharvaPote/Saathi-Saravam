import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {client} from './http-client.mjs';
const manifest=JSON.parse(await readFile('public/voice-samples/manifest.json','utf8'));
const baseline=[{item:'Rice',quantity:45,unit:'kg',price:60},{item:'Tea',quantity:18,unit:'packs',price:30},{item:'KitKat',quantity:5,unit:'boxes',price:100}];
const expected={'pack-size':{item:'Maggi',quantity:240,unit:'packs',price:null},'existing-boxes':{item:'KitKat',quantity:10,unit:'boxes',price:100},'hindi-receipt':{item:'Tea',quantity:20,unit:'packs',price:30},'stock-correction':{item:'Rice',quantity:20,unit:'kg',price:60}};
const report={generatedAt:new Date().toISOString(),provider:'sarvam',ttsModel:'bulbul:v3',sttModel:'saaras:v3',sandbox:true,results:[],comparisons:[]};
const c=client();await c.login();
async function save(){await mkdir('outputs',{recursive:true});for(const file of ['outputs/voice-samples-report.json','public/voice-samples/results.json'])await writeFile(file,JSON.stringify(report,null,2)+'\n');}
for(const sample of manifest.samples){
 for(const mode of ['text','voice']){
  const row={sampleId:sample.id,mode,prompt:sample.prompt,passed:false};report.results.push(row);const started=performance.now();
  try{
   let transcript;
   if(mode==='voice'){
    const form=new FormData();form.append('file',new Blob([await readFile('public'+sample.file)],{type:'audio/wav'}),sample.file.split('/').at(-1));
    const start=performance.now(),response=await c.raw('/api/voice',form,true),data=await response.json();row.transcriptionMs=Math.round(performance.now()-start);assert.equal(response.status,200,JSON.stringify(data));assert.ok(data.transcript?.trim());transcript=data.transcript;row.transcript=transcript;
   }
   const start=performance.now();const data=await c.request('/api/voice-demo',{op:'run',sampleId:sample.id,mode,provider:'sarvam',...(transcript?{transcript}:{})});row.chatMs=Math.round(performance.now()-start);row.status=data.status;row.reply=data.reply;row.action=data.proposal?.action;row.review=data.proposal?.review;row.draft=data.state.inventoryDraft;
   assert.equal(data.sandbox,true);assert.deepEqual(data.state.credits,[]);assert.deepEqual(data.state.inventory,baseline,'Inventory changed before confirmation');row.noMutationBeforeConfirmation=true;
   if(sample.id==='new-cartons'){
    assert.equal(data.status,'needs_input');assert.equal(data.state.inventoryDraft.request.quantity,10);assert.equal(data.state.inventoryDraft.request.unit,'cartons');assert.equal(data.proposal.action,undefined);row.finalInventory=data.state.inventory;
   }else{
    assert.equal(data.status,'pending');assert.equal(row.action.type,'inventory');assert.equal(row.action.mode,sample.id==='stock-correction'?'set':'add');
    const target=expected[sample.id];assert.equal(row.action.item,target.item);
    const confirmed=await c.request('/api/voice-demo',{op:'confirm',sampleId:sample.id,mode,provider:'sarvam',id:data.proposal.id});assert.equal(confirmed.status,'saved');row.confirmationStatus=confirmed.status;row.finalInventory=confirmed.state.inventory;
    const item=confirmed.state.inventory.find(i=>i.item===target.item);for(const [key,value] of Object.entries(target))assert.equal(item?.[key],value,`Unexpected ${key}`);
    for(const original of baseline.filter(i=>i.item!==target.item))assert.deepEqual(confirmed.state.inventory.find(i=>i.item===original.item),original);
   }
   row.passed=true;
  }catch(error){row.error=error.message;console.error('FAIL',sample.id,mode,error.message);}
  row.totalMs=Math.round(performance.now()-started);console.log(row.passed?'PASS':'FAIL',sample.id,mode,row.status??'',row.transcript??'');await save();
 }
 const pair=report.results.filter(r=>r.sampleId===sample.id),comparison={sampleId:sample.id,passed:false};
 try{assert.ok(pair.every(r=>r.passed),'Both paths must pass');assert.equal(pair[0].status,pair[1].status);assert.deepEqual(pair[0].finalInventory,pair[1].finalInventory);if(sample.id!=='new-cartons')assert.equal(pair[0].action.mode,pair[1].action.mode);else {assert.equal(pair[0].draft.request.quantity,pair[1].draft.request.quantity);assert.equal(pair[0].draft.request.unit,pair[1].draft.request.unit);}comparison.passed=true;}catch(error){comparison.error=error.message;}
 report.comparisons.push(comparison);await save();
}
report.passed=report.results.every(r=>r.passed)&&report.comparisons.every(r=>r.passed);report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({passed:report.passed,paths:report.results.length,failures:report.results.filter(r=>!r.passed).map(r=>({sampleId:r.sampleId,mode:r.mode,error:r.error}))}));if(!report.passed)process.exitCode=1;
