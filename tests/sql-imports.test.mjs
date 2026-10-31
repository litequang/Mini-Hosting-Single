import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import {Readable} from 'node:stream';
import {once} from 'node:events';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-sql-imports-'));
process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const {setPassword}=await import('../panel/src/security.mjs');setPassword('synthetic-import-password-1234');
const {sqlImportOperations,SQL_LIMIT,SQL_CHUNK}=await import('../panel/src/sql-imports.mjs');
let sequence=0;
function fixture(){const base=path.join(temp,'jobs-'+(++sequence)),backups=path.join(temp,'backups-'+sequence);fs.mkdirSync(backups);let database='before',fail=false,failRecovery=false,backupFails=false,backupCount=0,restoreCount=0;
 const ops=sqlImportOperations({base,credentials:name=>{if(name!=='fixture_db')throw Error('NOT_FOUND');return {};},space:()=>{},backup:async()=>{backupCount++;if(backupFails)throw Error('BACKUP_FAILED');fs.writeFileSync(path.join(backups,'safety.sql'),database);return {file:'safety.sql'};},backupPath:name=>path.join(backups,name),restore:async(name,file)=>{restoreCount++;if(path.basename(file)==='upload.sql'){database='changed';if(fail)throw Error(typeof fail==='string'?fail:'INJECTED_IMPORT_FAILURE');}else{if(failRecovery)throw Error('RECOVERY_FAILED');database=fs.readFileSync(file,'utf8');}}});
 return {ops,base,get database(){return database;},get backupCount(){return backupCount;},get restoreCount(){return restoreCount;},set fail(v){fail=v;},set failRecovery(v){failRecovery=v;},set backupFails(v){backupFails=v;}};
}
function chunkBody(data,offset=0,sha=crypto.createHash('sha256').update(data).digest('hex')){const r=Readable.from([data]);r.headers={'x-upload-offset':String(offset),'content-length':String(data.length),'x-chunk-sha256':sha};return r;}
async function ready(f,text='CREATE TABLE fixture (id INT);'){const b=Buffer.from(text),r=f.ops.create('fixture_db',{confirm:'fixture_db',size:b.length},'owner');await f.ops.chunk('fixture_db',r.id,'owner',chunkBody(b));f.ops.prepare('fixture_db',r.id,'owner','fixture_db');return r;}
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('SQL upload bounds, owner/database binding, checksum, cancellation and incomplete upload refusal',async()=>{
 const f=fixture();assert.throws(()=>f.ops.create('fixture_db',{confirm:'wrong',size:1},'owner'),/Confirmation/);assert.throws(()=>f.ops.create('fixture_db',{confirm:'fixture_db',size:SQL_LIMIT+1},'owner'),/512MIB/);
 const job=f.ops.create('fixture_db',{confirm:'fixture_db',size:3},'owner');assert.throws(()=>f.ops.get('fixture_db',job.id,'other'),/NOT_FOUND/);assert.throws(()=>f.ops.prepare('fixture_db',job.id,'owner','fixture_db'),/INCOMPLETE/);
 await assert.rejects(()=>f.ops.chunk('fixture_db',job.id,'owner',chunkBody(Buffer.from('abc'),0,'0'.repeat(64))),/CHECKSUM_FAILED/);assert.equal(f.ops.get('fixture_db',job.id,'owner').offset,0);
 await f.ops.chunk('fixture_db',job.id,'owner',chunkBody(Buffer.from('abc')));await assert.rejects(()=>f.ops.chunk('fixture_db',job.id,'owner',chunkBody(Buffer.from('a'))),/OFFSET/);
 f.ops.cancel('fixture_db',job.id,'owner');assert.equal(f.backupCount,0);assert.ok(!fs.existsSync(path.join(f.base,job.id,'upload.sql')));
});
test('validation and backup precede writes; import failure rolls back and failed rollback blocks subsequent imports',async()=>{
 const invalid=fixture(),bad=await ready(invalid,'MHC_MANAGED_WORDPRESS_LAB');await invalid.ops.launch('fixture_db',bad.id,'owner',fn=>fn());assert.equal(invalid.backupCount,0);assert.equal(invalid.restoreCount,0);
 const backup=fixture();backup.backupFails=true;const b=await ready(backup);await backup.ops.launch('fixture_db',b.id,'owner',fn=>fn());assert.equal(backup.restoreCount,0);assert.equal(backup.database,'before');
 const rollback=fixture();rollback.fail='MARIADB_SQL_ERROR_2006_LINE_42';const r=await ready(rollback);await rollback.ops.launch('fixture_db',r.id,'owner',fn=>fn());assert.equal(rollback.database,'before');assert.equal(rollback.ops.get('fixture_db',r.id,'owner').phase,'ROLLED_BACK');assert.deepEqual(rollback.ops.get('fixture_db',r.id,'owner').diagnostic,{code:2006,line:42});
 const unsafe=fixture();unsafe.fail=true;unsafe.failRecovery=true;const u=await ready(unsafe);await unsafe.ops.launch('fixture_db',u.id,'owner',fn=>fn());assert.equal(unsafe.ops.get('fixture_db',u.id,'owner').phase,'RECOVERY_REQUIRED');assert.throws(()=>unsafe.ops.create('fixture_db',{confirm:'fixture_db',size:1},'owner'),/RECOVERY_REQUIRED/);
});
test('interrupted append is truncated to the committed offset; interrupted SQL mutation requires recovery',async()=>{
 const f=fixture(),job=f.ops.create('fixture_db',{confirm:'fixture_db',size:3},'owner'),file=path.join(f.base,job.id,'upload.sql');fs.appendFileSync(file,'partial append');
 await f.ops.chunk('fixture_db',job.id,'owner',chunkBody(Buffer.from('abc')));assert.equal(fs.readFileSync(file,'utf8'),'abc');
 const meta=path.join(f.base,job.id,'job.json'),r=JSON.parse(fs.readFileSync(meta));fs.writeFileSync(meta,JSON.stringify({...r,phase:'IMPORTING',backup:'safety.sql'}));
 assert.equal(f.ops.get('fixture_db',job.id,'owner').phase,'RECOVERY_REQUIRED');assert.equal(f.database,'before');
});
test('actual authenticated HTTP uploads 90 MiB in chunks and returns background job progress without buffering whole SQL',async t=>{
 const f=fixture(),{createPanelServer}=await import('../panel/src/server.mjs'),server=createPanelServer({sqlOps:f.ops});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 function request(route,{method='GET',data,headers={}}={}){return new Promise((resolve,reject)=>{const body=data??Buffer.alloc(0),q=http.request({host:'127.0.0.1',port:server.address().port,path:route,method,headers:{host:'127.0.0.1:9090',origin:'http://127.0.0.1:9090','content-length':body.length,...headers}},r=>{let text='';r.on('data',b=>text+=b);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,data:JSON.parse(text)}));});q.on('error',reject);void (async()=>{for(let offset=0;offset<body.length;offset+=65536)if(!q.write(body.subarray(offset,offset+65536)))await once(q,'drain');q.end();})().catch(reject);});}
 try{
  const login=await request('/api/login',{method:'POST',data:Buffer.from(JSON.stringify({username:'admin',password:'synthetic-import-password-1234'}))}),auth={cookie:login.headers['set-cookie'][0].split(';')[0],'x-csrf-token':login.data.csrf};
  const missing=await request('/api/databases/fixture_db/imports',{method:'POST',data:Buffer.from('{}')});assert.equal(missing.status,401);
  const csrf=await request('/api/databases/fixture_db/imports',{method:'POST',headers:{cookie:auth.cookie},data:Buffer.from('{}')});assert.equal(csrf.status,403);
  const size=90*1024*1024,start=await request('/api/databases/fixture_db/imports',{method:'POST',headers:auth,data:Buffer.from(JSON.stringify({size,confirm:'fixture_db'}))});assert.equal(start.status,201);const id=start.data.job.id;
  const block=Buffer.alloc(SQL_CHUNK,32);block.write('-- synthetic SQL padding\n');const rss=process.memoryUsage().rss;
  for(let offset=0;offset<size;){const part=block.subarray(0,Math.min(block.length,size-offset)),sha=crypto.createHash('sha256').update(part).digest('hex');const r=await request('/api/databases/fixture_db/imports/'+id,{method:'PATCH',headers:{...auth,'x-upload-offset':String(offset),'x-chunk-sha256':sha},data:part});assert.equal(r.status,200);offset=r.data.job.offset;}
  const started=await request('/api/databases/fixture_db/imports/'+id+'/start',{method:'POST',headers:auth,data:Buffer.from(JSON.stringify({confirm:'fixture_db'}))});assert.equal(started.status,202);
  let job;for(let i=0;i<200;i++){job=(await request('/api/databases/fixture_db/imports/'+id,{headers:auth})).data.job;if(['DONE','FAILED','RECOVERY_REQUIRED'].includes(job.phase))break;await new Promise(r=>setTimeout(r,25));}
  assert.equal(job.phase,'DONE');assert.equal(f.backupCount,1);assert.equal(f.database,'changed');assert.ok(!fs.existsSync(path.join(f.base,id,'upload.sql')));t.diagnostic('90 MiB HTTP upload completed; RSS delta MiB '+Math.round((process.memoryUsage().rss-rss)/1048576));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
