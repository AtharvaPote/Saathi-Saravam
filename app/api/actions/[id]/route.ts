import { identity, readState, checkOrigin, fail, json, AppError } from '../../../lib/server';
import { decide } from '../../../lib/action-service';
type Context={params:Promise<{id:string}>};
export async function GET(_req:Request,{params}:Context){try{const {id}=await params;const scope=await identity();const {state}=await readState(scope.key,scope.profile);const proposal=state.messages.find(m=>m.id===id&&m.action);if(!proposal)throw new AppError('Action not found.',404);return json({proposal});}catch(e){return fail(e);}}
export async function POST(req:Request,{params}:Context){try{
 checkOrigin(req);const {id}=await params;const scope=await identity();const text=await req.text();if(text.length>1000)throw new AppError('Request too large.',413);const b=JSON.parse(text);
 if(b.decision!=='confirm'&&b.decision!=='cancel')throw new AppError('Choose confirm or cancel.');
 return json(await decide(scope,id,b.decision));
}catch(e){return fail(e);}}
