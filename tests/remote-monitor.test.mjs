import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {accessFixture,listen,close} from './access-fixture.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-remote-monitor-'));process.env.MHS_HOME=temp;process.env.MHS_DATA=path.join(temp,'data');
const c=await import('../panel/src/config.mjs');c.initialize();
const {createRemoteMonitor,createLanMonitor}=await import('../panel/src/lan-monitor.mjs');
test('Remote Monitor serves standalone sanitized GETs with its own owner/Host/AUD, never a Panel cookie',async()=>{
 const f=accessFixture();let owner=true,collections=0;
 const fixture={device:'Synthetic Phone',time:new Date().toISOString(),cpuPct:12,mem:{total:1024,available:512},services:{'mhs-db':{ok:true,out:'run: private PID/password'}},token:'NEVER_EXPORT',password:'NEVER_EXPORT',sites:['private.example.com'],sql:'NEVER_EXPORT',logs:'NEVER_EXPORT'};
 const remote=createRemoteMonitor({collect:async()=>{collections++;return fixture;},fetcher:f.fetcher,readConfig:surface=>surface==='monitor'?{...f.monitor,ownerEmail:owner?f.monitor.ownerEmail:'other@example.com'}:f.panel}),call=await listen(remote);
 const jwt=f.sign(f.monitor),headers={host:f.monitor.hostname,'cf-access-jwt-assertion':jwt};
 try{
  for(const h of [{host:f.monitor.hostname},{...headers,host:'localhost:9091'},{...headers,host:f.panel.hostname},{...headers,'cf-access-jwt-assertion':f.sign(f.panel)},{...headers,'cf-access-jwt-assertion':f.sign(f.monitor,{email:'viewer@example.com'})},{...headers,'cf-access-jwt-assertion':f.sign(f.monitor,{iss:'https://other.cloudflareaccess.com'})},{...headers,'cf-access-jwt-assertion':f.sign(f.monitor,{exp:1})},{...headers,'cf-access-jwt-assertion':'bad'},{host:f.monitor.hostname,cookie:'mhs_session=forged; __Host-mhs_sso=forged','cf-access-authenticated-user-email':'owner@example.com'}])assert.equal((await call('/api/metrics',{headers:h})).status,403);
  assert.equal(collections,0);
  const page=await call('/',{headers});assert.equal(page.status,200);assert.match(page.data,/Cloudflare Access/);assert.doesNotMatch(page.data,/loginForm|password/);
  for(const route of ['/monitor.js','/monitor.css','/api/metrics']){const r=await call(route,{headers});assert.equal(r.status,200);assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.headers['access-control-allow-origin'],undefined);assert.doesNotMatch(typeof r.data==='string'?r.data:JSON.stringify(r.data),/NEVER_EXPORT|private.example|private PID/);}
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','HEAD'])assert.equal((await call('/api/metrics',{method,headers})).status,405);
  for(const route of ['/api/sites','/api/services/mhs-db/action','/api/backups','/api/files','/api/session','/api/login','/app.js','/../data/admin.json','/api/metrics?path=secret','/toString'])assert.equal((await call(route,{headers})).status,404);
  assert.equal((await call('/api/metrics',{headers:{...headers,origin:'https://evil.example.com'}})).status,403);
  owner=false;assert.equal((await call('/api/metrics',{headers})).status,403);
 }finally{await close(remote);}
});
test('LAN Monitor remains anonymous GET-only and refuses Tunnel proxy headers even with private Host',async()=>{
 const server=createLanMonitor(async()=>({time:new Date().toISOString(),services:{}})),call=await listen(server);
 try{assert.equal((await call('/api/metrics')).status,200);assert.equal((await call('/api/metrics',{headers:{'cf-ray':'misrouted'}})).status,403);assert.equal((await call('/api/metrics',{headers:{'x-forwarded-host':'monitor.example.com'}})).status,403);assert.equal((await call('/api/metrics',{method:'POST'})).status,405);}finally{await close(server);}
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
