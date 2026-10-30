import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {databaseOK,HttpError} from './security.mjs';
import {BACKUPS,TERMUX,atomicJson,readJson,DATA,SOCKET} from './config.mjs';
const DBMETA=path.join(DATA,'databases.json');
const id=s=>{if(!databaseOK(s))throw new HttpError(400,'INVALID_DATABASE');return s;};
export function databaseCredentials(name){id(name);const meta=readJson(DBMETA,{});if(!meta[name])throw new HttpError(404,'MHS_DATABASE_NOT_FOUND');return meta[name];}
function clientFile(name){const c=databaseCredentials(name),file=path.join(DATA,'db-client-'+crypto.randomUUID()+'.cnf');fs.writeFileSync(file,`[client]\nuser=${c.user}\npassword=${c.password}\nsocket=${SOCKET.replaceAll('\\','/')}\nprotocol=socket\n`,{mode:0o600});return file;}
export async function sqlProcess({name=null,input='',dump=false,destination=null}){
 const file=name?clientFile(name):null;
 const args=[...(file?['--defaults-file='+file]:['--no-defaults','--protocol=socket','--socket='+SOCKET,'-u','root']),...(dump?['--single-transaction','--quick','--skip-comments','--',id(name)]:['--binary-mode=1','-N','-B',...(name?[id(name)]:[])])];
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(path.join(TERMUX,'bin',dump?'mariadb-dump':'mariadb'),args,{stdio:['pipe','pipe','pipe']});let out='',size=0,settled=false;
  const stream=destination?fs.createWriteStream(destination,{mode:0o600,flags:'wx'}):null;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(Error(error)):resolve(out.trim());};
  const timer=setTimeout(()=>{child.kill();finish('MARIADB_TIMEOUT');},120000);
  child.on('error',()=>finish('MARIADB_UNAVAILABLE'));child.stderr.resume();
  child.stdout.on('data',d=>{size+=d.length;if(size>256*1024*1024){child.kill();finish('MARIADB_OUTPUT_LIMIT');}if(!stream){out+=d;if(out.length>1024*1024){child.kill();finish('MARIADB_RESULT_LIMIT');}}});
  if(stream){stream.on('error',()=>{child.kill();finish('BACKUP_WRITE_FAILED');});child.stdout.pipe(stream);}
  child.stdin.on('error',()=>{});child.stdin.end(input);
  child.on('close',code=>{if(code!==0){stream?.destroy();finish('MARIADB_OPERATION_FAILED');}else if(stream){if(stream.writableFinished)finish();else stream.once('finish',()=>finish());}else finish();});
 });}finally{if(file)fs.rmSync(file,{force:true});}
}
export async function listDatabases(){return Object.keys(readJson(DBMETA,{}));}
export async function createDatabase(name){
 id(name);if(['mysql','sys','test'].includes(name))throw new HttpError(400,'RESERVED_DATABASE');
 const meta=readJson(DBMETA,{});if(meta[name])throw new HttpError(409,'DATABASE_EXISTS');
 const c={user:'mhs_'+crypto.randomBytes(6).toString('hex'),password:crypto.randomBytes(24).toString('hex'),createdAt:new Date().toISOString()};
 // No IF NOT EXISTS: never adopt or overwrite a pre-existing schema/user.
 await sqlProcess({input:`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nCREATE USER '${c.user}'@'localhost' IDENTIFIED BY '${c.password}';\nGRANT ALL PRIVILEGES ON \`${name}\`.* TO '${c.user}'@'localhost';\n`});
 meta[name]=c;atomicJson(DBMETA,meta);return {database:name,user:c.user,password:c.password,socket:SOCKET,warning:'Save now; not returned by database list.'};
}
export async function listTables(name){databaseCredentials(name);const out=await sqlProcess({name,input:'SHOW TABLES;'});return out?out.split('\n'):[];}
export async function backupDatabase(name){databaseCredentials(name);const file=`db-${name}-${new Date().toISOString().replace(/[:.]/g,'-')}.sql`,dest=path.join(BACKUPS,file);try{await sqlProcess({name,dump:true,destination:dest});}catch(e){fs.rmSync(dest,{force:true});throw e;}return {file,bytes:fs.statSync(dest).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')};}
export function assertIndependentSql(text){if(/MHC_MANAGED_WORDPRESS_LAB|MHC_P4_LEASE_REQUIRED|mhc_p33_lab|mhc_p4_/i.test(text))throw new HttpError(400,'MHS_CLUSTER_SQL_REFUSED');}
export async function restoreDatabase(name,file){databaseCredentials(name);const stat=fs.statSync(file);if(stat.size>64*1024*1024)throw new HttpError(413,'SQL_LIMIT_64MIB');const text=fs.readFileSync(file,'utf8');assertIndependentSql(text);await sqlProcess({name,input:text});return {restored:name};}
