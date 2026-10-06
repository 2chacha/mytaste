# mytaste — 로그인 없는 공개 배포

이 배포본은 로그인 없이 페이지 조회 및 신규 작품 분석을 제공합니다. 방문자는 모두 소유자가 설정한 Gemini 무료 프로젝트 한도를 함께 사용합니다. Gemini 키는 계속 Cloudflare 서버 Secret에만 저장합니다. 감상 기록과 피드백은 각 방문자의 브라우저에 저장되며 초기 취향 프로필은 모두에게 동일합니다.

## 이미 GitHub에 이전 배포본을 올렸다면

1. GitHub mytaste 저장소의 worker.mjs 파일을 엽니다.
2. 연필 아이콘을 눌러 이 폴더의 worker.mjs 내용으로 전체 교체합니다.
3. Commit changes를 누릅니다. Cloudflare 연결이 완료됐다면 자동 배포됩니다.
4. Cloudflare에서 mytaste → Access를 확인합니다. 보호 설정이 없으면 새로 설정하지 않습니다. 이미 해당 Worker에 보호를 적용했다면 해당 보호만 해제합니다. 계정 전체 보호가 있다면 이 Worker만 Make this Worker public으로 예외 처리합니다.
5. Domains에서 Production 주소를 켭니다. Preview는 꺼두어도 됩니다.
6. https://mytaste.chmn-lee.workers.dev 를 로그아웃 또는 시크릿 창에서 확인합니다.

로그인 없이 페이지를 여는 데 필요한 코드 변경은 worker.mjs 하나입니다. 전체 파일을 새로 업로드한다면 package.json과 public-worker.test.mjs도 함께 업로드합니다.

## 신규 분석 설정

mytaste → Settings → Variables and Secrets의 서버 런타임 설정:

- GEMINI_API_KEY: Secret으로 기존 무료 Gemini 키 저장.
- GEMINI_MODEL: gemini-3.1-flash-lite (설정 파일에 포함).
- GEMINI_FREE_TIER_CONFIRMED: true (설정 파일에 포함).

ACCESS_ISSUER, ACCESS_AUD, OWNER_EMAIL은 이 공개 배포본에서 사용하지 않습니다. API 키를 GitHub나 브라우저 코드에 넣지 않습니다.

## GitHub 연결 및 검사

- Worker 이름: mytaste (wrangler.jsonc의 name과 일치).
- Build command: npm run check
- Deploy command: npx wrangler deploy 또는 npm run deploy
- Preview command: npx wrangler versions upload
- Root directory: 저장소 최상단.

검사: npm install 후 npm run check.
배포 없이 번들 확인: npm run package:check.
외부 주소에서의 실제 공개 전환은 GitHub 파일 교체와 Cloudflare 설정 후 완료됩니다. 이 파일 준비만으로 현재 운영 사이트 설정이 바뀌지는 않습니다.

공식 안내: https://developers.cloudflare.com/workers/configuration/cloudflare-access/

## 2026-10-06 응답 지연 개선

작품 확인용 Gemini 호출을 제거했습니다. 위키백과에서 한국어 정확한 제목과 검색 후보(최대 3개)를 조회하고 연결된 영어 문서를 보완합니다. 영어 검색어는 영어 검색도 병행합니다. 문서 도입부는 문서당 최대 4,000자, 최종 자료는 최대 6개·전체 8,000자입니다. 검색 순위를 정답으로 간주하지 않으며 Gemini가 제목·창작자·매체를 대조하고 동명이작·작가 입력은 선택 후보로 안내합니다. 충분한 자료가 없으면 점수 없이 평가를 보류합니다. sourceRefs로 실제 사용 자료만 출처에 표시합니다.

Gemini 3.1 Flash Lite를 취향 분석에 한 번만 호출하며 출력 상한은 2,048토큰입니다. 개별 요청 대기는 45초, 전체 작업 예산은 120초입니다. 위키백과 조회는 전체 30초·각 요청 최대 12초입니다. 위키백과 장애는 WIKI_UNAVAILABLE로 구분하며 자료가 없으면 Gemini를 호출하지 않습니다. 중간 자료는 6시간, 완료 결과는 7일 저장합니다. 공개 프로필의 동일 작품·매체·범위 결과를 방문자 간 재사용하고 개인 감상 피드백 보정은 브라우저에서 계산합니다. 서버 캐시는 실행 환경/지역에 따라 재사용되지 않을 수 있습니다.

수정한 로컬 서버 코드로 실제 Gemini 무료 분석을 한 번 실행하여 『창백한 불꽃』, 블라디미르 나보코프, 8개 평가값, 해당 작품의 한국어·영어 위키백과 출처가 10초 만에 반환되는 것을 확인했습니다. 이것은 수정본의 1회 성공 검증이며 항상 10초 내 성공한다는 보장은 아닙니다. 운영 중인 Cloudflare 사이트에는 GitHub 파일 교체 후 반영됩니다.

일시적인 503·시간 초과·연결 실패의 대기 제한은 같은 작품·분야·범위와 같은 분석 단계에만 적용합니다. 다른 작품이나 단계는 차단하지 않습니다. 대기 제한으로 차단한 요청은 REQUEST_COOLDOWN으로 표시하며 이번 요청을 Google에 보내지 않았음을 안내합니다. 실제 429 무료 사용 한도는 API 키 전체에 적용합니다.

단일 Gemini 호출 구조의 실제 시험에서 창백한 불꽃의 제목·창작자·8개 평가값과 한국어·영어 작품 문서가 약 10초 만에 반환됐습니다. 이후 사용 출처 필터링을 추가한 최종 실요청에서는 Google 503이 반환됐으며 Gemini 호출은 1회였습니다. 자동 검증은 모두 통과했습니다. 외부 서버 오류를 제거하거나 일정 응답 시간을 보장하는 변경은 아닙니다.
