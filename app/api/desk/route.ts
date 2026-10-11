import { chat } from '../../lib/chat';
import { propose, decide, requestId } from '../../lib/action-service';
import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { profiles, type Profile } from '../../lib/domain';
import { identity, readState, checkOrigin, fail, AppError, json } from '../../lib/server';
export async function GET(){try{
 const {user,profile,key}=await identity(false);
 return json({signedIn:true,profile,account:profile?profiles[profile]:null,state:profile?(await readState(key,profile)).state:null,voiceConfigured:!!(env as any).SARVAM_API_KEY,owner:user.displayName});
}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);
 if(Number(req.headers.get('content-length')||0)>20000)throw new AppError('This message is too long.',413);
 const b=await req.json() as any;
 if(b.op==='login'){
  await identity(false);
  const profile:Profile|null=b.email==='shop@saathi.demo'?'shop':b.email==='farmer@saathi.demo'?'farm':null;
  if(!profile||b.password!=='Saathi@123')throw new AppError('Please use one of the two demo accounts below.',401);
  (await cookies()).set('saathi-demo',profile,{httpOnly:true,sameSite:'strict',secure:new URL(req.url).protocol==='https:',path:'/',maxAge:604800});
  return json({ok:true});
 }
 const {profile,key}=await identity();
 if(b.op==='logout'){(await cookies()).delete('saathi-demo');return json({ok:true});}
 if(b.op==='propose')return json(await propose({profile,key},b.action,b.language,requestId(b.requestId)));
 if(b.op==='confirm'||b.op==='cancel')return json(await decide({profile,key},b.id,b.op));
 if(b.op==='task-done'){
  const {state}=await readState(key,profile);const t=state.tasks.find(t=>t.id===b.id);if(!t)throw new AppError('Task not found.');
  return json(await propose({profile,key},{type:'task_status',id:t.id,done:!t.done},b.language,requestId(b.requestId)));
 }
 if(b.op==='chat')return json(await chat({profile,key},b));
 throw new AppError('Unknown action.');
}catch(e){return fail(e);}}
