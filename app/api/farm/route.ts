import { farmSummary } from '../../lib/domain';
import { identity, readState, fail, json, AppError } from '../../lib/server';

export async function GET(){try{
 const {key,profile}=await identity();
 if(profile!=='farm')throw new AppError('Use the farmer demo for farm records.',403);
 const {state}=await readState(key,profile);
 return json({crops:state.farmCrops||[],expenses:state.farmExpenses||[],tasks:state.tasks,summary:farmSummary(state)});
}catch(error){return fail(error);}}
