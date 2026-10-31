import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-node-setup-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const {addSite,siteRoot}=await import('../panel/src/sites.mjs'),{nodeSetupOperations}=await import('../panel/src/node-setup.mjs');
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
async function site(slug){const s=await addSite({slug,hostname:slug+'.example.com',type:'node'}),root=siteRoot(s);fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({private:true,dependencies:{'fixture-dependency':'1.0.0'},scripts:{postinstall:'must never run'}}));fs.writeFileSync(path.join(root,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{}}));return {s,root};}
test('first-use preparation validates confirmation/lock, installs into private staging and preserves application/env',async()=>{
 const {s,root}=await site('first-node'),before=fs.readFileSync(path.join(root,'server.mjs'));const env=path.join(c.DATA,'node-env-'+s.slug+'.json');fs.writeFileSync(env,'{"PRIVATE_FIXTURE":"unchanged"}');
 let calls=0;const ops=nodeSetupOperations({space:()=>{},install:async stage=>{calls++;assert.ok(!stage.startsWith(root));fs.mkdirSync(path.join(stage,'node_modules/fixture-dependency'),{recursive:true});fs.writeFileSync(path.join(stage,'node_modules/fixture-dependency/package.json'),'{"version":"1.0.0"}');}});
 assert.deepEqual(ops.status(s.slug).missingDependencies,['fixture-dependency']);assert.throws(()=>ops.prepare(s.slug,'wrong'),/CONFIRM/);ops.prepare(s.slug,s.slug);await ops.launch(s.slug,fn=>fn());
 assert.equal(calls,1);assert.equal(ops.status(s.slug).job.phase,'READY');assert.equal(ops.status(s.slug).missingDependencies.length,0);assert.deepEqual(fs.readFileSync(path.join(root,'server.mjs')),before);assert.equal(fs.readFileSync(env,'utf8'),'{"PRIVATE_FIXTURE":"unchanged"}');
});
test('failed npm or changed package does not replace existing libraries',async()=>{
 const {s,root}=await site('keep-node');fs.mkdirSync(path.join(root,'node_modules'),{recursive:true});fs.writeFileSync(path.join(root,'node_modules/sentinel'),'old');
 const failed=nodeSetupOperations({space:()=>{},install:async()=>{throw Error('npm output may contain a private URL');}});failed.prepare(s.slug,s.slug);await failed.launch(s.slug,fn=>fn());assert.equal(failed.status(s.slug).job.phase,'FAILED');assert.equal(failed.status(s.slug).job.error,'NODE_DEPENDENCIES_INSTALL_FAILED');assert.equal(fs.readFileSync(path.join(root,'node_modules/sentinel'),'utf8'),'old');
 const changed=nodeSetupOperations({space:()=>{},install:async stage=>{fs.mkdirSync(path.join(stage,'node_modules'));fs.appendFileSync(path.join(root,'package.json'),' ');}});changed.prepare(s.slug,s.slug);await changed.launch(s.slug,fn=>fn());assert.equal(changed.status(s.slug).job.error,'NODE_PACKAGE_CHANGED_RETRY');assert.equal(fs.readFileSync(path.join(root,'node_modules/sentinel'),'utf8'),'old');
});
test('missing lockfile is refused before package execution',async()=>{
 const {s,root}=await site('missing-lock');fs.unlinkSync(path.join(root,'package-lock.json'));let called=false;const ops=nodeSetupOperations({space:()=>{},install:async()=>{called=true;}});assert.throws(()=>ops.prepare(s.slug,s.slug),/PACKAGE_AND_LOCK_REQUIRED/);assert.equal(called,false);
});
test('guided configuration binds only owned unbound databases and never returns their secrets',async()=>{
 const {s}=await site('config-node'),other=await site('bound-node');
 c.atomicJson(path.join(c.DATA,'databases.json'),{fixture_db:{user:'fixture-user',password:'private-fixture-value'},taken_db:{user:'other-user',password:'other-private-value'}});
 const r=c.registry();c.atomicJson(c.REGISTRY,{...r,sites:r.sites.map(value=>value.slug===other.s.slug?{...value,database:'taken_db'}:value)});
 const envFile=path.join(c.DATA,'node-env-'+s.slug+'.json');c.atomicJson(envFile,{CUSTOM_SETTING:'preserved'});const ops=nodeSetupOperations();
 assert.deepEqual((await ops.configuration(s.slug)).databases,['fixture_db']);assert.throws(()=>ops.configure(s.slug,{confirm:'wrong',database:'fixture_db'}),/CONFIRM/);
 assert.throws(()=>ops.configure(s.slug,{confirm:s.slug,database:'unknown_db'}),/NOT_FOUND/);assert.throws(()=>ops.configure(s.slug,{confirm:s.slug,database:'taken_db'}),/ALREADY_BOUND/);
 const result=ops.configure(s.slug,{confirm:s.slug,database:'fixture_db'}),env=c.readJson(envFile);assert.equal(env.MYSQL_SOCKET,c.SOCKET);assert.equal(env.MYSQL_PASSWORD,'private-fixture-value');assert.equal(env.CUSTOM_SETTING,'preserved');assert.equal(env.APP_URL,'https://config-node.example.com');assert.equal(result.database,'fixture_db');assert.ok(!JSON.stringify(result).includes('private-fixture-value'));
 assert.ok(fs.readdirSync(c.DATA).some(name=>name.startsWith('node-config-before-'+s.slug+'-')));
});
test('start refuses missing libraries and health uses real HTTP with placeholder detection',async()=>{
 const {s,root}=await site('start-node');let called=false;const ops=nodeSetupOperations({restart:async(name,action)=>{called=true;assert.equal(name,'mhs-site-'+s.slug);assert.equal(action,'restart');},probe:async()=>({ok:true,status:200,placeholder:false})});
 await assert.rejects(()=>ops.start(s.slug,s.slug),/DEPENDENCIES_REQUIRED/);assert.equal(called,false);fs.mkdirSync(path.join(root,'node_modules/fixture-dependency'),{recursive:true});fs.writeFileSync(path.join(root,'node_modules/fixture-dependency/package.json'),'{}');assert.equal((await ops.start(s.slug,s.slug)).started,true);
 const http=await import('node:http'),{siteHttpHealth}=await import('../panel/src/system.mjs');let response='MHS Node ready';const server=http.createServer((req,res)=>{assert.equal(req.headers.host,s.hostname);res.end(response);});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const target={...s,port:server.address().port};assert.equal((await siteHttpHealth(target)).placeholder,true);response='<html>Actual application</html>';assert.equal((await siteHttpHealth(target)).placeholder,false);}finally{await new Promise(r=>server.close(r));}
});
