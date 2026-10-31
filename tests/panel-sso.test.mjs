import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {accessFixture,listen,close} from './access-fixture.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-sso-'));process.env.MHS_HOME=temp;process.env.MHS_DATA=path.join(temp,'data');
const c=await import('../panel/src/config.mjs');c.initialize();const {setPassword}=await import('../panel/src/security.mjs');setPassword('local-fixture-password-123456');
const {createPanelServer}=await import('../panel/src/server.mjs');
test('remote-only SSO validates identity every request, binds session/CSRF, revokes logout and keeps local offline',async()=>{
 const f=accessFixture();let allowed=true;const readConfig=()=>allowed?f.panel:{...f.panel,ownerEmail:'other@example.com'};
 const remote=createPanelServer({remote:true,readConfig,fetcher:f.fetcher}),call=await listen(remote);
 const jwt=f.sign(),base={host:f.panel.hostname,'cf-access-jwt-assertion':jwt};
 const local=createPanelServer({port:9090}),localCall=await listen(local),localHeaders={host:'localhost:9090'};
 try{
  for(const headers of [{host:'localhost:9090'},{host:f.panel.hostname},{host:f.panel.hostname,'cf-access-authenticated-user-email':'owner@example.com'},{...base,host:'evil.example.com'},{...base,host:'localhost:9090','x-forwarded-host':f.panel.hostname}])assert.equal((await call('/api/session',{headers})).status,403);
  for(const token of [f.sign(f.panel,{email:'viewer@example.com'}),f.sign(f.panel,{sub:''}),f.sign(f.monitor),f.sign(f.panel,{iss:'https://evil.cloudflareaccess.com'}),f.sign(f.panel,{exp:1}),f.sign(f.panel,{nbf:Math.floor(Date.now()/1000)+100}),f.sign(f.panel,{}, {alg:'none'}),'unsigned',jwt.slice(0,-5)+'AAAAA'])assert.equal((await call('/api/session',{headers:{...base,'cf-access-jwt-assertion':token}})).status,403);
  assert.equal((await call('/api/sites',{headers:base})).status,401);
  const session=await call('/api/session',{headers:base});assert.equal(session.status,200);assert.equal(session.data.loggedIn,true);assert.equal(session.data.authMode,'access-sso');assert.doesNotMatch(JSON.stringify(session.data),/owner@example|signed-owner|tokenHash|eyJ/);
  const page=await call('/',{headers:base});assert.match(page.data,/name="mhs-auth-mode" content="access-sso"/);assert.equal(page.headers['cache-control'],'no-store');
  const cookie=session.headers['set-cookie'][0];assert.match(cookie,/__Host-mhs_sso=/);assert.match(cookie,/Secure/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.doesNotMatch(cookie,/Domain=/);
  const h={...base,cookie:cookie.split(';')[0],'x-csrf-token':session.data.csrf,origin:'https://'+f.panel.hostname};
  assert.equal((await call('/api/login',{method:'POST',headers:h,body:{username:'admin',password:'local-fixture-password-123456'}})).status,403);
  assert.equal((await call('/api/sites',{method:'POST',headers:{...h,'x-csrf-token':''},body:{}})).status,403);
  const {origin,...noOrigin}=h;assert.equal((await call('/api/sites',{method:'POST',headers:noOrigin,body:{}})).status,403);
  assert.equal((await call('/api/sites',{method:'POST',headers:{...h,origin:'https://evil.example.com'},body:{}})).status,403);
  assert.equal((await call('/api/sites',{method:'POST',headers:h,body:{slug:'remote-web',hostname:'remote.example.com'}})).status,201);
  assert.equal((await call('/api/sites',{headers:{...h,'cf-access-jwt-assertion':''}})).status,403);
  const changed=f.sign(f.panel,{sub:'changed-subject'});assert.equal((await call('/api/sites',{headers:{...h,'cf-access-jwt-assertion':changed}})).status,401);
  allowed=false;assert.equal((await call('/api/sites',{headers:h})).status,403);allowed=true;
  for(const headers of [{...localHeaders,'cf-ray':'forged-tunnel'},{...localHeaders,'cf-access-jwt-assertion':jwt},{...localHeaders,'x-forwarded-host':f.panel.hostname},{host:f.panel.hostname}])assert.equal((await localCall('/api/session',{headers})).status,403);
  const localLogin=await localCall('/api/login',{method:'POST',headers:localHeaders,body:{username:'admin',password:'local-fixture-password-123456'}});assert.equal(localLogin.status,200);
  assert.match((await localCall('/',{headers:localHeaders})).data,/name="mhs-auth-mode" content="local-password"/);
  assert.equal((await call('/api/sites',{headers:{...base,cookie:localLogin.headers['set-cookie'][0].split(';')[0]}})).status,401);
  const logout=await call('/api/logout',{method:'POST',headers:h});assert.equal(logout.status,200);assert.equal(logout.data.logoutUrl,'https://panel.example.com/cdn-cgi/access/logout');
  assert.equal((await call('/api/session',{headers:base})).status,403);assert.equal((await call('/api/sites',{headers:h})).status,403);
  assert.equal((await localCall('/api/session',{headers:{...localHeaders,cookie:localLogin.headers['set-cookie'][0].split(';')[0]}})).data.loggedIn,true);
  const renewed=f.sign(f.panel,{exp:Math.floor(Date.now()/1000)+301});assert.equal((await call('/api/session',{headers:{...base,'cf-access-jwt-assertion':renewed}})).data.loggedIn,true);
 }finally{await close(remote);await close(local);}
 const restarted=createPanelServer({remote:true,readConfig,fetcher:f.fetcher}),again=await listen(restarted);try{assert.equal((await again('/api/session',{headers:base})).status,403);}finally{await close(restarted);}
});
test('JWKS failure is fail-closed while local password recovery has no network dependency',async()=>{
 const f=accessFixture(),server=createPanelServer({remote:true,readConfig:()=>f.panel,fetcher:async()=>{throw Error('offline');}}),call=await listen(server);try{assert.equal((await call('/api/session',{headers:{host:f.panel.hostname,'cf-access-jwt-assertion':f.sign()}})).status,403);}finally{await close(server);}
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
