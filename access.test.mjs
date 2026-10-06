import assert from 'node:assert/strict';
import {verifyAccess} from './access.mjs';
import worker from './worker.mjs';
const pair = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'}, true, ['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};
const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
const env = {ACCESS_ISSUER:'https://yeoun-test.cloudflareaccess.com',ACCESS_AUD:'test-aud',OWNER_EMAIL:'owner@example.com'};
const claims = {iss:env.ACCESS_ISSUER,aud:[env.ACCESS_AUD],sub:'owner',email:env.OWNER_EMAIL,exp:Date.now()/1000+60};
async function req(extra={}){const body=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({...claims,...extra});const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body));return new Request('https://example.com',{headers:{'cf-access-jwt-assertion':body+'.'+Buffer.from(sig).toString('base64url')}});}
const fetcher=async()=>Response.json({keys:[jwk]});
assert.equal((await verifyAccess(await req(),env,fetcher)).status,200);
for(const extra of [{exp:0},{aud:['wrong']},{iss:'https://wrong.cloudflareaccess.com'}])assert.equal((await verifyAccess(await req(extra),env,fetcher)).status,401);
assert.equal((await verifyAccess(await req({email:'other@example.com'}),env,fetcher)).status,403);
assert.equal((await verifyAccess(new Request('https://example.com'),env,fetcher)).status,401);
assert.equal((await verifyAccess(await req(),{},fetcher)).status,503);
const forged=await req();const token=forged.headers.get('cf-access-jwt-assertion').split('.');token[1]=encode({...claims,sub:'forged'});forged.headers.set('cf-access-jwt-assertion',token.join('.'));assert.equal((await verifyAccess(forged,env,fetcher)).status,401);
const blocked=await worker.fetch(new Request('https://example.com/api/analyze',{method:'POST'}),{});assert.equal(blocked.status,503);
console.log('Passed: owner JWT signature, expiry, audience, issuer, missing settings, forged token and fail-closed API');
