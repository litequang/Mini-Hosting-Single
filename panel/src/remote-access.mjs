// Origin validation shared by two remote-only listeners. Never infer local trust from Host.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DATA} from './config.mjs';
export const HOST=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const TEAM=/^[a-z0-9-]{1,63}\.cloudflareaccess\.com$/;
export const AUD=/^[A-Za-z0-9_-]{32,128}$/;
export const EMAIL=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/;
export const PORTS={panel:9093,monitor:9092};
export function validApplication(c){return !!(c&&HOST.test(c.hostname)&&TEAM.test(c.teamDomain)&&AUD.test(c.audience)&&typeof c.ownerEmail==='string'&&c.ownerEmail.length<=254&&EMAIL.test(c.ownerEmail)&&c.ownerEmail===c.ownerEmail.toLowerCase()&&c.hostname!==c.teamDomain);}
export function config(surface='panel'){
 try{const file=path.join(DATA,'remote-access.json'),st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0||st.size>4096)return null;
  const c=JSON.parse(fs.readFileSync(file,'utf8'));
  // Legacy schema1 deliberately cannot enable SSO without an explicit owner.
  if(c.schema!==2||!validApplication(c.panel)||!['panel','monitor'].includes(surface))return null;
  if(c.monitor&&(!validApplication(c.monitor)||c.monitor.hostname===c.panel.hostname||c.monitor.audience===c.panel.audience))return null;
  return c[surface]||null;
 }catch{return null;}
}
export function publicStatus(){const panel=config(),monitor=config('monitor');return {configured:!!panel,remoteHostname:panel?.hostname||null,remoteMonitorHostname:monitor?.hostname||null,remoteMonitorUrl:monitor?'https://'+monitor.hostname:null,accessJwtRequired:true,usesOriginalPanel:true,localPort:9090,remotePort:9093,remoteMonitorPort:9092,remoteSso:true,cloudflareAccessDeploymentVerified:false};}
export const loopback=address=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
export function authorizeLocal(req,port){
 const host=req.headers.host;
 if(!loopback(req.socket.remoteAddress)||![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return null;
 // A misrouted Tunnel with localhost Host is still remote and must never reach password recovery.
 if(Object.keys(req.headers).some(k=>/^(cf-|x-forwarded-|forwarded$|x-real-ip$)/i.test(k)))return null;
 return {remote:false,host};
}
const caches=new WeakMap();
async function keysFor(team,fetcher){
 let cache=caches.get(fetcher);if(!cache){cache=new Map();caches.set(fetcher,cache);}
 const existing=cache.get(team);if(existing&&existing.expires>Date.now())return existing.keys;
 const response=await fetcher(`https://${team}/cdn-cgi/access/certs`,{signal:AbortSignal.timeout(4000),redirect:'error',cache:'no-store'});
 if(!response.ok)throw Error('JWKS_FETCH_FAILED');
 let raw='';if(response.body){for await(const b of response.body){raw+=Buffer.from(b).toString('utf8');if(Buffer.byteLength(raw)>65536)throw Error('JWKS_SIZE_LIMIT');}}else raw=await response.text();
 if(raw.length>65536)throw Error('JWKS_SIZE_LIMIT');
 const json=JSON.parse(raw),keys=(Array.isArray(json.keys)?json.keys:[]).filter(k=>k.kty==='RSA'&&k.alg==='RS256'&&(!k.use||k.use==='sig')&&typeof k.kid==='string'&&k.kid.length>0&&k.kid.length<256&&typeof k.n==='string'&&typeof k.e==='string');
 if(!keys.length||keys.length>16)throw Error('JWKS_INVALID');
 if(cache.size>=4)cache.clear();cache.set(team,{keys,expires:Date.now()+300000});return keys;
}
function decode(s){if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length>16384)throw Error('JWT_ENCODING');const b=Buffer.from(s,'base64url');if(b.toString('base64url')!==s)throw Error('JWT_ENCODING');return b;}
export async function verifiedClaims(token,c,fetcher=fetch,onReject=()=>{}){
 const reject=reason=>{onReject(reason);return null;};
 if(typeof token!=='string'||token.length>12000||!/^[-A-Za-z0-9_]+\.[-A-Za-z0-9_]+\.[-A-Za-z0-9_]+$/.test(token))return reject('JWT_MISSING_OR_FORMAT');
 try{const [h,b,s]=token.split('.'),header=JSON.parse(decode(h)),claims=JSON.parse(decode(b));
  if(!header||Array.isArray(header)||header.alg!=='RS256'||header.crit!==undefined||header.b64!==undefined||header.typ!==undefined&&String(header.typ).toUpperCase()!=='JWT'||typeof header.kid!=='string'||!header.kid.length||header.kid.length>255)return reject('JWT_HEADER_INVALID');
  if(!claims||typeof claims!=='object'||Array.isArray(claims))return reject('JWT_CLAIMS_INVALID');
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!==`https://${c.teamDomain}`)return reject('JWT_ISSUER_MISMATCH');
  if(!(Array.isArray(claims.aud)?claims.aud.includes(c.audience):claims.aud===c.audience))return reject('JWT_AUDIENCE_MISMATCH');
  if(!Number.isSafeInteger(claims.exp)||claims.exp<=now||claims.exp>now+86400)return reject('JWT_EXPIRY_INVALID');
  if(claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>now)||claims.iat!==undefined&&(!Number.isSafeInteger(claims.iat)||claims.iat>now||claims.iat>=claims.exp))return reject('JWT_TIME_INVALID');
  const keys=await keysFor(c.teamDomain,fetcher),jwk=keys.find(k=>k.kid===header.kid);
  if(!jwk||!crypto.verify('RSA-SHA256',Buffer.from(h+'.'+b),crypto.createPublicKey({key:jwk,format:'jwk'}),decode(s)))return reject('JWT_SIGNATURE_INVALID');
  return claims;
 }catch{return reject('JWT_VERIFY_FAILED');}
}
export async function verifyAccess(token,c,fetcher=fetch,onReject=()=>{}){return !!await verifiedClaims(token,c,fetcher,onReject);}
export async function authorizeRemote(req,surface='panel',{fetcher=fetch,readConfig=config}={}){
 if(!loopback(req.socket.remoteAddress))return null;
 const c=readConfig(surface),host=String(req.headers.host||'').toLowerCase();
 if(!validApplication(c)||![c.hostname,c.hostname+':443'].includes(host))return null;
 const claims=await verifiedClaims(req.headers['cf-access-jwt-assertion'],c,fetcher);
 if(!claims||typeof claims.email!=='string'||claims.email.toLowerCase()!==c.ownerEmail||typeof claims.sub!=='string'||!claims.sub.length||claims.sub.length>256)return null;
 const hash=crypto.createHash('sha256').update(req.headers['cf-access-jwt-assertion']).digest('hex');
 return {remote:true,host,identity:crypto.createHash('sha256').update(JSON.stringify([c.teamDomain,c.audience,c.ownerEmail,claims.sub])).digest('hex'),tokenHash:hash,expires:claims.exp*1000,logoutUrl:`https://${c.hostname}/cdn-cgi/access/logout`};
}
