import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resilientGemini,createAnalysisCache} from './lib/resilience.mjs';
import {handleAnalysis} from './lib/analysis.mjs';
const env={GEMINI_API_KEY:'mock',GEMINI_FREE_TIER_CONFIRMED:'true'};
let time=Date.now(),calls=0;const circuit=new Map,quota=new Map,runtime={now:()=>time,circuit,quota};
const ok=value=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]});
const busy=async()=>{calls++;return Response.json({error:{status:'UNAVAILABLE'}},{status:503});};
await assert.rejects(()=>resilientGemini(env,{},busy,runtime),e=>e.code==='UNAVAILABLE'&&e.retryAfter===60);assert.equal(calls,1);
await assert.rejects(()=>resilientGemini(env,{},busy,runtime),e=>e.code==='REQUEST_COOLDOWN'&&e.previousCode==='UNAVAILABLE');assert.equal(calls,1,'same request cooldown must not call Google');
await resilientGemini(env,{},async()=>{calls++;return ok({});},{...runtime,key:'another-work',stage:'identify'});assert.equal(calls,2,'another work must reach Google during transient cooldown');
await resilientGemini(env,{},async()=>{calls++;return ok({});},{...runtime,stage:'interpret'});assert.equal(calls,3,'another stage must not inherit transient cooldown');
time+=61000;
await assert.rejects(()=>resilientGemini(env,{},async()=>{calls++;throw new DOMException('timeout','TimeoutError')},runtime),e=>e.code==='UPSTREAM_TIMEOUT');assert.equal(calls,4);
time+=61000;
await assert.rejects(()=>resilientGemini(env,{},async()=>Response.json({error:{status:'RESOURCE_EXHAUSTED'}},{status:429,headers:{'retry-after':'90'}}),runtime),e=>e.status===429&&e.retryAfter===90);
await assert.rejects(()=>resilientGemini(env,{},async()=>{throw new Error('must not call Google');},{...runtime,key:'another-work'}),e=>e.status===429&&e.code==='RESOURCE_EXHAUSTED','real quota applies across works');
time+=91000;
const cache=createAnalysisCache({now:()=>time}),seed=JSON.parse(fs.readFileSync(new URL('./lib/seed.json',import.meta.url)));
let identify=0,lookup=0,interpret=0,fail=true;
const fixture={status:'ready',message:'완료',candidates:[],work:{title:'창백한 불꽃',creator:'블라디미르 나보코프',type:'문학',year:'1962',features:Array(8).fill(8),penalties:[0,0,0],evidence:Array(8).fill('근거'),reason:'이유',risk:'거리감',bridge:'연결',confidence:'보통'}};
const fetcher=async(url,options)=>{
 if(url.includes('wikipedia.org')){lookup++;return Response.json({query:{pages:{1:{title:'Pale Fire',fullurl:'https://en.wikipedia.org/wiki/Pale_Fire',extract:'a'.repeat(14000)}}}});}
 assert.ok(url.endsWith('/gemini-3.1-flash-lite:generateContent'));
 const body=JSON.parse(options.body);
 if(body.generationConfig.responseJsonSchema.properties.summary){identify++;assert.equal(body.generationConfig.maxOutputTokens,512);return ok({summary:'확인',queries:[{language:'en',query:'Pale Fire'}]});}
 interpret++;assert.equal(body.generationConfig.maxOutputTokens,2048);
 const input=JSON.parse(body.contents[0].parts[0].text);assert.ok(input.research.length<=8000);assert.ok(!('reason' in input.referenceWorks[0]));
 return fail?Response.json({error:{status:'UNAVAILABLE'}},{status:503}):ok(fixture);
};
const req=ip=>new Request('https://example.com/api/analyze',{method:'POST',headers:{origin:'https://example.com','cf-connecting-ip':ip},body:JSON.stringify({query:'창백한 불꽃',type:'문학'})});
const options={...runtime,cache};let response=await handleAnalysis(req('1'),env,seed,fetcher,options),data=await response.json();assert.equal(response.status,503);assert.equal(data.stage,'interpret');assert.equal(data.code,'UNAVAILABLE');assert.match(data.message,/Google 서버/);
response=await handleAnalysis(req('1'),env,seed,fetcher,options);data=await response.json();assert.equal(data.code,'REQUEST_COOLDOWN');assert.equal(data.previousCode,'UNAVAILABLE');assert.match(data.message,/이번 요청은 Google에 보내지 않았습니다/);assert.equal(interpret,1);
time+=61000;fail=false;response=await handleAnalysis(req('1'),env,seed,fetcher,options);assert.equal(response.status,200);assert.equal((await response.json()).status,'ready');assert.equal(identify,1);assert.equal(lookup,1);assert.equal(interpret,2,'resume only the failed stage');
response=await handleAnalysis(req('2'),env,seed,fetcher,options);assert.equal((await response.json()).cached,true);assert.equal(interpret,2,'public result reused across visitors');
console.log('Passed: single upstream attempt, work/stage cooldown isolation, explicit cooldown message, shared quota, timeout distinction, compact request, resume and public result cache');
