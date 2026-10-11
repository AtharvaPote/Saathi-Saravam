import { prepareMessage, decideMessage, type Profile, type State } from './domain';
import { mutate, AppError } from './server';
export type Scope={key:string;profile:Profile};
export function domainCall<T>(fn:()=>T):T{try{return fn();}catch(e){if(e instanceof Error&&e.name!=='ZodError')throw new AppError(e.message);throw e;}}
export async function propose(scope:Scope,action:unknown,language='en-IN',requestId?:string){
 let id='';const state=await mutate(scope.key,scope.profile,s=>{id=domainCall(()=>prepareMessage(s,action,scope.profile,language,requestId)).id;});
 return actionResponse(state,id);
}
export function actionResponse(state:State,id:string){
 const proposal=state.messages.find(m=>m.id===id)!;
 return {state,proposal,status:proposal.action?proposal.status:proposal.draftId?'needs_input':'answered',reply:proposal.text+(proposal.status==='pending'&&proposal.review?' ' + proposal.review.summary + '. ' + proposal.review.lines.filter(l=>['Packaging','After confirmation','Bill total','Remaining stock'].includes(l.label)).map(l=>`${l.label}: ${l.value}.`).join(' '):''),...(proposal.draftId?{draftId:proposal.draftId,missing:state.inventoryDraft?.missing}:{} )};
}
export async function decide(scope:Scope,id:string,decision:'confirm'|'cancel'){
 let status='';const state=await mutate(scope.key,scope.profile,s=>{status=domainCall(()=>decideMessage(s,id,decision,scope.profile));});
 return {...actionResponse(state,id),status};
}
export function requestId(value:unknown){if(value===undefined)return undefined;if(typeof value!=='string'||value.length>100||value.length<8)throw new AppError('Please provide a valid request ID.');return value;}
