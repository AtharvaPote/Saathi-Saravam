// Read a credential from a hidden terminal; never write it to disk or output.
process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');let input='';
console.log('Ready for secret on stdin (input is hidden).');
process.stdin.on('data',async chunk=>{input+=chunk;if(!/[\r\n]/.test(input))return;process.stdin.pause();process.stdin.setRawMode(false);const key=input.trim();input='';
for(const [name,path,body] of [
 ['chat','/v1/chat/completions',{model:'sarvam-105b',messages:[{role:'user',content:'Reply with ONLY JSON: {"reply":"Namaste", "action":null}'}],max_tokens:80}],
 ['speech','/text-to-speech',{text:'नमस्ते। मैं आपका साथी हूँ।',language_code:'hi-IN',model:'bulbul:v3',speaker:'ritu'}]
]){try{const r=await fetch('https://api.sarvam.ai'+path,{method:'POST',headers:{'api-subscription-key':key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});const data=await r.json();console.log(JSON.stringify({name,status:r.status,reply:data.choices?.[0]?.message?.content,audioReturned:!!data.audios?.[0]}));if(name==='speech'&&data.audios?.[0]){const f=new FormData();f.append('file',new Blob([Buffer.from(data.audios[0],'base64')],{type:'audio/wav'}),'probe.wav');f.append('model','saaras:v3');f.append('language_code','unknown');const tr=await fetch('https://api.sarvam.ai/speech-to-text',{method:'POST',headers:{'api-subscription-key':key},body:f,signal:AbortSignal.timeout(45000)});const td=await tr.json();console.log(JSON.stringify({name:'transcription',status:tr.status,transcript:td.transcript}));}}catch(e){console.log(JSON.stringify({name,error:e.message}));}}
process.exit(0);});
