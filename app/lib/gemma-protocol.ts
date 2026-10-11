// Google generateContent adapter. Keep original parts for signatures and tool history;
// only non-thought text is eligible for a user-facing reply.
export function gemmaRequest(messages:any[],tools:any[]){
 const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
 const calls=new Map<string,{name:string,id?:string}>();const contents:any[]=[];
 for(const m of messages){
  if(m.role==='system')continue;
  if(m.role==='tool'){
   const call=calls.get(m.tool_call_id);
   if(!call)throw new Error('Missing Gemma function call for tool response.');
   const result=JSON.parse(m.content);
   const part={functionResponse:{...call,response:result&&typeof result==='object'&&!Array.isArray(result)?result:{result}}};
   // Parallel results belong to one user turn, in the original call order.
   const previous=contents.at(-1);
   if(previous?.role==='user'&&previous.parts.every((p:any)=>p.functionResponse))previous.parts.push(part);
   else contents.push({role:'user',parts:[part]});
   calls.delete(m.tool_call_id);
   continue;
  }
  const parts:any[]=m._geminiParts?[...m._geminiParts]:[];
  if(!m._geminiParts){
   if(m.content)parts.push({text:m.content});
   for(const call of m.tool_calls||[])parts.push({functionCall:{id:call.id,name:call.function.name,args:JSON.parse(call.function.arguments)}});
  }
  const nativeCalls=parts.filter((p:any)=>p.functionCall&&!p.thought);
  for(const [i,call] of (m.tool_calls||[]).entries()){
   const native=nativeCalls[i]?.functionCall;
   calls.set(call.id,{name:call.function.name,...(native?.id?{id:native.id}:{})});
  }
  if(parts.length)contents.push({role:m.role==='assistant'?'model':'user',parts});
 }
 // Schema is Google's OpenAPI subset. Domain validation remains authoritative.
 function schema(value:any):any {
  const out:any={};
  for(const key of ['type','description','enum','required','minimum','maximum','minLength','maxLength','minItems','maxItems','format'])if(value[key]!==undefined)out[key]=value[key];
  if(value.properties)out.properties=Object.fromEntries(Object.entries(value.properties).map(([k,v])=>[k,schema(v)]));
  if(value.items)out.items=schema(value.items);
  return out;
 }
 return {...(system?{systemInstruction:{parts:[{text:system}]}}:{}),contents,...(tools.length?{tools:[{functionDeclarations:tools.map(t=>({name:t.function.name,description:t.function.description,parameters:schema(t.function.parameters)}))}]}:{}),generationConfig:{temperature:0.1,maxOutputTokens:4096,thinkingConfig:{thinkingLevel:'high'}}};
}
export function gemmaMessage(response:any){
 const candidate=response?.candidates?.[0];
 if(response?.promptFeedback?.blockReason||!candidate)throw new Error('Gemma returned no usable answer. Please rephrase and try again.');
 if(candidate.finishReason&&candidate.finishReason!=='STOP')throw new Error(candidate.finishReason==='MAX_TOKENS'?'Gemma reached its response limit. Please ask a shorter question.':'Gemma could not complete this answer. Please rephrase and try again.');
 const parts=candidate.content?.parts||[];
 const calls=parts.filter((p:any)=>p.functionCall&&!p.thought).map((p:any)=>{
  const call=p.functionCall;
  if(typeof call.name!=='string'||!call.name|| (call.args!==undefined&&(!call.args||typeof call.args!=='object'||Array.isArray(call.args))))throw new Error('Gemma returned an invalid action. Please try again.');
  return {id:call.id||crypto.randomUUID(),type:'function',function:{name:call.name,arguments:JSON.stringify(call.args||{})}};
 });
 const content=parts.filter((p:any)=>typeof p.text==='string'&&!p.thought).map((p:any)=>p.text).join('\n');
 if(!content.trim()&&!calls.length)throw new Error('Gemma returned an empty answer. Please try again.');
 return {role:'assistant',content,...(calls.length?{tool_calls:calls}:{}),_geminiParts:parts};
}
