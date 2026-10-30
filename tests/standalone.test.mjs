import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-test-'));
process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
fs.mkdirSync(process.env.MHS_HOME,{recursive:true});
const config=await import('../panel/src/config.mjs');
const security=await import('../panel/src/security.mjs');
const sites=await import('../panel/src/sites.mjs');
const system=await import('../panel/src/system.mjs');
test('fresh standalone marker, existing MHC and foreign registry refusal',()=>{
 fs.mkdirSync(path.join(config.HOME,'.config/mhc-full-installer'),{recursive:true});
 assert.throws(()=>config.initialize(),/EXISTING_MHC/);
 fs.rmdirSync(path.join(config.HOME,'.config/mhc-full-installer'));config.initialize();config.initialize();
 config.saveRegistry({sites:[{slug:'foreign',managedBy:'MHC'}]});assert.throws(()=>config.registry(),/FOREIGN_SITE/);
 config.saveRegistry({sites:[],nginxIntegrated:false});
});
test('original site/file functions and independent Host vhost',async()=>{
 const a=await sites.addSite({slug:'demo-web',hostname:'demo.example.com'});
 assert.equal(a.managedBy,'MHS');assert.equal(sites.listSites().length,1);
 sites.writeSiteFile(a.slug,'hello.txt',Buffer.from('fixture'));assert.equal(sites.readFileForSite(a.slug,'hello.txt'),'fixture');
 assert.throws(()=>sites.writeSiteFile(a.slug,'../outside',Buffer.from('bad')),/Invalid path/);
 assert.match(system.nginxConf(a),/server_name demo.example.com/);assert.doesNotMatch(system.nginxConf(a),/authority|worker|lease/i);
 await assert.rejects(()=>sites.addSite({slug:'other-web',hostname:a.hostname}),/already exists/);
 await assert.rejects(()=>sites.addSite({slug:'unsafe-web',hostname:'bad; include evil'}),/Invalid/);
});
test('RS256 Access validation: correct, wrong audience, expired, tampered, missing',async()=>{
 const {verifyAccess}=await import('../panel/src/remote-access.mjs');
 const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const c={teamDomain:'fixture.cloudflareaccess.com',audience:'a'.repeat(64)},now=Math.floor(Date.now()/1000);
 const jwk={...publicKey.export({format:'jwk'}),kid:'fixture',alg:'RS256'};
 const fetcher=async()=>({ok:true,text:async()=>JSON.stringify({keys:[jwk]})});
 const sign=claims=>{const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture'})).toString('base64url'),b=Buffer.from(JSON.stringify(claims)).toString('base64url'),data=h+'.'+b;return data+'.'+crypto.sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');};
 const claims={iss:'https://'+c.teamDomain,aud:c.audience,exp:now+300,iat:now};
 assert.equal(await verifyAccess(sign(claims),c,fetcher),true);
 assert.equal(await verifyAccess(sign({...claims,aud:'bad'}),c,fetcher),false);
 assert.equal(await verifyAccess(sign({...claims,exp:now-1}),c,fetcher),false);
 assert.equal(await verifyAccess(sign(claims).slice(0,-5)+'AAAAA',c,fetcher),false);
 assert.equal(await verifyAccess('',c,fetcher),false);
});
test('real local HTTP Panel: password, session, Host, CSRF, site/files, no outbound fetch',async()=>{
 const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const password=crypto.randomBytes(24).toString('base64url');security.setPassword(password);
 const preload=path.join(temp,'no-network.mjs');fs.writeFileSync(preload,"globalThis.fetch=async()=>{throw Error('OUTBOUND_FETCH_FORBIDDEN');};\n");
 const child=spawn(process.execPath,['--import',pathToFileURL(preload).href,path.join(root,'panel/src/server.mjs')],{env:{...process.env,MHS_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 const call=(route,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{const bytes=body===undefined?null:Buffer.from(JSON.stringify(body));const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers:{...headers,...(bytes?{'content-type':'application/json','content-length':bytes.length}:{})}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{let data;try{data=JSON.parse(b);}catch{data=b;}resolve({status:res.statusCode,headers:res.headers,data});});});req.on('error',reject);req.end(bytes);});
 try{
  for(let i=0;i<60;i++){try{if((await call('/api/session')).status===200)break;}catch{}await new Promise(r=>setTimeout(r,50));}
  assert.equal((await call('/api/sites')).status,401);
  assert.equal((await call('/',{headers:{host:'evil.example.com'}})).status,403);
  assert.equal((await call('/api/login',{method:'POST',body:{username:'admin',password:'bad'}})).status,401);
  const login=await call('/api/login',{method:'POST',body:{username:'admin',password}});assert.equal(login.status,200);
  const cookie=login.headers['set-cookie'][0].split(';')[0],headers={cookie,'x-csrf-token':login.data.csrf};
  assert.equal((await call('/api/sites',{method:'POST',headers:{cookie},body:{}})).status,403);
  assert.equal((await call('/api/sites',{method:'POST',headers:{...headers,origin:'https://evil.example'},body:{}})).status,403);
  assert.equal((await call('/api/sites',{method:'POST',headers,body:{slug:'http-web',hostname:'http.example.com'}})).status,201);
  assert.equal((await call('/api/sites',{headers})).data.sites.length,2);
  const overview=await call('/api/overview',{headers});assert.equal(overview.status,200);assert.equal(overview.data.mode,'SINGLE');assert.equal(overview.data.clusterRequests,0);
  assert.equal((await call('/api/mhc/cluster',{headers})).status,404);
  assert.equal((await call('/api/logout',{method:'POST',headers})).status,200);
  assert.equal((await call('/api/sites',{headers})).status,401);
  assert.doesNotMatch(output,/OUTBOUND_FETCH_FORBIDDEN/);assert.ok(!output.includes(password));
 }finally{child.kill();await new Promise(r=>child.once('close',r));}
});
test('runtime source has no Cluster endpoints or outgoing orchestration modules',()=>{
 for(const p of ['panel/src/server.mjs','panel/src/system.mjs','panel/public/app.js']){
  const s=fs.readFileSync(path.join(root,p),'utf8');assert.doesNotMatch(s,/\/api\/mhc\/|cluster-authority|site-poll|DurableObject|setInterval.*heartbeat/);
 }
});
test('unauthenticated LAN Monitor is read-only and exposes only allowlisted telemetry',async()=>{
 const {createLanMonitor,privateAddress}=await import('../panel/src/lan-monitor.mjs');
 for(const ip of ['192.168.1.20','10.1.2.3','172.16.1.2','::ffff:192.168.1.1','fd00::1'])assert.equal(privateAddress(ip),true);
 for(const ip of ['8.8.8.8','172.32.0.1','192.0.2.1','2001:4860::1'])assert.equal(privateAddress(ip),false);
 const fixture={time:new Date().toISOString(),device:'fixture',cpuPct:12,mem:{total:1024,available:512},services:{'mhs-panel':{ok:true,out:'run: mhs-panel secret detail'}},password:'NEVER_EXPORT',token:'NEVER_EXPORT',log:'NEVER_EXPORT'};
 const server=createLanMonitor(async()=>fixture);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/Monitor trực tiếp/);
  const res=await fetch(base+'/api/metrics');assert.equal(res.status,200);assert.equal(res.headers.get('set-cookie'),null);const text=await res.text();assert.doesNotMatch(text,/NEVER_EXPORT|secret detail/);assert.equal(JSON.parse(text).services[0].running,true);
  assert.equal((await fetch(base+'/api/metrics',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/api/sites')).status,404);
  assert.equal((await fetch(base+'/app.js')).status,404);
  const hostile=await new Promise((resolve,reject)=>{const q=http.get(base+'/api/metrics',{headers:{host:'evil.example.com'}},r=>{r.resume();resolve(r.statusCode);});q.on('error',reject);});
  assert.equal(hostile,403);
  assert.equal((await fetch(base+'/api/metrics',{headers:{origin:'https://evil.example.com'}})).status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
