import { actionDefinitions, toolsFor } from '../../lib/action-registry';
import { identity, checkOrigin, fail, json, AppError } from '../../lib/server';
import { propose, requestId } from '../../lib/action-service';
export async function GET(){try{const {profile}=await identity();return json({version:1,confirmationRequired:true,actions:actionDefinitions.filter(d=>d.profiles.some(p=>p===profile)),tools:toolsFor(profile),endpoints:{farm:'GET /api/farm',inventory:'GET /api/inventory',records:'GET /api/desk',prepare:'POST /api/actions',review:'GET /api/actions/{id}',decide:'POST /api/actions/{id}'}});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 checkOrigin(req);const scope=await identity();const text=await req.text();if(text.length>20000)throw new AppError('Request too large.',413);const b=JSON.parse(text);
 return json(await propose(scope,b.action,b.language,requestId(b.requestId)));
}catch(e){return fail(e);}}
