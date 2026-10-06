# 여운 — GitHub + Cloudflare 외부 배포

이 폴더의 내용만 새 GitHub 저장소에 올립니다. Gemini 키, 감상 기록, 기존 Sites 계정·배포 정보는 포함하지 않습니다. 문학·영화·만화의 신규 분석, 저장된 작품, 최근 분석과 피드백 기능은 유지됩니다. 모델은 Gemini 3.1 Flash-Lite 전용입니다.

GitHub는 코드 보관소이고 Cloudflare Workers가 웹페이지와 서버 분석을 실행합니다. GitHub Pages만으로는 신규 분석 서버를 실행할 수 없습니다.

## 1. GitHub 저장소 만들기

1. GitHub에 로그인 → 우측 상단 `+` → `New repository`.
2. Repository name: `yeoun-reading-room` (다른 이름도 가능).
3. 개인 취향 프로필이 코드에 포함되므로 `Private` 선택을 권장합니다.
4. 저장소를 만든 뒤 `uploading an existing file` 또는 `Add file → Upload files`.
5. 이 폴더 안의 파일과 `public`, `lib` 폴더를 올립니다. 폴더 자체를 한 단계 더 감싸지 마세요. 저장소 최상단에 `package.json`, `wrangler.jsonc`, `worker.mjs`가 보여야 합니다.
6. `Commit changes`로 저장합니다. `.env.gemini.local`, API 키와 감상 백업은 올리지 마세요.

## 2. Cloudflare에 GitHub 연결

1. Cloudflare 계정으로 로그인 → `Workers & Pages` → Worker 생성 → GitHub 저장소 연결.
2. GitHub에서 방금 만든 저장소만 접근하도록 승인하고 선택합니다.
3. Worker 이름: **`yeoun-reading-room`**. `wrangler.jsonc`의 `name`과 같아야 합니다. 이름을 바꾸려면 양쪽을 함께 바꿉니다.
4. 다음 값을 입력합니다.

| 항목 | 입력값 |
|---|---|
| Production branch | `main` 또는 저장소의 기본 브랜치 |
| Root directory | 저장소 최상단 (기본값) |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |
| Node version | 22 이상 (예: `NODE_VERSION=24`) |

의존성은 Cloudflare가 설치합니다. 첫 배포 뒤 `https://yeoun-reading-room.<계정>.workers.dev` 주소가 생깁니다. 아직 로그인 설정이 없으면 설정 안내/503이 표시되는 것이 정상입니다. 설정을 완료하기 전에는 서버 분석을 실행하지 않습니다.

## 3. 개인용 로그인 보호

기존 Sites에서는 소유자 로그인으로 보호됐습니다. 새 호스팅에서는 Cloudflare Access로 같은 개인용 접근 범위를 설정합니다.

1. Cloudflare Zero Trust 초기 설정을 완료합니다. 개인용 무료 플랜을 선택합니다.
2. Worker의 `Settings → Domains & Routes`에서 **production workers.dev URL**에 Cloudflare Access를 활성화합니다. Preview URL은 이 설정 파일에서 꺼두었습니다.
3. Access application의 허용 정책에 **본인 이메일 하나만** 넣습니다. `Everyone`은 선택하지 않습니다. 이메일 일회용 코드(One-time PIN)로 로그인할 수 있습니다.
4. Access application 설정에서 `Application Audience (AUD)`를 복사합니다.
5. 본인의 Zero Trust 팀 주소를 확인합니다. 형식은 `https://<팀이름>.cloudflareaccess.com`이며 뒤에 `/`를 붙이지 않습니다.
6. Worker의 런타임 `Variables and Secrets`에 아래 값을 저장합니다. GitHub 빌드 환경변수와 Worker 런타임 환경변수는 별개입니다.

| 이름 | 종류 | 값 |
|---|---|---|
| `GEMINI_API_KEY` | Secret | 이미 발급한 Gemini 무료 프로젝트 키 |
| `ACCESS_ISSUER` | Secret | `https://<팀이름>.cloudflareaccess.com` |
| `ACCESS_AUD` | Secret | Access application의 AUD 값 |
| `OWNER_EMAIL` | Secret | 허용 정책에 넣은 본인 이메일 |

`GEMINI_MODEL=gemini-3.1-flash-lite`, `GEMINI_FREE_TIER_CONFIRMED=true`는 설정 파일에 이미 포함돼 있습니다. 유료 Gemini 프로젝트로 연결하지 않습니다. 키를 채팅이나 GitHub에 붙여넣지 말고 Cloudflare의 Secret 입력란에만 저장합니다.

7. 저장·배포 후 workers.dev 주소를 열어 이메일 인증 → 소유자 로그인 → 작품 검색을 확인합니다. 코드에서도 JWT 서명·발급자·대상·만료·소유자 이메일을 확인하므로 설정 누락/인증 실패 시 분석이 차단됩니다.

## 4. 기존 감상 기록 이동

브라우저 저장은 사이트 주소별로 분리됩니다. 기존 여운에서 `내 감상 기록 → 기록 백업`으로 파일을 받은 뒤 새 사이트에서 `백업 불러오기`를 사용하세요. 저장된 신규 작품과 별점·코멘트를 함께 옮길 수 있습니다. 최근 열어본 제목 목록은 별도로 다시 쌓입니다.

## 5. 이후 업데이트

GitHub에 변경사항을 commit/push하면 연결된 Cloudflare Worker가 검사 후 자동 배포합니다. 새로운 코드에 API 키를 포함할 필요가 없습니다. 기존 Sites를 수정한 내용은 GitHub에 자동 동기화되지 않습니다. 원본 프로젝트에서 `node scripts/export-external.cjs`로 최신 외부 배포본을 다시 만든 뒤 GitHub에 반영합니다.

## 확인 및 문제 해결

- `npm install` → `npm run check`로 문법과 인증 검사를 실행합니다.
- `npm run package:check`는 배포 없이 Worker 번들만 만듭니다.
- 첫 배포 이후 503 설정 안내: Access 관련 Secret 값을 확인합니다.
- 401/403: Access 활성화, AUD/팀 주소, 허용 이메일을 확인합니다.
- Gemini 429: 무료 한도 회복을 기다립니다. 503 혼잡은 같은 모델로 한 번 재시도합니다.
- 외부 계정 연결과 실제 외부 주소에서의 검증은 아직 완료되지 않았습니다. 준비된 코드 검사와 배포 파일 생성은 계정 연결과 별개의 작업입니다.

공식 문서:
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
