import assert from 'node:assert/strict';
export function client(){
 const base='http://127.0.0.1:5173',jar=new Map();
 async function raw(path,body,form=false){const r=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(body?{origin:base,...(form?{}:{'Content-Type':'application/json'})}:{})},body:body?(form?body:JSON.stringify(body)):undefined});for(const c of r.headers.getSetCookie()){const kv=c.split(';')[0],i=kv.indexOf('=');jar.set(kv.slice(0,i),kv.slice(i+1));}return r;}
 async function request(path,body){const r=await raw(path,body),data=await r.json();assert.equal(r.status,200,data.error||JSON.stringify(data));return data;}
 async function login(profile='shop'){await raw('/signin-with-chatgpt?return_to=/');return request('/api/desk',{op:'login',email:profile==='shop'?'shop@saathi.demo':'farmer@saathi.demo',password:'Saathi@123'});}
 return {raw,request,login};
}
