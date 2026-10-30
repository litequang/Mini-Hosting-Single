import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(import.meta.dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-install-'));
process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'home/.local/share/mhs/data');process.env.PREFIX=path.join(temp,'prefix');fs.mkdirSync(path.join(process.env.PREFIX,'bin'),{recursive:true});
const config=await import('../panel/src/config.mjs'),{sha256,verifyRelease}=await import('../tools/release.mjs'),{installSource,BASE}=await import('../tools/install.mjs'),{writeArchive}=await import('../panel/src/archive.mjs');
function fixtureSource(version,commit){const dir=path.join(temp,'source-'+version),files=[];const copy=d=>{for(const e of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const p=path.posix.join(d,e.name);if(e.isDirectory())copy(p);else{const out=path.join(dir,p);fs.mkdirSync(path.dirname(out),{recursive:true});const b=fs.readFileSync(path.join(root,p));fs.writeFileSync(out,b);files.push({path:p,sha256:sha256(b),mode:p.endsWith('.sh')?0o700:0o600});}}};for(const d of ['panel','tools','scripts'])copy(d);const pkg=Buffer.from(JSON.stringify({name:'mhs-fixture',version,type:'module'}));fs.writeFileSync(path.join(dir,'package.json'),pkg);files.push({path:'package.json',sha256:sha256(pkg),mode:0o600});fs.writeFileSync(path.join(dir,'release.json'),JSON.stringify({project:'MHS',schema:1,version,commit,files}));return dir;}
const source=fixtureSource('2.0.0-rc.1','a'.repeat(40));
test('fresh installer interrupted after credentials resumes without rotating password or losing data',async()=>{
 let interrupted=false;await assert.rejects(()=>installSource(source,{fixture:true,database:async()=>{},start:async()=>{},health:async()=>({fixture:true}),checkpoint:stage=>{if(stage==='admin'&&!interrupted){interrupted=true;throw Error('MHS_SIMULATED_RESTART');}}}),/SIMULATED/);
 const admin=fs.readFileSync(path.join(config.DATA,'admin.json'));
 const result=await installSource(source,{fixture:true,database:async()=>{},start:async()=>{},health:async()=>({fixture:true})});assert.equal(result.phase,'INSTALLED');assert.deepEqual(fs.readFileSync(path.join(config.DATA,'admin.json')),admin);
 assert.equal(verifyRelease(fs.realpathSync(path.join(BASE,'current'))).version,'2.0.0-rc.1');assert.match(fs.readFileSync(path.join(config.SERVICE_DIR,'mhs-db/run'),'utf8'),/--skip-networking/);assert.ok(fs.existsSync(path.join(config.HOME,'.termux/boot/20-mhs-start')));
});
test('source upgrade health failure automatically rolls back, then retry/manual rollback preserve data',async()=>{
 const {upgrade,rollback}=await import('../tools/upgrade.mjs');const next=fixtureSource('2.0.0-rc.2','b'.repeat(40)),manifest=verifyRelease(next),names=[...manifest.files.map(f=>f.path),'release.json'];
 const bundle=path.join(temp,'next.mhs.gz');await writeArchive(bundle,{format:'MHS_SOURCE_RELEASE',project:'MHS',version:manifest.version},names.map(p=>{const file=path.join(next,p),b=fs.readFileSync(file);return {file,path:'files/'+p,size:b.length,sha256:sha256(b)};}));const sum=sha256(fs.readFileSync(bundle));
 const protectedFile=path.join(config.DATA,'sentinel.json');config.atomicJson(protectedFile,{private:'synthetic unchanged'});const before=fs.readFileSync(protectedFile),admin=fs.readFileSync(config.ADMIN);let first=true;
 await assert.rejects(()=>upgrade(bundle,sum,{restart:async()=>{},health:async()=>{if(first){first=false;throw Error('MHS_FIXTURE_HEALTH_FAILURE');}}}),/FIXTURE_HEALTH/);
 assert.equal(verifyRelease(fs.realpathSync(path.join(BASE,'current'))).commit,'a'.repeat(40));
 await upgrade(bundle,sum,{restart:async()=>{},health:async()=>{}});assert.equal(verifyRelease(fs.realpathSync(path.join(BASE,'current'))).commit,'b'.repeat(40));
 await rollback({restart:async()=>{},health:async()=>{}});assert.equal(verifyRelease(fs.realpathSync(path.join(BASE,'current'))).commit,'a'.repeat(40));assert.deepEqual(fs.readFileSync(protectedFile),before);assert.deepEqual(fs.readFileSync(config.ADMIN),admin);
 await assert.rejects(()=>upgrade(bundle,'0'.repeat(64)),/ARCHIVE_SHA/);
});
test('local operation lock rejects concurrent management/upgrade and safely releases after error',async()=>{
 const {withOperation}=await import('../panel/src/operation.mjs');let release;const blocker=withOperation(()=>new Promise(r=>release=r));
 await assert.rejects(()=>withOperation(async()=>{}),/OPERATION_BUSY/);release();await blocker;
 await assert.rejects(()=>withOperation(async()=>{throw Error('fixture');}),/fixture/);assert.ok(!fs.existsSync(path.join(config.DATA,'operation.lock')));
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
