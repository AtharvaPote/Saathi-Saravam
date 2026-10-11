import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';let jar=new Map();
async function request(path,body,form=false){const r=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(body?{origin:base,...(form?{}:{'Content-Type':'application/json'})}:{})},body:body?(form?body:JSON.stringify(body)):undefined});for(const c of r.headers.getSetCookie()){const[k,v]=c.split(';')[0].split('=');jar.set(k,v);}return r;}
await request('/signin-with-chatgpt?return_to=/');await request('/api/desk',{op:'login',email:'shop@saathi.demo',password:'Saathi@123'});
let r,d;
r=await request('/api/voice',{text:'नमस्ते। मैं आपका साथी हूँ।',language:'hi-IN'});d=await r.json();assert.equal(r.status,200,d.error);assert.ok(d.audio);console.log('PASS server speech route produces playable audio');
const form=new FormData();form.append('file',new Blob([Buffer.from(d.audio,'base64')],{type:'audio/wav'}),'test.wav');r=await request('/api/voice',form,true);d=await r.json();assert.equal(r.status,200,d.error);assert.match(d.transcript,/साथी/);console.log('PASS server transcription route recognizes Hindi speech');
