// Interpretive editorial seed data, not objective measurements or live AI output.
const AXES=['개인–세계의 불화','존재론적·지적 질문','미학과 형식','내면성과 소외','해석의 개방성','시대와 개인','현실의 낯설게 하기','존엄과 저항'];
const WEIGHTS=[17,16,16,13,13,8,10,7];
const rows=[
['wings','날개','이상','문학',1936,[10,8,10,10,9,7,9,6],[0,0,0],'분열된 의식과 도시의 감각이 일상의 질서를 흔듭니다.','불안정한 화자와 단절된 서사가 감정적 거리를 만들 수 있습니다.','세계의 끝과 하드보일드 원더랜드','현실과 의식의 경계가 흐려지는 경험','The Wings'],
['mujin','무진기행','김승옥','문학',1964,[9,8,9,10,8,9,6,6],[1,1,1],'내면의 균열을 감각적인 문체와 시대적 공기로 드러냅니다.','자기기만을 바라보는 시선이 답답하거나 냉정하게 느껴질 수 있습니다.','사양','변화하는 세계 앞에서의 내면적 동요',''],
['gubo','소설가 구보씨의 일일','박태원','문학',1934,[8,7,10,9,9,9,8,6],[0,0,0],'도시를 배회하는 의식과 관찰의 형식 자체가 읽는 경험을 만듭니다.','사건 중심의 전개를 기대하면 느슨하게 느껴질 수 있습니다.','날개','도시와 분절된 의식의 만남','구보씨'],
['square','광장','최인훈','문학',1960,[10,9,9,9,8,10,6,9],[3,2,2],'체제와 개인의 충돌을 개인의 선택과 고독에 묶어 놓습니다.','사상적 대화의 비중이 커서 논쟁이 앞선다고 느낄 수 있습니다.','분노의 포도','시대의 압력 속에서 존엄을 묻는 시선','The Square'],
['gray','회색인','최인훈','문학',1963,[9,9,9,10,9,10,7,7],[2,2,2],'시대의 모순을 지식인의 내면과 사유 속에서 통과시킵니다.','관념적인 독백이 독서의 호흡을 늦출 수 있습니다.','무진기행','시대와 개인의 내적 불화',''],
['sisyphus','시지프 신화','알베르 카뮈','문학',1942,[10,10,8,8,7,5,7,10],[2,3,3],'부조리를 회피하지 않으면서 삶을 지속하는 태도를 사유합니다.','철학적 논증이 중심이므로 소설의 열린 세계와는 경험이 다릅니다.','필경사 바틀비','부조리한 조건과 인간의 태도','Camus Myth of Sisyphus 시지프스 신화'],
['fictions','픽션들','호르헤 루이스 보르헤스','문학',1944,[7,10,10,7,10,5,10,5],[0,0,0],'미로와 허구의 구조가 지식과 현실에 대한 확신을 흔듭니다.','정서적 몰입보다 개념적 즐거움이 앞설 수 있습니다.','세계의 끝과 하드보일드 원더랜드','세계를 구성하는 규칙을 의심하게 하는 구조','Borges Ficciones'],
['trial','소송','프란츠 카프카','문학',1925,[10,10,9,10,10,7,10,7],[0,0,0],'설명되지 않는 질서와 개인의 충돌을 끝까지 해소하지 않습니다.','답답함과 무력감이 길게 이어질 수 있습니다.','필경사 바틀비','이해되지 않는 제도와 개인의 불화','Kafka The Trial 심판'],
['temple','금각사','미시마 유키오','문학',1956,[9,9,10,10,8,8,7,5],[1,1,1],'아름다움에 대한 집착과 자기 소외가 문체의 긴장으로 이어집니다.','파괴적 내면을 오래 따라가는 일이 불편할 수 있습니다.','날개','분열된 내면을 따라가는 강한 형식 의식','Mishima Golden Pavilion'],
['setting','사양','다자이 오사무','문학',1947,[9,8,9,10,8,10,5,8],[1,1,1],'시대적 몰락을 개인의 수치와 저항, 삶의 감각으로 번역합니다.','자기 소진과 우울의 정조가 감정적으로 무거울 수 있습니다.','무진기행','변화하는 사회와 개인의 내적 균열','Dazai Setting Sun'],
['bartleby','필경사 바틀비','허먼 멜빌','문학',1853,[10,9,9,9,10,8,8,10],[1,0,0],'설명되지 않는 거부가 노동과 존엄에 대한 질문을 남깁니다.','인물의 동기가 끝내 명확해지지 않는 점이 불만일 수 있습니다.','시지프 신화','부조리와 인간의 태도를 묻는 질문','Melville Bartleby'],
['grapes','분노의 포도','존 스타인벡','문학',1939,[10,8,9,7,7,10,4,10],[4,3,3],'사회적 분노가 구체적인 삶과 존엄의 문제로 체감됩니다.','메시지가 선명한 장면은 해석의 여백을 좁힐 수 있습니다.','광장','시대와 개인, 존엄을 향한 저항','Steinbeck Grapes of Wrath'],
['wonderland','세계의 끝과 하드보일드 원더랜드','무라카미 하루키','문학',1985,[9,9,9,9,9,5,10,6],[0,0,1],'서로 다른 세계의 구조가 자아와 의식에 관한 질문을 만듭니다.','설정과 구조에 비해 인물 관계가 멀게 느껴질 수 있습니다.','픽션들','현실의 규칙과 자아를 흔드는 허구','Murakami Hard-boiled Wonderland'],
['mulholland','멀홀랜드 드라이브','데이비드 린치','영화',2001,[9,9,10,10,10,6,10,5],[0,0,0],'꿈과 정체성의 불안정한 연결이 관객의 해석을 계속 요구합니다.','모호한 인과관계와 불안한 분위기, 성적·폭력적 장면이 부담일 수 있습니다.','날개','불안정한 의식과 현실의 균열','David Lynch Mulholland Drive 멀홀랜드 드라이브'],
['stalker','스토커','안드레이 타르코프스키','영화',1979,[9,10,10,9,10,6,10,7],[0,1,1],'낯선 공간과 느린 시간이 욕망과 믿음에 관한 질문을 남깁니다.','매우 느린 호흡과 긴 철학적 대화가 집중을 요구합니다.','시지프 신화','극한의 조건에서 삶과 믿음을 묻는 사유','Tarkovsky Stalker 잠입자']
];
const CATALOG=rows.map(([id,title,creator,type,year,features,penalties,reason,risk,connection,bridge,aliases])=>({id,title,creator,type,year,features,penalties,reason,risk,connection,bridge,aliases}));
const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[\s·–—『』《》.,-]/g,'');
function searchWorks(q,type='전체'){const n=normalize(q);return CATALOG.filter(w=>(type==='전체'||w.type===type)&&(!n||normalize(w.title+' '+w.creator+' '+w.aliases).includes(n)));}
function baseScore(w){return Math.max(0,Math.min(100,w.features.reduce((s,v,i)=>s+v*WEIGHTS[i]/10,0)-w.penalties.reduce((s,v,i)=>s+v*[.8,.6,.6][i],0)));}
function predict(w,records=[]){let numerator=0,denominator=3;for(const r of records){const other=CATALOG.find(x=>x.id===r.id);if(!other||other.id===w.id)continue;const distance=other.features.reduce((s,v,i)=>s+(v-w.features[i])**2,0)/8;const similarity=Math.exp(-distance/8)*(other.type===w.type?1:.6);numerator+=similarity*((r.rating-1)*25-baseScore(other));denominator+=similarity;}const delta=Math.max(-12,Math.min(12,numerator/denominator));const score=Math.round(Math.max(0,Math.min(100,baseScore(w)+delta)));return {score,rating:Math.round((1+score*.04)*10)/10,delta:Math.round(delta*10)/10};}
if(typeof module!=='undefined')module.exports={AXES,WEIGHTS,CATALOG,searchWorks,baseScore,predict};

