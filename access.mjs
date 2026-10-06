const cache = new Map();
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const parse = value => JSON.parse(new TextDecoder().decode(decode(value)));

// Access configuration is mandatory; an unprotected deployment cannot consume the API key.
export async function verifyAccess(request, env, fetcher = fetch) {
  const issuer = env.ACCESS_ISSUER;
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '') || !env.ACCESS_AUD || !env.OWNER_EMAIL) return {status: 503};
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 16000) return {status: 401};
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {status: 401};
    const header = parse(parts[0]), claims = parse(parts[1]), now = Date.now() / 1000;
    if (header.alg !== 'RS256' || !header.kid || claims.iss !== issuer || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD) || !Number.isFinite(claims.exp) || claims.exp <= now || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now)) || typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string') return {status: 401};
    if (claims.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) return {status: 403};
    let keys = cache.get(issuer);
    if (!keys || keys.expires < Date.now() || !keys.value.some(k => k.kid === header.kid)) {
      const response = await fetcher(issuer + '/cdn-cgi/access/certs', {signal: AbortSignal.timeout(5000)});
      if (!response.ok) return {status: 503};
      const data = await response.json();
      if (!Array.isArray(data.keys)) return {status: 503};
      keys = {value: data.keys, expires: Date.now() + 300000};
      cache.set(issuer, keys);
    }
    const jwk = keys.value.find(k => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) return {status: 401};
    const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    return valid ? {status: 200, subject: claims.sub} : {status: 401};
  } catch { return {status: 401}; }
}
