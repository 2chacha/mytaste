const FREE_MODELS=['gemini-3.1-flash-lite'];
const circuit=new Map, quota=new Map;
export class APIError extends Error {
 constructor(status,code,retryAfter=0){super(code);this.status=status;this.code=code;this.retryAfter=retryAfter;}
}
export function retrySeconds(headers,data,now=Date.now(),fallback=60){
 const value=headers.get('retry-after');
 const seconds=value?(Number.isFinite(Number(value))?Number(value):(Date.parse(value)-now)/1000):0;
 const delay=(data.error?.details||[]).find(d=>typeof d.retryDelay==='string')?.retryDelay;
 return Math.max(0,Math.min(86400,Math.ceil(Math.max(seconds||0,parseFloat(delay)||0,fallback))));
}
export async function resilientGemini(env,payload,fetcher=fetch,options={}){
 const now=options.now||Date.now,deadline=options.deadline||now()+120000;
 const model=env.GEMINI_MODEL||FREE_MODELS[0];
 if(!FREE_MODELS.includes(model))throw new APIError(403,'FREE_MODEL_REQUIRED');
 const unavailable=fetcher===fetch?circuit:(options.circuit||new Map),quotas=fetcher===fetch?quota:(options.quota||new Map);
 const credential=env.GEMINI_API_KEY,circuitKey=credential+'|'+model+'|'+(options.key||'direct')+'|'+(options.stage||'request');
 for(const map of [unavailable,quotas]){for(const [k,v] of map)if(v.until<=now())map.delete(k);if(map.size>100)map.clear();}
 for(const [map,key] of [[quotas,credential],[unavailable,circuitKey]]){const saved=map.get(key);if(saved&&saved.until>now()){const error=new APIError(saved.status,map===unavailable?'REQUEST_COOLDOWN':saved.code,Math.ceil((saved.until-now())/1000));if(map===unavailable)error.previousCode=saved.code;throw error;}}
 if(deadline-now()<1000)throw new APIError(503,'ANALYSIS_TIMEOUT',60);
 try{
 const r=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'x-goog-api-key':credential,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(Math.min(45000,Math.max(1,deadline-now())))});
 let data;try{data=await r.json();}catch(e){if(e.name==='TimeoutError'||e.name==='AbortError')throw e;throw new APIError(r.status>=500?r.status:502,'INVALID_RESPONSE',60);}
 if(!r.ok)throw new APIError(r.status,data.error?.status||'API_ERROR',retrySeconds(r.headers,data,now(),r.status===429?60:0));
 if(data.candidates?.[0]?.finishReason!=='STOP'||!data.candidates?.[0]?.content?.parts?.some(p=>typeof p.text==='string'&&!p.thought))throw new APIError(422,'INCOMPLETE_RESPONSE',60);
 unavailable.delete(circuitKey);return {...data,analysisModel:model};
 }catch(error){
 const e=error instanceof APIError?error:new APIError(503,['TimeoutError','AbortError'].includes(error.name)?'UPSTREAM_TIMEOUT':'NETWORK_UNAVAILABLE',60);
 if(e.status===429){e.retryAfter=Math.max(60,e.retryAfter);quotas.set(credential,{until:now()+e.retryAfter*1000,status:429,code:e.code});}
 else if([408,500,502,503,504].includes(e.status)){e.retryAfter=Math.max(60,e.retryAfter);unavailable.set(circuitKey,{until:now()+e.retryAfter*1000,status:503,code:e.code});}
 throw e;
 }
}

export function createAnalysisCache({now=Date.now,edge=false}={}){
 const memory=new Map;
 const edgeRequest=key=>new Request('https://resonance-reading-room.chmn-lee.chatgpt.site/__analysis-cache/v5/'+key);
 return {
  async get(key){
   const entry=memory.get(key);if(entry&&entry.expires>now())return structuredClone(entry.value);memory.delete(key);
   if(edge&&globalThis.caches?.open)try{const store=await caches.open('mytaste-public-analysis-v5');const r=await store.match(edgeRequest(key));if(r){const e=await r.json();if(e.expires>now()){memory.set(key,e);while(memory.size>150)memory.delete(memory.keys().next().value);return structuredClone(e.value);}}}catch{}
   return null;
  },
  async put(key,value,ttl){
   const entry={value:structuredClone(value),expires:now()+ttl*1000};
   memory.delete(key);memory.set(key,entry);for(const [k,e] of memory)if(e.expires<=now())memory.delete(k);while(memory.size>150)memory.delete(memory.keys().next().value);
   if(edge&&globalThis.caches?.open)try{const store=await caches.open('mytaste-public-analysis-v5');await store.put(edgeRequest(key),Response.json(entry,{headers:{'cache-control':'public, max-age='+ttl}}));}catch{}
  }
 };
}
export const analysisCache=createAnalysisCache({edge:true});
export async function analysisKey(identity,query,type,scope,seed){
 const text=JSON.stringify(['analysis-v5',identity,query.trim().normalize('NFKC').toLowerCase().replace(/\s+/g,' '),type,scope.trim(),seed]);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const inFlight=new Map;
export async function singleAnalysis(key,task){
 if(inFlight.has(key))return inFlight.get(key);
 if(inFlight.size>=2)throw new APIError(429,'LOCAL_BUSY',15);
 const promise=Promise.resolve().then(task);inFlight.set(key,promise);
 try{return await promise;}finally{inFlight.delete(key);}
}
