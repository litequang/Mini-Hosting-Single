import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-node-build-'));
process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));process.env.MHS_PORT=String(probe.address().port);await new Promise(r=>probe.close(r));
const c=await import('../panel/src/config.mjs');assert.equal(c.DATA,path.resolve(process.env.MHS_DATA));c.initialize();
const sites=await import('../panel/src/sites.mjs'),{nodeBuildOperations}=await import('../panel/src/node-build.mjs'),{buildJournal}=await import('../panel/src/node-build-state.mjs'),{zip}=await import('./helpers.mjs');
const text=(root,p)=>fs.readFileSync(path.join(root,p),'utf8'),put=(root,p,value)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),value);};
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
let seq=0;
async function fixture(options={}){
 const slug='build-'+(++seq),s=await sites.addSite({slug,hostname:slug+'.example.com',type:'node',entry:options.entry||'dist/server.cjs'}),root=sites.siteRoot(s),calls=[];
 put(root,s.entry,'module.exports = "old";');put(root,'dist/stale.js','old asset');
 for(const p of ['package.json','package-lock.json','node_modules/sentinel','sheets/sentinel','storage/sentinel'])put(root,p,p.endsWith('.json')?'{}':'keep '+p);
 const env=path.join(c.DATA,'node-env-'+slug+'.json');c.atomicJson(env,{FIXTURE:'unchanged'});
 const ops=nodeBuildOperations({service:async(name,action)=>{assert.equal(name,'mhs-site-'+slug);calls.push(action);},status:async()=>({ok:true,out:'run: fixture'}),health:async()=>({ok:!text(root,s.entry).includes('unhealthy'),status:200}),pause:async()=>{},...options});
 function archive(entries,name='build.zip'){put(root,name,zip(entries));return name;}
 const unchanged=()=>{for(const p of ['package.json','package-lock.json','node_modules/sentinel','sheets/sentinel','storage/sentinel'])assert.equal(text(root,p),p.endsWith('.json')?'{}':'keep '+p);assert.deepEqual(c.readJson(env),{FIXTURE:'unchanged'});};
 return {slug,s,root,calls,ops,archive,unchanged};
}
test('nested Node builds replace only dist, remove stale assets and retain dependencies/media/env; explicit rollback',async()=>{
 const f=await fixture();f.archive({'dist/server.cjs':'module.exports = "new";','dist/new.js':'asset'});const p=await f.ops.preview(f.slug,'build.zip');
 assert.equal(p.target,'dist');assert.equal(p.files,2);assert.equal(p.restartRequired,true);assert.deepEqual(f.calls,[]);assert.equal(text(f.root,f.s.entry),'module.exports = "old";');
 assert.equal((await f.ops.deploy(f.slug,{id:p.id,confirm:f.slug})).httpVerified,true);assert.deepEqual(f.calls,['down','up']);assert.equal(text(f.root,f.s.entry),'module.exports = "new";');assert.equal(fs.existsSync(path.join(f.root,'dist/stale.js')),false);f.unchanged();
 await f.ops.rollback(f.slug,f.slug);assert.equal(text(f.root,f.s.entry),'module.exports = "old";');assert.equal(text(f.root,'dist/stale.js'),'old asset');assert.equal(f.ops.status(f.slug).journal.phase,'ROLLED_BACK');f.unchanged();
});
test('flat ZIP and one wrapper ZIP are normalized without merging old files',async()=>{
 for(const prefix of ['', 'project/dist/']){const f=await fixture();const p=await f.ops.preview(f.slug,f.archive({[prefix+'server.cjs']:'module.exports = 2;',[prefix+'index.html']:'new',[prefix+'audio/instrument/source/Data/sample.txt']:'bundled public sample'}));await f.ops.deploy(f.slug,{id:p.id,confirm:f.slug});assert.equal(text(f.root,'dist/index.html'),'new');assert.equal(text(f.root,'dist/audio/instrument/source/Data/sample.txt'),'bundled public sample');assert.equal(fs.existsSync(path.join(f.root,'dist/stale.js')),false);f.unchanged();}
});
test('syntax validation uses the existing root package module type without importing or executing the app',async()=>{
 const f=await fixture({entry:'dist/server.js'});put(f.root,'package.json','{"type":"module"}');
 const marker=path.join(temp,'must-not-execute');const p=await f.ops.preview(f.slug,f.archive({'server.js':'import fs from "node:fs";fs.writeFileSync('+JSON.stringify(marker)+',"bad");export default 1;'}));assert.equal(p.entry,'dist/server.js');assert.equal(fs.existsSync(marker),false);assert.deepEqual(f.calls,[]);
 put(f.root,'package.json','{"type":"commonjs"}');await assert.rejects(()=>f.ops.preview(f.slug,'build.zip'),/SYNTAX/);assert.equal(fs.existsSync(marker),false);
});
test('syntax, entry, ambiguity, protected files, dependencies, data and complete app ZIP refused before stopping',async()=>{
 const f=await fixture();
 for(const [entries,pattern] of [
  [{'server.cjs':'function ('},/SYNTAX/],
  [{'index.html':'no backend'},/ENTRY_MISSING/],
  [{'server.cjs':'','dist/server.cjs':''},/AMBIGUOUS/],
  [{'dist/server.cjs':'','package.json':'{}'},/OUTSIDE_BUILD/],
  [{'dist/server.cjs':'','dist/storage/media':'private'},/DATA_OR_DEPENDENCIES/],
  [{'dist/server.cjs':'','dist/assets/storage/media':'private'},/DATA_OR_DEPENDENCIES/],
  [{'dist/server.cjs':'','dist/data/rows':'private'},/DATA_OR_DEPENDENCIES/],
  [{'dist/server.cjs':'','dist/node_modules/test.js':''},/DATA_OR_DEPENDENCIES/],
  [{'dist/server.cjs':'','dist/.env':'private'},/PROTECTED/],
  [{'dist/server.cjs':'','dist/backup.sql':'sql'},/DATA_OR_DEPENDENCIES/],
  [{'../escape':'bad'},/path|invalid/i]
 ])await assert.rejects(()=>f.ops.preview(f.slug,f.archive(entries)),pattern);
 assert.deepEqual(f.calls,[]);f.unchanged();
 const rootEntry=await fixture({entry:'server.cjs'});await assert.rejects(()=>rootEntry.ops.preview(rootEntry.slug,rootEntry.archive({'server.cjs':''})),/NESTED_ENTRY/);
 const front=await import('../panel/src/frontend.mjs');assert.throws(()=>front.configureFrontend(f.slug,'dist',f.slug),/OVERLAPS_BACKEND/);
});
test('changed ZIP, current build or site configuration invalidates preview before any service action',async()=>{
 for(const change of ['zip','build','site','expired','confirm']){const f=await fixture();f.archive({'server.cjs':'module.exports=2;'});const p=await f.ops.preview(f.slug,'build.zip');
  if(change==='zip')f.archive({'server.cjs':'module.exports=3;'});
  if(change==='build')put(f.root,f.s.entry,'module.exports=4;');
  if(change==='site'){const r=c.registry();r.sites=r.sites.map(s=>s.slug===f.slug?{...s,port:s.port+1000}:s);c.saveRegistry(r);}
  if(change==='expired'){const file=path.join(c.DATA,'node-build-plans',p.id+'.json'),j=c.readJson(file);j.createdAt=0;c.atomicJson(file,j);}
  await assert.rejects(()=>f.ops.deploy(f.slug,{id:p.id,confirm:change==='confirm'?'wrong':f.slug}),/CHANGED|REPREVIEW|CONFIRM/);assert.deepEqual(f.calls,[]);
 }
});
test('unhealthy new app automatically restores previous build, restarts and verifies old HTTP',async()=>{
 const f=await fixture();const p=await f.ops.preview(f.slug,f.archive({'server.cjs':'module.exports="unhealthy";'}));
 await assert.rejects(()=>f.ops.deploy(f.slug,{id:p.id,confirm:f.slug}),/HTTP_FAILED/);assert.equal(f.ops.status(f.slug).journal.phase,'ROLLED_BACK');assert.equal(text(f.root,f.s.entry),'module.exports = "old";');assert.deepEqual(f.calls,['down','up','down','up']);f.unchanged();
});
test('startup or directory-swap failure restores known old files; failed recovery remains recoverable',async()=>{
 for(const phase of ['STOPPED','OLD_MOVED','NEW_INSTALLED']){let thrown=false;const f=await fixture({checkpoint:p=>{if(p===phase&&!thrown){thrown=true;throw Error('interruption');}}});const p=await f.ops.preview(f.slug,f.archive({'server.cjs':'module.exports=2;'}));await assert.rejects(()=>f.ops.deploy(f.slug,{id:p.id,confirm:f.slug}),/OPERATION_FAILED/);assert.equal(f.ops.status(f.slug).journal.phase,'ROLLED_BACK');assert.equal(text(f.root,f.s.entry),'module.exports = "old";');f.unchanged();}
 const f=await fixture();let broken=true;const ops=nodeBuildOperations({service:async(name,action)=>{if(action==='up'&&broken)throw Error('startup failed');},status:async()=>({ok:true,out:'run: fixture'}),health:async()=>({ok:true}),pause:async()=>{}});const p=await ops.preview(f.slug,f.archive({'server.cjs':'module.exports=2;'}));
 await assert.rejects(()=>ops.deploy(f.slug,{id:p.id,confirm:f.slug}),/RECOVERY_REQUIRED/);assert.equal(ops.status(f.slug).journal.phase,'RECOVERY_REQUIRED');await assert.rejects(()=>sites.updateSite(f.slug,{hostname:'changed.example.com'}),/RECOVERY_REQUIRED/);await assert.rejects(()=>sites.deleteSite(f.slug),/RECOVERY_REQUIRED/);
 broken=false;await ops.rollback(f.slug,f.slug);assert.equal(ops.status(f.slug).journal.phase,'ROLLED_BACK');assert.equal(text(f.root,f.s.entry),'module.exports = "old";');f.unchanged();
});
test('recovery handles a missing live dist after a process interruption and refuses changed previous code',async()=>{
 const f=await fixture();const p=await f.ops.preview(f.slug,f.archive({'server.cjs':'module.exports=2;'}));await f.ops.deploy(f.slug,{id:p.id,confirm:f.slug});const j=c.readJson(buildJournal(f.slug)),base=path.join(c.DATA,'node-build-releases',f.slug,j.id);
 fs.renameSync(path.join(f.root,'dist'),path.join(base,'interrupted-new'));j.phase='OLD_MOVED';c.atomicJson(buildJournal(f.slug),j);await f.ops.rollback(f.slug,f.slug);assert.equal(text(f.root,f.s.entry),'module.exports = "old";');f.unchanged();
 const g=await fixture();const q=await g.ops.preview(g.slug,g.archive({'server.cjs':'module.exports=2;'}));await g.ops.deploy(g.slug,{id:q.id,confirm:g.slug});const k=c.readJson(buildJournal(g.slug));put(path.join(c.DATA,'node-build-releases',g.slug,k.id,'previous'),'server.cjs','changed');
 await assert.rejects(()=>g.ops.rollback(g.slug,g.slug),/RECOVERY_REQUIRED/);assert.equal(text(g.root,g.s.entry),'module.exports=2;');assert.equal(g.ops.status(g.slug).journal.phase,'RECOVERY_REQUIRED');
});
test('site must already run a healthy real application; hardlinked build is refused',async()=>{
 for(const options of [{status:async()=>({ok:true,out:'down: fixture'})},{health:async()=>({ok:false})}]){const f=await fixture(options);const p=await f.ops.preview(f.slug,f.archive({'server.cjs':'module.exports=2;'}));await assert.rejects(()=>f.ops.deploy(f.slug,{id:p.id,confirm:f.slug}),/START_SITE_FIRST|CURRENT_HTTP_NOT_READY/);assert.deepEqual(f.calls,[]);}
 const f=await fixture();fs.linkSync(path.join(f.root,f.s.entry),path.join(f.root,'hardlink'));await assert.rejects(()=>f.ops.preview(f.slug,f.archive({'server.cjs':''})),/LINK/);assert.deepEqual(f.calls,[]);
});
test('HTTP keeps auth/CSRF, adapts old deploy-stored for dist-only builds and blocks queued writes after recovery failure',async()=>{
 const f=await fixture(),{setPassword,HttpError}=await import('../panel/src/security.mjs'),{createPanelServer}=await import('../panel/src/server.mjs');setPassword('synthetic-build-password-123456');
 let released,started,failed=false;const gate=new Promise(r=>released=r),running=new Promise(r=>started=r),buildOps={...f.ops,deploy:async(...args)=>{if(!failed)return f.ops.deploy(...args);started();await gate;c.atomicJson(buildJournal(f.slug),{project:'MHS',slug:f.slug,id:crypto.randomUUID(),phase:'RECOVERY_REQUIRED'});throw new HttpError(502,'NODE_BUILD_RECOVERY_REQUIRED');}};
 const server=createPanelServer({buildOps});await new Promise(r=>server.listen(Number(process.env.MHS_PORT),'127.0.0.1',r));const origin='http://127.0.0.1:'+process.env.MHS_PORT;
 try{const login=await fetch(origin+'/api/login',{method:'POST',headers:{origin},body:JSON.stringify({username:'admin',password:'synthetic-build-password-123456'})}),cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json(),headers={origin,cookie,'x-csrf-token':csrf};
  const post=(route,body,extra={})=>fetch(origin+route,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
  const route='/api/sites/'+f.slug;assert.equal((await fetch(origin+route+'/node-build-status')).status,401);assert.equal((await post(route+'/node-build-preview',{}, {'x-csrf-token':'wrong'})).status,403);
  const archive=f.archive({'dist/server.cjs':'module.exports=2;'}),sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,archive))).digest('hex');const deployed=await post(route+'/deploy-stored',{archive,sha256,confirm:f.slug});assert.equal(deployed.status,200);assert.equal(text(f.root,f.s.entry),'module.exports=2;');f.unchanged();
  failed=true;const deploy=post(route+'/node-build-deploy',{id:'synthetic',confirm:f.slug});await running;
  const write=fetch(origin+'/api/files/'+f.slug+'/write?path=dist/server.cjs',{method:'PUT',headers,body:'unwanted queued write'});await new Promise(r=>setTimeout(r,60));released();assert.equal((await deploy).status,502);assert.equal((await write).status,409);assert.equal(text(f.root,f.s.entry),'module.exports=2;');
 }finally{released();await new Promise(r=>server.close(r));}
});
