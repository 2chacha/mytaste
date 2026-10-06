import {handleAnalysis} from './lib/analysis.mjs';
import seed from './lib/seed.json' with {type: 'json'};
import {verifyAccess} from './access.mjs';

export default {
  async fetch(request, env) {
    const auth = await verifyAccess(request, env);
    if (auth.status !== 200) return new Response(auth.status === 503 ? '개인용 로그인 설정을 완료해 주세요.' : '소유자 로그인이 필요합니다.', {status: auth.status, headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store'}});
    if (new URL(request.url).pathname === '/api/analyze') {
      const headers = new Headers(request.headers);
      headers.set('oai-authenticated-user-id', 'access:' + auth.subject);
      return handleAnalysis(new Request(request, {headers}), {...env, GEMINI_MODEL: 'gemini-3.1-flash-lite'}, seed);
    }
    return env.ASSETS.fetch(request);
  }
};
