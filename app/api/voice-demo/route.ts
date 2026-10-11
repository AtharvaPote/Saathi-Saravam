import {z} from 'zod';
import {identity,checkOrigin,mutate,readState,quota,AppError,fail,json} from '../../lib/server';
import {chat} from '../../lib/chat';
import {modelAvailability} from '../../lib/model';
import {decide} from '../../lib/action-service';
import {voiceDemoState} from '../../lib/voice-demo';
import {voiceSamples} from '../../lib/voice-samples';
const input=z.object({op:z.enum(['run','confirm','cancel']),sampleId:z.string(),mode:z.enum(['text','voice']),provider:z.enum(['sarvam','gemma']).default('sarvam'),transcript:z.string().trim().min(1).max(2000).optional(),id:z.string().max(100).optional()}).strict();
export async function GET(){try{await identity();return json({providers:modelAvailability()});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);const owner=await identity();if(owner.profile!=='shop')throw new AppError('Choose the shop demo to try these inventory samples.',403);
 const text=await req.text();if(text.length>5000)throw new AppError('Request too large.',413);const body=input.parse(JSON.parse(text));
 const sample=voiceSamples.find(s=>s.id===body.sampleId);if(!sample)throw new AppError('Sample not found.',404);
 if(!modelAvailability()[body.provider])throw new AppError(body.provider==='gemma'?'Gemma 4 needs the GEMINI_API_KEY server secret. Choose Sarvam to try the live demo.':'Sarvam is not configured.',503);
 const scope={key:`${owner.key}:voice-demo:${sample.id}:${body.mode}:${body.provider}`,profile:'shop' as const};
 if(body.op!=='run'){if(!body.id)throw new AppError('Choose a displayed demo action.');return json(await decide(scope,body.id,body.op));}
 if(body.mode==='voice'&&!body.transcript)throw new AppError('Transcribe the sample first.');
 // Starting a test resets only this named sandbox case, never the user's main records.
 await quota(owner.key,owner.profile);
 await mutate(scope.key,scope.profile,state=>{for(const key of Object.keys(state))delete (state as any)[key];Object.assign(state,voiceDemoState(sample.id));});
 const message=body.mode==='text'?sample.prompt:body.transcript!;
 const result=await chat(scope,{text:message,language:sample.language,provider:body.provider,requestId:crypto.randomUUID()});
 return json({...result,input:message,mode:body.mode,sampleId:sample.id,sandbox:true});
}catch(e){return fail(e);}}
