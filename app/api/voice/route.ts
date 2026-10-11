import { identity, checkOrigin, quota, sarvam, AppError, fail, json } from '../../lib/server';
export async function POST(req:Request){try{
 checkOrigin(req);const {key,profile}=await identity();
 if(Number(req.headers.get('content-length')||0)>8000000)throw new AppError('Please record less than 25 seconds.',413);
 await quota(key,profile);
 if(req.headers.get('content-type')?.includes('multipart/form-data')){
  const incoming=await req.formData();const file=incoming.get('file');
  if(!(file instanceof File)||file.size===0||file.size>8000000)throw new AppError('Please record a short audio message.');
  const form=new FormData();form.append('file',file);form.append('model','saaras:v3');form.append('language_code','unknown');form.append('mode','transcribe');
  const result=await sarvam('/speech-to-text',form,true);
  if(!result.transcript?.trim())throw new AppError('I couldn’t hear any words. Please try again.');
  return json({transcript:result.transcript});
 }
 const body=await req.json() as any;
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>2500)throw new AppError('The reply is too long to read aloud.');
 const language=['en-IN','hi-IN','mr-IN'].includes(body.language)?body.language:'en-IN';
 const result=await sarvam('/text-to-speech',{text:body.text,language_code:language,model:'bulbul:v3',speaker:'ritu',pace:0.95});
 if(!result.audios?.[0])throw new AppError('No audio was returned. Please try again.',502);
 return json({audio:result.audios[0]});
}catch(e){return fail(e);}}
