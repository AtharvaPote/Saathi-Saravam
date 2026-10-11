import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {client} from '../tests/http-client.mjs';
import {voiceSamples} from '../app/lib/voice-samples.ts';
const c=client();await c.login();await mkdir('public/voice-samples',{recursive:true});
for(const sample of voiceSamples){const r=await c.request('/api/voice',{text:sample.prompt,language:sample.language});assert.ok(r.audio);const bytes=Buffer.from(r.audio,'base64');assert.equal(bytes.subarray(0,4).toString(),'RIFF');await writeFile(`public${sample.file}`,bytes);console.log(`Generated ${sample.id}: ${bytes.length} bytes`);}
await writeFile('public/voice-samples/manifest.json',JSON.stringify({provider:'Sarvam',model:'bulbul:v3',speaker:'ritu',generatedAt:new Date().toISOString(),samples:voiceSamples},null,2));
