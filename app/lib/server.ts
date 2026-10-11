import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '../chatgpt-auth';
import { seed, type Profile, type State } from './domain';
export class AppError extends Error { constructor(message: string, public status=400){super(message);} }
export async function identity(requireProfile=true) {
 const user=await getChatGPTUser();
 if(!user)throw new AppError('Please sign in to your private Saathi demo first.',401);
 const p=(await cookies()).get('saathi-demo')?.value;
 const profile=p==='farm'?'farm':p==='shop'?'shop':null;
 if(requireProfile&&!profile)throw new AppError('Choose a demo account to continue.',401);
 return {user,profile:profile as Profile,key:`${user.userId}:${profile}`};
}
export function checkOrigin(req:Request) {
 const origin=req.headers.get('origin');
 if(origin && origin!==new URL(req.url).origin)throw new AppError('This request could not be verified.',403);
 if(req.headers.get('sec-fetch-site')==='cross-site')throw new AppError('This request could not be verified.',403);
}
export async function readState(key:string,profile:Profile) {
 if(!env.DB)throw new AppError('The workspace database is not ready.',503);
 await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id,data,version) VALUES (?,?,0)').bind(key,JSON.stringify(seed(profile))).run();
 const row=await env.DB.prepare('SELECT data,version FROM workspaces WHERE id=?').bind(key).first<{data:string;version:number}>();
 if(!row)throw new AppError('Workspace unavailable.',503);
 return {state:JSON.parse(row.data) as State,version:row.version};
}
export async function mutate(key:string,profile:Profile,fn:(s:State)=>void) {
 for(let i=0;i<4;i++){
   const {state,version}=await readState(key,profile); fn(state);
   const r=await env.DB!.prepare('UPDATE workspaces SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(state),key,version).run();
   if(r.meta.changes===1)return state;
 }
 throw new AppError('Another change is being saved. Please try again.',409);
}
export async function quota(key:string,profile:Profile){
 await mutate(key,profile,s=>{
  if(Date.now()-s.usage.start>3600000)s.usage={start:Date.now(),count:0};
  if(s.usage.count>=90)throw new AppError('This demo has reached its hourly voice and AI limit. Please try again later.',429);
  s.usage.count++;
 });
}
export async function sarvam(path:string,body:unknown,form=false) {
 const key=(env as unknown as {SARVAM_API_KEY?:string}).SARVAM_API_KEY;
 if(!key)throw new AppError('Live voice is not configured in this preview. You can still use the sample actions and record forms.',503);
 let response:Response;
 try{response=await fetch(`https://api.sarvam.ai${path}`,{method:'POST',headers:{'api-subscription-key':key,...(form?{}:{'Content-Type':'application/json'})},body:form?body as FormData:JSON.stringify(body),signal:AbortSignal.timeout(45000)});}catch{throw new AppError('Sarvam did not respond in time. Please try again.',504);}
 if(!response.ok) {
  await response.text();
  const message=response.status===401||response.status===403?'Sarvam rejected the API key. The app owner needs to check the key and API access.':response.status===429?'Sarvam’s usage limit was reached. Check API credits or try again shortly.':`The voice service could not complete this request (${response.status}). Please try again.`;
  throw new AppError(message,502);
 }
 return response.json() as Promise<any>;
}
export function fail(error:unknown){
 return Response.json({error:error instanceof AppError?error.message:error instanceof Error&&error.name==='ZodError'?'Please check the required fields and enter valid values.':'We couldn’t save or load that request. Please try again.'},{status:error instanceof AppError?error.status:400});
}
export const json=(body:unknown)=>Response.json(body,{headers:{'Cache-Control':'no-store'}});
