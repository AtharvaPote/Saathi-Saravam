import { spawn } from 'node:child_process';
process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');let input='';
console.log('Ready for preview secret on stdin (input is hidden).');
process.stdin.on('data',chunk=>{input+=chunk;if(!/[\r\n]/.test(input))return;process.stdin.pause();process.stdin.setRawMode(false);const key=input.trim();input='';const child=spawn('npm',['run','dev','--','--hostname','127.0.0.1'],{stdio:['ignore','inherit','inherit'],env:{...process.env,SARVAM_API_KEY:key}});child.on('exit',code=>process.exit(code??0));process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGINT'));});
