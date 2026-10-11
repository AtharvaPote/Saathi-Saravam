import { z } from 'zod';
import { chatMessages } from './chat-prompt';
import { modelCompletion } from './model';
import { profiles, today, describe, prepareMessage, spokenDecision, normalizeName, farmSummary, type Message } from './domain';
import { toolsFor, actionFromTool } from './action-registry';
import { type Scope, decide, domainCall, actionResponse, requestId as validateRequestId } from './action-service';
import { readState, mutate, quota, sarvam, AppError } from './server';
const inputSchema=z.object({text:z.string().trim().min(1).max(2000),language:z.enum(['en-IN','hi-IN','mr-IN']).default('en-IN'),provider:z.enum(['sarvam','gemma']).default('sarvam'),requestId:z.string().optional(),confirmId:z.string().optional()});
export async function chat(scope:Scope,body:unknown){
 const input=inputSchema.parse(body);const requestId=validateRequestId(input.requestId);const {state:context}=await readState(scope.key,scope.profile);
 if(requestId){const previous=context.messages.find(m=>m.requestId===requestId);if(previous)return {...actionResponse(context,previous.id),reply:previous.text};}
 const decision=spokenDecision(input.text);
 if(decision){
  if(!input.confirmId){
   if(decision==='cancel'&&context.inventoryDraft){const state=await mutate(scope.key,scope.profile,s=>{delete s.inventoryDraft;});return {state,reply:'Stock request cancelled. No inventory was changed.'};}
   throw new AppError('There is no displayed action to confirm. Ask for a change first.');
  }
  const result=await decide(scope,input.confirmId,decision);
  const reply=result.status==='review_updated'?'The records changed. Please check the updated totals and confirm again.':result.status==='saved'?'Saved. Your records are updated.':'Cancelled. Nothing was changed.';
  const state=await mutate(scope.key,scope.profile,s=>{s.messages.push({id:crypto.randomUUID(),role:'user',text:input.text,at:new Date().toISOString()},{id:crypto.randomUUID(),role:'assistant',text:reply,at:new Date().toISOString(),requestId});s.messages=s.messages.slice(-100);});
  return {...result,state,reply};
 }
 await quota(scope.key,scope.profile);
 const messages=chatMessages(context,scope.profile,input,today(),profiles[scope.profile]);
 let modelMessage:any;
 for(let round=0;round<3;round++){
  modelMessage=await modelCompletion(messages,toolsFor(scope.profile),input.provider);
  const calls=modelMessage?.tool_calls;
  if(!calls?.length||calls.some((c:any)=>!['read_inventory','read_farm'].includes(c.function?.name)))break;
  if(calls.length>3)throw new AppError('Please ask for one record lookup at a time.');
  messages.push(modelMessage);
  for(const c of calls){
   const expected=scope.profile==='farm'?'read_farm':'read_inventory';if(c.function.name!==expected)throw new AppError('That record lookup is unavailable in this workspace.');
   let args;try{args=JSON.parse(c.function.arguments);}catch{throw new AppError('Saathi could not read that request. Please try again.',502);}
   const query=normalizeName(typeof args?.query==='string'?args.query:'');
   const records=scope.profile==='farm'?{crops:context.farmCrops||[],expenses:context.farmExpenses||[],tasks:context.tasks,summary:farmSummary(context)}:{items:context.inventory.filter(i=>normalizeName(i.item).includes(query))};
   messages.push({role:'tool',tool_call_id:c.id,content:JSON.stringify(records)});
  }
 }
 const calls=modelMessage?.tool_calls||[];let action:unknown;
 if(calls.length){
  if(calls.length!==1||['read_inventory','read_farm'].includes(calls[0].function?.name))throw new AppError('Please ask for one change at a time so you can review it clearly.');
  let args;try{args=JSON.parse(calls[0].function.arguments);}catch{throw new AppError('Saathi could not format that action. Please repeat it.',502);}
  action=domainCall(()=>actionFromTool(calls[0].function.name,args,scope.profile,context,input.text));
 }
 const reply=typeof modelMessage?.content==='string'?modelMessage.content.trim().slice(0,2500):'';
 if(!action&&!reply)throw new AppError('Saathi returned an empty reply. Please try again.',502);
 let messageId='';const state=await mutate(scope.key,scope.profile,s=>{
  if(requestId){const existing=s.messages.find(m=>m.requestId===requestId);if(existing){messageId=existing.id;return;}}
  s.messages.push({id:crypto.randomUUID(),role:'user',text:input.text,at:new Date().toISOString()});
  let m:Message;
  if(action)m=domainCall(()=>prepareMessage(s,action,scope.profile,input.language,requestId));
  else{m={id:crypto.randomUUID(),role:'assistant',text:reply,at:new Date().toISOString(),requestId};s.messages.push(m);}
  messageId=m.id;s.messages=s.messages.slice(-100);
 });
 return actionResponse(state,messageId);
}
