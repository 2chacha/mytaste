const $=s=>document.querySelector(s), KEY='yeoun-feedback-v1';
let current=null,type='전체',records=[],storageOK=true;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const WORK_KEY='yeoun-works-v1';
let addedWorks=[];
function validWorks(items){
 if(!Array.isArray(items)||items.length>300)throw Error('추가 작품 파일을 확인해 주세요.');
 const ids=new Set(CATALOG.map(w=>w.id));
 return items.map(w=>{if(!w||typeof w.id!=='string'||!/^ai-[a-z0-9-]{1,80}$/.test(w.id)||ids.has(w.id)||!['문학','영화','만화'].includes(w.type)||!['title','creator','year','reason','risk','bridge','connection'].every(k=>typeof w[k]==='string'&&w[k].length<=3000)||!w.title||![['features',8],['penalties',3]].every(([k,n])=>Array.isArray(w[k])&&w[k].length===n&&w[k].every(v=>Number.isInteger(v)&&v>=0&&v<=10))||!Array.isArray(w.evidence)||w.evidence.length!==8||!w.evidence.every(v=>typeof v==='string'&&v.length<=1500)||!Array.isArray(w.sources)||w.sources.length>8||!w.sources.every(s=>s&&typeof s.title==='string'&&s.title.length<2000&&typeof s.url==='string'&&/^https?:\/\//.test(s.url)&&s.url.length<3000))throw Error('추가 작품 데이터가 올바르지 않습니다.');if(w.analysisScope!==undefined&&(typeof w.analysisScope!=='string'||w.analysisScope.length>120))throw Error('분석 범위를 확인해 주세요.');ids.add(w.id);if((w.searchSuggestions!==undefined&&(typeof w.searchSuggestions!=='string'||w.searchSuggestions.length>50000))||(w.researchText!==undefined&&(typeof w.researchText!=='string'||w.researchText.length>20000)))throw Error('검색 근거 형식을 확인해 주세요.');return {...w,origin:'ai',aliases:''};});
}
try{addedWorks=validWorks(JSON.parse(localStorage.getItem(WORK_KEY)||'[]'));CATALOG.push(...addedWorks);}catch{$('#status').textContent='추가 작품을 불러오지 못했습니다. 백업을 확인해 주세요.';}

function validRecords(data){if(!Array.isArray(data)||data.length>CATALOG.length)throw Error('올바른 감상 기록 파일이 아닙니다.');const ids=new Set;for(const r of data){if(!r||!CATALOG.some(w=>w.id===r.id)||ids.has(r.id)||typeof r.rating!=='number'||r.rating<.5||r.rating>5||r.rating*2%1!==0||typeof r.comment!=='string'||r.comment.length>1000)throw Error('기록의 작품·별점·코멘트를 확인해 주세요.');ids.add(r.id);}return data.map(r=>({id:r.id,rating:r.rating,comment:r.comment}));}
try{records=validRecords(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch(e){storageOK=false;$('#status').textContent='기록을 불러오지 못했습니다. 저장 공간 또는 백업 파일을 확인해 주세요.';}
function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));records=next;storageOK=true;return true;}catch(e){$('#status').textContent='저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요. 입력한 내용은 유지됩니다.';return false;}}
const RECENT_KEY='yeoun-recent-v1';
let recentIds=[];
try{const saved=JSON.parse(localStorage.getItem(RECENT_KEY)||'null');recentIds=(Array.isArray(saved)?saved:addedWorks.slice().reverse().map(w=>w.id)).filter((id,i,a)=>typeof id==='string'&&a.indexOf(id)===i&&CATALOG.some(w=>w.id===id)).slice(0,5);}catch{}
function renderRecent(){
 const works=recentIds.map(id=>CATALOG.find(w=>w.id===id)).filter(Boolean);
 $('#recentAnalyses').hidden=!!current||!works.length;
 $('#recentList').innerHTML=works.map(w=>'<button type="button" class="recent-work" data-id="'+esc(w.id)+'"><strong>'+esc(w.title)+'</strong><span>'+esc(w.creator)+' · '+w.type+(w.type==='만화'?' · '+esc(w.analysisScope||'작품 전체'):'')+'</span><span aria-hidden="true">↗</span></button>').join('');
}
function rememberWork(id){recentIds=[id,...recentIds.filter(x=>x!==id)].slice(0,5);try{localStorage.setItem(RECENT_KEY,JSON.stringify(recentIds));}catch{}renderRecent();}
function render(){
 if(!current){$('#result').hidden=true;$('.feedback').hidden=true;document.body.classList.add('is-landing');renderHistory();renderRecent();return;}
 document.body.classList.remove('is-landing');renderRecent();
$('#result').hidden=false;$('.feedback').hidden=false;
const w=current,p=predict(w,records),penalty=w.penalties.reduce((s,v,i)=>s+v*[.8,.6,.6][i],0);
const source=w.origin==='ai'?w.sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a>').join(' · '):w.id==='mulholland'?'<a href="https://www.bfi.org.uk/film/784b550c-9db8-568a-8078-32b4957e2bbb/mulholland-dr" target="_blank" rel="noopener noreferrer">작품 정보 · BFI</a>':w.id==='stalker'?'<a href="https://www.bfi.org.uk/film/0ee193c2-080e-5ff8-9d4b-842cffd8e53a/stalker" target="_blank" rel="noopener noreferrer">작품 정보 · BFI</a>':'문학 정보 · 편집 수록 자료';
const icon=w.type==='만화'?'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 4v16M3 12h9M12 10h9"/>':w.type==='영화'?'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M17 5v14M3 9h4m-4 6h4m10-6h4m-4 6h4"/>':'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zm0 0v14"/>';
const verdict=p.score>=85?'오래 남을 가능성이 높은 작품':p.score>=70?'취향과 맞닿는 지점이 많은 작품':p.score>=50?'끌림과 거리감이 함께 있는 작품':'익숙한 취향 바깥의 작품';
$('#result').innerHTML=`
<h2 class="section-heading result-heading">취향 분석</h2><div class="result-head"><div class="work-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${icon}</svg></div><div><div class="work-meta"><span class="media-label">${w.type}</span><span>${esc(w.year)}</span><span>${esc(w.creator)}</span></div><h3 class="work-title">${esc(w.title)}</h3>${w.type==='만화'?'<p class="scope-note">분석 범위 · '+esc(w.analysisScope||'작품 전체')+'</p>':''}</div><div class="sample-badge">${w.origin==='ai'?'AI 분석 · 자료 충분도 '+esc(w.confidence||'보통'):'편집 평가 기반'}</div></div>
<div class="result-grid"><section class="score-panel" aria-label="취향 적합도"><div class="panel-label">나의 취향 적합도 <span>MODEL SCORE</span></div><div><div class="score">${p.score}<small>/ 100</small></div><div class="verdict">${verdict}</div></div><div><div class="satisfaction"><span>예상 만족도</span><span class="stars" aria-hidden="true"><span style="width:${p.rating/5*100}%">★★★★★</span>★★★★★</span><strong>${p.rating.toFixed(1)} <small>/ 5</small></strong></div><p class="small">확률이 아닌 100점 만점 모델 점수입니다.<br>피드백 보정 ${p.delta>0?"+":""}${p.delta}점 · 예측 신뢰도 미검증</p></div></section>
<section class="axes-panel" aria-label="취향 축별 평가"><div class="axes-heading"><h3>내 취향과 만나는 지점</h3><span>특성 강도 / 10</span></div>${AXES.map((a,i)=>`<div class="bar-row"><span>${a}</span><div class="bar" role="meter" aria-label="${a}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${w.features[i]}"><i style="width:${w.features[i]*10}%"></i></div><span>${w.features[i]}</span></div>`).join("")}<p class="small">${w.origin==='ai'?'검색 자료를 바탕으로 한 AI 해석 · 객관적 측정값 아님':'작품의 특성을 바탕으로 한 주관적 편집 평가'}</p></section></div>
<div class="analysis-grid"><section><h3>잘 맞을 이유</h3><p>${esc(w.reason)}</p></section><section><h3>거리감이 생길 수 있는 부분</h3><p>${esc(w.risk)}</p></section><section class="message-panel"><h3>메시지가 세계를 앞서는가</h3><div class="penalties">${["이데올로기적 직접성","교훈성","과잉 설명"].map((label,i)=>`<div class="penalty-item"><span>${label}</span><strong>${w.penalties[i]} <small>/ 10</small></strong></div>`).join("")}</div><p class="small">총 −${penalty.toFixed(1)}점 · 사회적 주제 자체는 감점하지 않습니다.</p></section></div>
${w.origin==='ai'?'<details class="evidence" open><summary>항목별 분석 근거</summary>'+w.evidence.map((v,i)=>'<p><strong>'+AXES[i]+'</strong><br>'+esc(v)+'</p>').join('')+'</details>':''}${w.researchText?'<details class="research"><summary>검색 자료와 출처</summary><p class="research-text">'+esc(w.researchText)+'</p></details>':''}${w.searchSuggestions?'<iframe class="search-suggestions" title="Google 검색 제안" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" srcdoc="'+esc(w.searchSuggestions)+'"></iframe>':''}<p class="small source-note">${source} · 해석과 점수는 모델의 추정입니다.</p>`;
$('#feedbackWork').textContent=`『${w.title}』${w.type==='만화'?' · '+(w.analysisScope||'작품 전체'):''} 감상 후 남기는 기록`;
const saved=records.find(r=>r.id===w.id);$('#rating').value=saved?.rating||'';$('#comment').value=saved?.comment||'';$('#feedbackForm button').textContent=saved?'감상 수정하기':'감상 기록하기';renderHistory();}
function renderHistory(){$('#count').textContent=records.length;$('#navCount').textContent=records.length;$('#historyList').innerHTML=records.length?records.map(r=>`<div class="record"><button class="text-button" data-delete="${r.id}" aria-label="${esc(CATALOG.find(w=>w.id===r.id).title)} 기록 삭제">삭제</button><strong>${esc(CATALOG.find(w=>w.id===r.id).title)}</strong>${CATALOG.find(w=>w.id===r.id).type==='만화'?'<span class="muted">'+esc(CATALOG.find(w=>w.id===r.id).analysisScope||'작품 전체')+'</span>':''} <span class="muted">${r.rating} / 5</span><p>${esc(r.comment||'코멘트 없이 남긴 기록')}</p></div>`).join(''):'<p>첫 감상을 남기면, 다음 예측에 조금씩 반영됩니다.</p>';}
function closeResults(){
  $('#matches').hidden=true;
  $('#matches').innerHTML='';
}
function selectWork(id){
  const work=CATALOG.find(w=>w.id===id);
  if(!work)throw Error('수록되지 않은 작품입니다.');
  current=work;rememberWork(work.id);closeResults();render();return predict(work,records);
}
async function search(){
  const query=$('#query').value.trim();
  if(busy)return [];hideRetry();
  closeResults();
  if(!query){$('#status').textContent='작품명 또는 작가·감독명을 입력해 주세요.';$('#query').focus();return [];}
  const requestedScope=type==='만화'?($('#comicScope').value.trim()||'작품 전체'):null;
  const found=searchWorks(query,type).filter(w=>requestedScope===null||w.type!=='만화'||(w.analysisScope||'작품 전체')===requestedScope);
  if(!found.length){await analyzeNew(query,type);return found;}
  if(found.length===1){selectWork(found[0].id);$('#status').textContent='『'+found[0].title+'』의 분석입니다.';return found;}
  const box=$('#matches');
  box.innerHTML='<div class="matches-head"><span>검색 결과 '+found.length+'개</span><button type="button" class="text-button" data-close aria-label="검색 결과 닫기">닫기</button></div>'+found.map(w=>'<button type="button" class="match" data-id="'+w.id+'"><strong>'+esc(w.title)+'</strong><span>'+esc(w.creator)+' · '+w.type+' · '+esc(w.year)+(w.type==='만화'?' · '+esc(w.analysisScope||'작품 전체'):'')+'</span></button>').join('');
  box.hidden=false;
  $('#status').textContent='검색 결과에서 분석할 작품을 선택해 주세요.';
  return found;
}

const PENDING_KEY='yeoun-pending-analysis-v1';
let pendingTask=null,retryTimer=null;
function rememberTask(task){pendingTask=task;try{if(task)sessionStorage.setItem(PENDING_KEY,JSON.stringify(task));else sessionStorage.removeItem(PENDING_KEY);}catch{}}
function hideRetry(){clearInterval(retryTimer);$('#analysisActions').hidden=true;}
function showRetry(){
 hideRetry();if(!pendingTask)return;$('#analysisActions').hidden=false;
 const tick=()=>{const left=Math.max(0,Math.ceil(((pendingTask?.retryAt||0)-Date.now())/1000));$('#retryAnalysis').disabled=busy||left>0;$('#retryAnalysis').textContent=left>0?(left>=3600?'한도가 회복된 뒤 다시 분석하기':left+'초 후 다시 분석하기'):'다시 분석하기';};tick();retryTimer=setInterval(tick,1000);
}
let busy=false;
function nearest(w){return CATALOG.filter(x=>x.origin!=='ai'&&x.type==='문학').map(x=>({w:x,d:x.features.reduce((s,v,i)=>s+(v-w.features[i])**2*WEIGHTS[i],0)})).sort((a,b)=>a.d-b.d).slice(0,3).map(x=>x.w.title);}
async function analyzeNew(query,scope){
 if(busy)return;
 const requestedScope=scope==='만화'?$('#comicScope').value.trim():'';
 if(pendingTask&&pendingTask.query===query&&pendingTask.type===scope&&pendingTask.scope===requestedScope&&pendingTask.retryAt>Date.now()){showRetry();$('#status').textContent='잠시 기다린 뒤 다시 시도해 주세요. 저장된 작품은 계속 조회할 수 있습니다.';return;}
 busy=true;closeResults();hideRetry();rememberTask({query,type:scope,scope:requestedScope,retryAt:0});
 $('#result').setAttribute('aria-busy','true');
 const started=Date.now();
 const progress=setInterval(()=>{$('#status').textContent='분석 응답을 기다리고 있습니다 · '+Math.floor((Date.now()-started)/1000)+'초. 일시적인 오류는 자동으로 재시도합니다. 최대 약 2분 30초가 걸릴 수 있습니다.';},15000);
 $('#status').textContent='작품 정보를 찾고 취향을 비교하고 있습니다. 잠시 기다려 주세요.';
 $('#searchForm').setAttribute('aria-busy','true');$('#searchForm button').textContent='분석 중…';
 document.querySelectorAll('#searchForm input,#searchForm button,#comicScope,.filter,#feedbackForm select,#feedbackForm textarea,#feedbackForm button').forEach(e=>e.disabled=true);
 try{
  const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,type:scope,...(scope==='만화'?{scope:$('#comicScope').value.trim()}:{})}),signal:AbortSignal.timeout(170000)});
  const data=await response.json();if(!response.ok){const err=Error(data.message||'분석하지 못했습니다.');err.retryAfter=data.retryAfter||0;err.retryable=(!['API_NOT_CONFIGURED','FREE_TIER_REQUIRED'].includes(data.code)&&[429,503].includes(response.status))||data.code==='INCOMPLETE_RESPONSE';throw err;}
  rememberTask(null);
  if(data.status==='ready'){
   const w={...data.work,id:'ai-'+crypto.randomUUID(),connection:nearest(data.work).join(' · ')};
   validWorks([w]);
   if(addedWorks.length>=300)throw Error('추가 작품 저장 한도에 도달했습니다. 기록을 백업해 주세요.');
   try{localStorage.setItem(WORK_KEY,JSON.stringify([...addedWorks,w]));addedWorks.push(w);}catch{throw Error('새 작품을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');}
   CATALOG.push(w);current=w;rememberWork(w.id);render();
   $('#status').textContent='『'+w.title+'』의 새 작품 분석입니다.'+' 이 브라우저에 저장했습니다.';
  }else if(data.status==='choose'){
   $('#matches').innerHTML='<div class="matches-head"><span>분석할 작품 선택</span><button type="button" class="text-button" data-close aria-label="검색 결과 닫기">닫기</button></div>'+data.candidates.map((w,i)=>'<button type="button" class="match" data-candidate="'+i+'"><strong>'+esc(w.title)+'</strong><span>'+esc(w.creator)+' · '+w.type+' · '+esc(w.year)+'</span></button>').join('');
   $('#matches').hidden=false;$('#matches')._candidates=data.candidates;$('#status').textContent=data.message;
  }else $('#status').textContent=data.message||'작품을 확인할 자료가 부족해 평가를 보류했습니다.';
  }catch(e){
  $('#status').textContent=e.name==='TimeoutError'?'분석 시간이 초과되었습니다. 입력은 유지되며 다시 시도할 수 있습니다.':e.message||'연결하지 못했습니다. 다시 시도해 주세요.';
  if(e.retryable||e.name==='TimeoutError'||e instanceof TypeError){rememberTask({...pendingTask,retryAt:Date.now()+Math.min(86400,Math.max(0,e.retryAfter||0))*1000});showRetry();}else rememberTask(null);
 }
 finally{clearInterval(progress);busy=false;$('#result').removeAttribute('aria-busy');if(pendingTask)showRetry();$('#searchForm').removeAttribute('aria-busy');$('#searchForm button').textContent='분석하기';document.querySelectorAll('#searchForm input,#searchForm button,#comicScope,.filter,#feedbackForm select,#feedbackForm textarea,#feedbackForm button').forEach(e=>e.disabled=false);}
}
$('#retryAnalysis').addEventListener('click',()=>{if(!pendingTask||busy)return;const task={...pendingTask};$('#query').value=task.query;type=task.type;$('#comicScope').value=task.scope||'';$('#comicOptions').hidden=type!=='만화';document.querySelectorAll('.filter').forEach(b=>{const active=b.dataset.type===type;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});analyzeNew(task.query,task.type);});
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();search();});
$('#filters').addEventListener('click',e=>{
  const b=e.target.closest('[data-type]');if(!b)return;
  type=b.dataset.type;
  $('#comicOptions').hidden=type!=='만화';
  document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});
  hideRetry();closeResults();$('#status').textContent='';
});
$('#comicScope').addEventListener('input',()=>{hideRetry();closeResults();$('#status').textContent='';});
$('#query').addEventListener('input',()=>{hideRetry();closeResults();$('#status').textContent='';});
$('#matches').addEventListener('click',e=>{
  if(e.target.closest('[data-close]')){closeResults();$('#status').textContent='';$('#query').focus();return;}
  const candidate=e.target.closest('[data-candidate]');if(candidate){const w=$('#matches')._candidates[Number(candidate.dataset.candidate)];if(w){$('#query').value=w.title;analyzeNew(w.title+' / '+w.creator+' / '+w.year,w.type);}return;}
  const b=e.target.closest('[data-id]');
  if(b){selectWork(b.dataset.id);$('#status').textContent='『'+current.title+'』의 분석입니다.';}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('#matches').hidden){closeResults();$('#status').textContent='';$('#query').focus();}
});
document.addEventListener('click',e=>{
  if(!$('.search-area').contains(e.target)&&!$('#matches').hidden){closeResults();$('#status').textContent='';}
});
$('#recentList').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b||busy)return;selectWork(b.dataset.id);$('#query').value=current.title;$('#status').textContent='『'+current.title+'』의 저장된 분석입니다.';});
$('#feedbackForm').addEventListener('submit',e=>{e.preventDefault();const rating=Number($('#rating').value);if(!rating||rating<.5||rating>5)return;const next=[...records.filter(r=>r.id!==current.id),{id:current.id,rating,comment:$('#comment').value.trim()}];if(persist(next)){render();$('#status').textContent='감상을 저장했습니다. 다른 작품의 다음 예측에 반영됩니다.';}});
$('#historyList').addEventListener('click',e=>{const b=e.target.closest('[data-delete]');if(b&&persist(records.filter(r=>r.id!==b.dataset.delete))){render();$('#status').textContent='기록을 삭제하고 예측 보정에서 제외했습니다.';}});
$('#export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,records,works:addedWorks},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='yeoun-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error('파일이 너무 큽니다.');const d=JSON.parse(await f.text());if(![1,2].includes(d.version))throw Error('지원하지 않는 백업 버전입니다.');if(d.version===2){const newWorks=validWorks((d.works||[]).filter(w=>!CATALOG.some(x=>x.id===w.id)));if(addedWorks.length+newWorks.length>300)throw Error('추가 작품 한도를 초과합니다.');const before=CATALOG.length;CATALOG.push(...newWorks);try{validRecords(d.records);}catch(e){CATALOG.splice(before);throw e;}try{localStorage.setItem(WORK_KEY,JSON.stringify([...addedWorks,...newWorks]));addedWorks.push(...newWorks);}catch(e){CATALOG.splice(before);throw Error('추가 작품을 저장하지 못했습니다.');}}const incoming=validRecords(d.records);const next=[...records.filter(r=>!incoming.some(x=>x.id===r.id)),...incoming];if(persist(next)){render();$('#status').textContent='백업을 불러왔습니다. 같은 작품의 기록은 백업 내용으로 갱신했습니다.';}}catch(err){$('#status').textContent=err.message||'백업 파일을 읽지 못했습니다.';}finally{e.target.value='';}});
$('#historyButton').addEventListener('click',()=>{$('#history').open=true;$('#history').scrollIntoView({behavior:'smooth'});});
$('#profileButton').addEventListener('click',()=>{$('#profile').open=true;$('#profile').scrollIntoView({behavior:'smooth'});});
render();
try{const task=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');if(task&&typeof task.query==='string'&&task.query.length<=200&&['전체','문학','영화','만화'].includes(task.type)&&typeof task.scope==='string'&&task.scope.length<=120&&Number.isFinite(task.retryAt)){pendingTask=task;$('#status').textContent='완료되지 않은 분석이 있습니다. 다시 분석하기를 누르면 같은 작품으로 시도합니다.';showRetry();}}catch{}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'select_catalog_work',title:'수록 작품 분석 열기',description:'수록 작품 ID로 분석을 열고 현재 예측을 반환합니다. 감상 기록은 변경하지 않습니다.',inputSchema:{type:'object',properties:{id:{type:'string',enum:CATALOG.map(w=>w.id)}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.id!=='string')throw Error('작품 ID가 필요합니다.');return {id:input.id,...selectWork(input.id)};}})).catch(()=>{});}catch{}}
