import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {accessFixture,listen,close} from './access-fixture.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-remote-setup-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'home/.local/share/mhs/data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const {wizard,routePlan,configureRemote}=await import('../tools/cloudflare.mjs');
test('Vietnamese remote wizard saves two exact Access apps, hides/reuses token, plans only safe routes',async()=>{
 const f=accessFixture(),token='syntheticConnectorToken'.repeat(10),answers=['MHS','OWNER@example.com',f.panel.teamDomain,f.panel.hostname,f.panel.audience,f.monitor.hostname,f.monitor.audience,token],output=[],prompts=[];
 const result=await wizard({input:async(p,o)=>{prompts.push({p,o});return answers.shift();},print:s=>output.push(s)});assert.equal(result.cloudflareApplied,false);assert.equal(prompts.at(-1).o.secret,true);assert.ok(!output.join('\n').includes(token));
 const config=c.readJson(path.join(c.DATA,'remote-access.json'));assert.deepEqual(config,{schema:2,panel:f.panel,monitor:f.monitor});
 const plan=c.readJson(path.join(c.DATA,'cloudflare-route-plan.json'));assert.equal(plan.routes[0].service,'http://127.0.0.1:9093');assert.equal(plan.routes[1].service,'http://127.0.0.1:9092');assert.ok(plan.routes.every(r=>!/:909[01]$/.test(r.service)));
 const again=['MHS','owner@example.com',f.panel.teamDomain,f.panel.hostname,f.panel.audience,f.monitor.hostname,f.monitor.audience,''];await wizard({input:async()=>again.shift(),print:()=>{}});assert.equal(fs.readFileSync(path.join(c.DATA,'cloudflare/tunnel-token'),'utf8'),token);
 assert.throws(()=>routePlan(f.panel,{...f.monitor,hostname:f.panel.hostname}),/INVALID_ACCESS/);assert.throws(()=>configureRemote(f.panel,{...f.monitor,audience:f.panel.audience}),/INVALID_ACCESS/);
});
test('doctor actual negative HTTP probes detect unsafe remote surface and emit no private content',async()=>{
 const f=accessFixture(),{doctor}=await import('../tools/doctor.mjs'),{createPanelServer}=await import('../panel/src/server.mjs'),{createRemoteMonitor,createLanMonitor}=await import('../panel/src/lan-monitor.mjs'),{setPassword}=await import('../panel/src/security.mjs');setPassword('private-fixture-password-1234');
 const servers=[createPanelServer({port:9090}),createPanelServer({remote:true,readConfig:()=>f.panel,fetcher:f.fetcher}),createRemoteMonitor({readConfig:()=>f.monitor,fetcher:f.fetcher,collect:async()=>({services:{}})}),createLanMonitor(async()=>({services:{}}))];const calls=await Promise.all(servers.map(listen)),ports={9090:calls[0],9093:calls[1],9092:calls[2],9091:calls[3]};
 const probe=async(port,host,route)=>ports[port](route,{headers:{host}});
 c.atomicJson(path.join(c.DATA,'settings.json'),{lanMonitorEnabled:true});c.atomicJson(path.join(c.DATA,'install.json'),{phase:'INSTALLED'});
 const boot=path.join(c.HOME,'.termux/boot/20-mhs-start');fs.mkdirSync(path.dirname(boot),{recursive:true});fs.writeFileSync(boot,'# MHS-owned boot');
 try{const report=await doctor({probe,loadConfig:surface=>surface==='panel'?f.panel:f.monitor});assert.equal(report.summary.FAIL,0);assert.ok(report.summary['NOT RUN']>0);assert.doesNotMatch(JSON.stringify(report),/syntheticConnectorToken|private-fixture-password|OWNER@|owner@example.com/);
  const insecure=await doctor({probe:async(port,host,route)=>port===9093?{status:200}:probe(port,host,route),loadConfig:surface=>surface==='panel'?f.panel:f.monitor});assert.ok(insecure.checks.some(c=>c.id==='panel-anonymous-denied'&&c.status==='FAIL'));
  const bad=await doctor({probe,loadConfig:()=>null});assert.ok(bad.checks.some(c=>c.id==='panel-access-config'&&c.status==='FAIL'));
 }finally{await Promise.all(servers.map(close));}
});
test('management source upgrade adds independent Monitor and rollback stops it before old Panel',async()=>{
 const {reconcileManagement}=await import('../tools/management.mjs'),base=path.join(c.HOME,'.local/share/mhs'),target=path.join(base,'releases/fixture-selected'),current=path.join(base,'current/panel/src');fs.mkdirSync(path.join(target,'panel/src'),{recursive:true});fs.symlinkSync(target,path.join(base,'current'),process.platform==='win32'?'junction':'dir');const file=path.join(current,'monitor-server.mjs');fs.writeFileSync(file,'// fixture');const calls=[];const run=async(file,args)=>{calls.push(args);return {ok:true};};
 await reconcileManagement({run,pause:async()=>{}});assert.ok(fs.existsSync(path.join(c.SERVICE_DIR,'mhs-monitor/mhs-owned')));assert.deepEqual(calls.map(c=>path.basename(c.at(-1))),['mhs-panel','mhs-monitor']);
 const selected=fs.realpathSync(path.join(c.HOME,'.local/share/mhs/current'));
 for(const name of ['mhs-panel','mhs-monitor']){const script=fs.readFileSync(path.join(c.SERVICE_DIR,name,'run'),'utf8');assert.ok(script.includes(selected));assert.ok(!script.includes(path.join('.local','share','mhs','current')+path.sep));}
 fs.unlinkSync(file);calls.length=0;await reconcileManagement({run,pause:async()=>{}});assert.ok(fs.existsSync(path.join(c.SERVICE_DIR,'mhs-monitor/down')));assert.equal(calls[0].at(-2),'down');assert.equal(path.basename(calls[0].at(-1)),'mhs-monitor');assert.ok(calls.every(c=>!c.some(v=>/mhs-db|mhs-nginx|mhs-tunnel/.test(v))));
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
