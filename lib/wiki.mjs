import {APIError} from './resilience.mjs';

// Search results are candidates, never proof that the requested work was identified.
export async function publicResearch(query,fetcher=fetch,options={}){
 const deadline=Math.min(options.deadline||Date.now()+30000,Date.now()+30000);
 let completed=0;
 const read=async(language,extra)=>{
  const remaining=deadline-Date.now();if(remaining<=0)throw new Error('wiki_timeout');
  const params=new URLSearchParams({action:'query',format:'json',redirects:'1',prop:'extracts|info|langlinks|pageprops',inprop:'url',explaintext:'1',exintro:'1',exchars:'4000',exlimit:'max',lllang:language==='ko'?'en':'ko',lllimit:'max',...extra});
  const response=await fetcher('https://'+language+'.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':'Yeoun/1.0 (personal literature and film reference lookup)'},signal:AbortSignal.timeout(Math.min(12000,remaining))});
  if(!response.ok)throw new Error('wiki_http');
  const data=await response.json();if(data.error)throw new Error('wiki_api');completed++;
  return Object.values(data.query?.pages||{}).filter(p=>!('missing' in p)&&typeof p.extract==='string'&&p.extract.trim()).sort((a,b)=>(a.index||0)-(b.index||0)).map(p=>({title:p.title,url:p.fullurl||'https://'+language+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),text:p.extract.slice(0,4000),english:language==='ko'?p.langlinks?.find(l=>l.lang==='en')?.['*']:null,disambiguation:p.pageprops&&'disambiguation' in p.pageprops}));
 };
 const text=query.replace(/[|\r\n]/g,' ').trim();
 const search=text.replace(/\s*\/\s*/g,' ').trim();
 const tasks=[read('ko',{titles:text}),read('ko',{generator:'search',gsrsearch:search,gsrnamespace:'0',gsrlimit:'3'})];
 if(!/[가-힣]/.test(text))tasks.push(read('en',{generator:'search',gsrsearch:search,gsrnamespace:'0',gsrlimit:'3'}));
 const initial=await Promise.allSettled(tasks);
 const korean=initial.slice(0,2).flatMap(r=>r.status==='fulfilled'?r.value:[]);
 let english=initial.slice(2).flatMap(r=>r.status==='fulfilled'?r.value:[]);
 const linked=[...new Set(korean.map(p=>p.english).filter(Boolean))].slice(0,3);
 if(linked.length){try{english.push(...await read('en',{titles:linked.join('|')}));}catch{}}
 else if(!korean.length&&/[가-힣]/.test(text)){try{english.push(...await read('en',{generator:'search',gsrsearch:search,gsrnamespace:'0',gsrlimit:'3'}));}catch{}}
 const unique=items=>items.filter((p,i,a)=>a.findIndex(q=>q.url===p.url)===i);
 const ko=unique(korean).slice(0,3),en=unique(english).slice(0,3);
 const pages=unique([0,1,2].flatMap(i=>[ko[i],en[i]].filter(Boolean)));
 if(!completed){const error=new APIError(503,'WIKI_UNAVAILABLE',15);error.stage='research';throw error;}
 const headers=pages.map((p,i)=>'['+(i+1)+'] '+p.title+(p.disambiguation?' (동음이의어 후보 문서)':'')+'\n');
 const allowance=pages.length?Math.max(0,Math.floor((8000-headers.reduce((n,h)=>n+h.length+2,0))/pages.length)):0;
 return {sources:pages.map((p,i)=>({title:'['+(i+1)+'] '+p.title+' · Wikipedia',url:p.url})),researchText:pages.map((p,i)=>headers[i]+p.text.slice(0,allowance)).join('\n\n').slice(0,8000),searchSuggestions:''};
}
