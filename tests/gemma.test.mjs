import test from 'node:test';
import assert from 'node:assert/strict';
import {gemmaRequest,gemmaMessage} from '../app/lib/gemma-protocol.ts';

test('system instructions, thinking and supported schema bounds',()=>{
 const tool={function:{name:'prepare_sale',description:'Review only',parameters:{type:'object',additionalProperties:false,properties:{quantity:{type:'number',minimum:0,maximum:100,exclusiveMinimum:0}},required:['quantity']}}};
 const request=gemmaRequest([{role:'system',content:'Review first'},{role:'user',content:'Sell two'}],[tool]);
 assert.equal(request.systemInstruction.parts[0].text,'Review first');
 assert.equal(request.generationConfig.thinkingConfig.thinkingLevel,'high');
 assert.deepEqual(request.tools[0].functionDeclarations[0].parameters.properties.quantity,{type:'number',minimum:0,maximum:100});
 assert.equal(request.tools[0].functionDeclarations[0].parameters.additionalProperties,undefined);
 assert.equal(gemmaRequest([{role:'user',content:'Hello'}],[]).tools,undefined);
});

test('parallel tool results preserve call IDs and signed model parts',()=>{
 const parts=[{text:'private reasoning',thought:true},{functionCall:{id:'native-a',name:'read_inventory',args:{query:'rice'}},thoughtSignature:'opaque-signature'},{functionCall:{id:'native-b',name:'read_inventory',args:{query:'oil'}}}];
 const message=gemmaMessage({candidates:[{finishReason:'STOP',content:{parts}}]});
 assert.equal(message.content,'');
 const request=gemmaRequest([{role:'user',content:'Check stock'},message,...message.tool_calls.map(c=>({role:'tool',tool_call_id:c.id,content:'{"items":[]}'}))],[]);
 assert.deepEqual(request.contents[1].parts,parts);
 assert.equal(request.contents.length,3);
 assert.deepEqual(request.contents[2].parts.map(p=>p.functionResponse.id),['native-a','native-b']);
 assert.equal(request.contents[2].parts[0].functionResponse.name,'read_inventory');
});

test('locally generated IDs do not invent native IDs',()=>{
 const message=gemmaMessage({candidates:[{content:{parts:[{functionCall:{name:'read_inventory',args:{}}}]}}]});
 assert.ok(message.tool_calls[0].id);
 const request=gemmaRequest([message,{role:'tool',tool_call_id:message.tool_calls[0].id,content:'[]'}],[]);
 assert.equal(request.contents[1].parts[0].functionResponse.id,undefined);
 assert.deepEqual(request.contents[1].parts[0].functionResponse.response,{result:[]});
 assert.throws(()=>gemmaRequest([{role:'tool',tool_call_id:'missing',content:'{}'}],[]),/Missing/);
});

test('thought text and thought calls are never returned as answers or actions',()=>{
 const message=gemmaMessage({candidates:[{content:{parts:[{thought:true,text:'secret'},{thought:true,functionCall:{name:'prepare_sale',args:{}}},{text:'You have five bags.'}]}}]});
 assert.equal(message.content,'You have five bags.');
 assert.equal(message.tool_calls,undefined);
});

test('blocked, truncated, empty and invalid outputs fail closed',()=>{
 assert.throws(()=>gemmaMessage({promptFeedback:{blockReason:'SAFETY'}}),/no usable/);
 assert.throws(()=>gemmaMessage({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{functionCall:{name:'prepare_sale',args:{}}}]}}]}),/response limit/);
 assert.throws(()=>gemmaMessage({candidates:[{content:{parts:[{thought:true,text:'thinking'}]}}]}),/empty/);
 assert.throws(()=>gemmaMessage({candidates:[{content:{parts:[{functionCall:{name:'prepare_sale',args:[]}}]}}]}),/invalid action/);
});
