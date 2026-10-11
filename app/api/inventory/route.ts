import { identity, readState, fail, json, AppError } from '../../lib/server';
import { normalizeName } from '../../lib/domain';
export async function GET(req:Request){try{const scope=await identity();if(scope.profile!=='shop')throw new AppError('Inventory belongs to the shop demo.',403);const {state}=await readState(scope.key,scope.profile);const query=normalizeName(new URL(req.url).searchParams.get('q')||'');return json({items:state.inventory.filter(i=>normalizeName(i.item).includes(query))});}catch(e){return fail(e);}}
