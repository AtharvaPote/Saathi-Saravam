import {env} from 'cloudflare:workers';
import {sarvam,AppError} from './server';
import {gemmaRequest,gemmaMessage} from './gemma-protocol';
export type ModelProvider='sarvam'|'gemma';
export const modelAvailability=()=>({sarvam:!!(env as any).SARVAM_API_KEY,gemma:!!(env as any).GEMINI_API_KEY});
export async function modelCompletion(messages:any[],tools:any[],provider:ModelProvider='sarvam'){
 if(provider==='sarvam'){const r=await sarvam('/v1/chat/completions',{model:'sarvam-105b',reasoning_effort:null,temperature:0.1,max_tokens:1300,tools,tool_choice:'auto',messages});return r.choices?.[0]?.message;}
 const key=(env as any).GEMINI_API_KEY;if(!key)throw new AppError('Gemma 4 is prepared but not connected. The owner needs to configure the GEMINI_API_KEY server secret.',503);
 const model='gemma-4-26b-a4b-it';let r:Response;
 const body=JSON.stringify(gemmaRequest(messages,tools));
 try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body,signal:AbortSignal.timeout(60000)});}catch(error){const timedOut=error instanceof Error&&['TimeoutError','AbortError'].includes(error.name);throw new AppError(timedOut?'Gemma did not respond in time. Please try again.':'Could not reach Gemma. Please try again.',timedOut?504:502);}
 if(!r.ok){await r.text();throw new AppError(r.status===401||r.status===403?'Google rejected the Gemini API key or model access.':r.status===429?'The Gemini API quota was reached. Try again later.':`Gemma could not complete the request (${r.status}).`,502);}
 let data:any;try{data=await r.json();}catch{throw new AppError('Gemma returned an unreadable response. Please try again.',502);}
 try{return gemmaMessage(data);}catch(error){throw new AppError(error instanceof Error?error.message:'Gemma returned an invalid response. Please try again.',502);}
}
