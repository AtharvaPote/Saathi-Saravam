'use client';
import {useEffect,useState} from 'react';
import {AudioLines,Check,LoaderCircle,MessageCircle,Mic,Play,Sparkles,X} from 'lucide-react';
import {voiceSamples} from './lib/voice-samples';
import type {Message,State} from './lib/domain';
type Mode='text'|'voice';type Provider='sarvam'|'gemma';
type Result={proposal:Message;reply:string;state:State;status:string;input:string;elapsed:number};
export default function VoiceDemoPanel({onClose}:{onClose:()=>void}){
 const [selected,setSelected]=useState<string>(voiceSamples[0].id),[provider,setProvider]=useState<Provider>('sarvam');
 const [providers,setProviders]=useState({sarvam:true,gemma:false}),[results,setResults]=useState<Record<string,Result>>({});
 const [busy,setBusy]=useState(''),[phase,setPhase]=useState(''),[error,setError]=useState('');
 const sample=voiceSamples.find(s=>s.id===selected)!;
 const key=(mode:Mode)=>`${provider}:${selected}:${mode}`;
 useEffect(()=>{let live=true;fetch('/api/voice-demo').then(r=>r.json()).then((b:any)=>{if(live&&b.providers)setProviders(b.providers);}).catch(()=>{});return()=>{live=false;};},[]);
 async function post(body:unknown){const r=await fetch('/api/voice-demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data:any=await r.json();if(!r.ok)throw new Error(data.error||'This demo could not finish.');return data;}
 async function run(mode:Mode){
  if(busy)return;setBusy(mode);setError('');setPhase(mode==='voice'?'Transcribing the Bulbul sample…':'Understanding the typed request…');const started=performance.now();
  try{
   let transcript:string|undefined;
   if(mode==='voice'){
    const audio=await fetch(sample.file);if(!audio.ok)throw new Error('Audio sample unavailable.');const form=new FormData();form.append('file',await audio.blob(),'sample.wav');
    const r=await fetch('/api/voice',{method:'POST',body:form}),data:any=await r.json();if(!r.ok)throw new Error(data.error);transcript=data.transcript;setPhase('Using the transcript in voice chat…');
   }
   const result=await post({op:'run',sampleId:sample.id,mode,provider,transcript});
   setResults(old=>({...old,[key(mode)]:{...result,elapsed:Math.round((performance.now()-started)/100)/10}}));
  }catch(e){setError((e as Error).message);}finally{setBusy('');setPhase('');}
 }
 async function confirm(mode:Mode){const previous=results[key(mode)];if(!previous||busy)return;setBusy(mode);setError('');setPhase('Saving in this demo sandbox…');try{const result=await post({op:'confirm',sampleId:sample.id,mode,provider,id:previous.proposal.id});setResults(old=>({...old,[key(mode)]:{...previous,...result}}));}catch(e){setError((e as Error).message);}finally{setBusy('');setPhase('');}}
 return <div className="modal-layer voice-demo-layer"><button className="modal-backdrop" onClick={onClose} aria-label="Dismiss voice demo"/>
  <section className="voice-demo-panel" role="dialog" aria-modal="true" aria-labelledby="voice-demo-title">
   <header><span className="tile-icon sage"><AudioLines/></span><div><span className="eyebrow">FIVE WAYS TO TRY SAATHI</span><h2 id="voice-demo-title">Hear it. Try it. See it work.</h2></div><button className="icon-button" onClick={onClose} aria-label="Close voice demos"><X/></button></header>
   <div className="voice-demo-body"><p className="voice-demo-lead">Five real Bulbul recordings. Send the words directly, or send the audio through speech recognition and compare the results. Each test starts with its own sample stock.</p>
    <div className="voice-demo-settings"><span className="pill"><Check size={13}/> Separate test space · your shop records stay unchanged</span><label>Reasoning model<select value={provider} disabled={!!busy} onChange={e=>setProvider(e.target.value as Provider)}><option value="sarvam">Sarvam 105B {providers.sarvam?'· connected':''}</option><option value="gemma" disabled={!providers.gemma}>Gemma 4 · {providers.gemma?'connected':'needs connection'}</option></select></label></div>
    {!providers.gemma&&<p className="gemma-note"><Sparkles size={14}/> Hosted Gemma 4 is prepared for comparison. It needs a Google Gemini API connection before a live test.</p>}
    <div className="voice-sample-tabs" role="group" aria-label="Voice samples">{voiceSamples.map((s,index)=><button key={s.id} disabled={!!busy} aria-pressed={s.id===selected} onClick={()=>{setSelected(s.id);setError('');}}><span>{String(index+1).padStart(2,'0')}</span>{s.title}</button>)}</div>
    <article className="voice-sample-card"><div className="sample-copy"><span className="eyebrow">{sample.language==='hi-IN'?'HINDI':'ENGLISH'} · BULBUL V3</span><h3>{sample.prompt}</h3><p>{sample.context}</p><p className="sample-expected"><strong>What should happen:</strong> {sample.expected}</p></div><div className="sample-audio"><span><Play size={14}/> Listen to the generated sample</span><audio key={sample.file} controls preload="none" src={sample.file}/><a href={sample.file} download>Download WAV</a></div></article>
    <div className="demo-comparison">{(['text','voice'] as Mode[]).map(mode=>{const result=results[key(mode)],proposal=result?.proposal;return <section key={mode} className="comparison-side"><div className="comparison-title">{mode==='text'?<MessageCircle size={20}/>:<Mic size={20}/>}<div><h3>{mode==='text'?'Normal text input':'Simulated voice input'}</h3><p>{mode==='text'?'Prompt → model → action':'Bulbul audio → transcription → model → action'}</p></div></div><button className={mode==='voice'?'primary wide':'secondary wide'} disabled={!!busy||!providers[provider]} onClick={()=>run(mode)}>{busy===mode?<><LoaderCircle size={16} className="spin"/>{phase}</>:<><Play size={15}/>{mode==='text'?'Try as text':'Try as voice'}</>}</button>{result?<div className="demo-result"><span className="pill">{result.status==='needs_input'?'Follow-up question':result.status==='saved'?'Saved in demo':result.status==='pending'?'Waiting for confirmation':'Reply'} · {result.elapsed}s</span><label>{mode==='voice'?'Transcribed words':'Words sent'}</label><blockquote>{result.input}</blockquote><label>Saathi</label><p>{proposal.text}</p>{proposal.review&&<><strong>{proposal.review.summary}</strong><dl className="review-facts">{proposal.review.lines.map(l=><div key={l.label}><dt>{l.label}</dt><dd>{l.value}</dd></div>)}</dl></>}{proposal.action&&<details><summary>Structured action</summary><pre>{JSON.stringify(proposal.action,null,2)}</pre></details>}{result.status==='pending'&&<button className="primary compact" disabled={!!busy} onClick={()=>confirm(mode)}><Check size={15}/> Confirm in demo</button>}{result.status==='saved'&&<p className="demo-saved"><Check size={14}/> Saved only in this test space.</p>}</div>:<p className="demo-placeholder">Run this path to see the recognized words, reply and proposed action.</p>}</section>;})}</div>
    {error&&<p className="demo-error" role="alert">{error}</p>}<p className="voice-demo-foot">No microphone is needed for these samples. “Try as voice” uploads the saved recording through the same speech endpoint as the microphone. Running a path again resets that test case.</p>
   </div>
  </section>
 </div>;
}
