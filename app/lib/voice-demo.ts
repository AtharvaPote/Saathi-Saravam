import {seed,prepareMessage, type State} from './domain';
export function voiceDemoState(sampleId:string):State{
 const state=seed('shop');state.credits=[];state.inventory=[{item:'Rice',quantity:45,unit:'kg',price:60},{item:'Tea',quantity:18,unit:'packs',price:30},{item:'KitKat',quantity:5,unit:'boxes',price:100}];
 if(sampleId==='pack-size'){
  state.messages.push({id:crypto.randomUUID(),role:'user',text:'I just acquired 10 cartons of Maggi. Add them to inventory.',at:new Date().toISOString()});
  prepareMessage(state,{type:'inventory',mode:'add',item:'Maggi',quantity:10,unit:'cartons'},'shop');
 }
 return state;
}
