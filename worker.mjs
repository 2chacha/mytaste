import {handleAnalysis} from './lib/analysis.mjs';
import seed from './lib/seed.json' with {type: 'json'};

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/analyze') {
      const headers = new Headers(request.headers);
      // This public Worker receives no trusted Sites identity header.
      // Use Cloudflare's connecting IP for the existing anonymous request limit.
      headers.delete('oai-authenticated-user-id');
      return handleAnalysis(new Request(request, {headers}), {...env, GEMINI_MODEL: 'gemini-3.1-flash-lite'}, seed);
    }
    return env.ASSETS.fetch(request);
  }
};
