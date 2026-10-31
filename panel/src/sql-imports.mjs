// Private, bounded SQL uploads and durable backup/import/rollback jobs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {DATA,atomicJson,readJson} from './config.mjs';
import {HttpError} from './security.mjs';
import {databaseCredentials,validateSqlFile,backupDatabase,restoreDatabase} from './databases.mjs';
import {backupFile} from './backups.mjs';
import {requireSpace} from './file-policy.mjs';
export const SQL_LIMIT=512*1024*1024,SQL_CHUNK=8*1024*1024;
const running=new Set(['QUEUED','VALIDATING','BACKING_UP','IMPORTING','ROLLING_BACK']);
const terminal=new Set(['DONE','FAILED','ROLLED_BACK','CANCELLED']);
export function sqlImportOperations({base=path.join(DATA,'sql-imports'),credentials=databaseCredentials,validate=validateSqlFile,backup=backupDatabase,restore=restoreDatabase,backupPath=backupFile,space=requireSpace}={}){
 const live=new Set();
 function folder(id){if(!/^[a-f0-9]{32}$/.test(id||''))throw new HttpError(404,'SQL_IMPORT_NOT_FOUND');return path.join(base,id);}
 const manifest=id=>path.join(folder(id),'job.json'),upload=id=>path.join(folder(id),'upload.sql');
 function safeDir(dir){const st=fs.lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink())throw new HttpError(409,'SQL_IMPORT_PATH_REVIEW_REQUIRED');}
 function regular(file){const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)throw new HttpError(409,'SQL_IMPORT_PATH_REVIEW_REQUIRED');return st;}
 function save(r){r.updatedAt=Date.now();atomicJson(manifest(r.id),r);return r;}
 function read(id){try{safeDir(base);safeDir(folder(id));regular(manifest(id));}catch(e){if(e.code==='ENOENT')throw new HttpError(404,'SQL_IMPORT_NOT_FOUND');throw e;}const r=readJson(manifest(id));if(!r||r.id!==id)throw new HttpError(404,'SQL_IMPORT_NOT_FOUND');
  if(running.has(r.phase)&&!live.has(id))save({...r,phase:['IMPORTING','ROLLING_BACK'].includes(r.phase)?'RECOVERY_REQUIRED':'FAILED',error:'SQL_IMPORT_PROCESS_INTERRUPTED'});
  return readJson(manifest(id));
 }
 function all(){if(!fs.existsSync(base))return [];safeDir(base);return fs.readdirSync(base).filter(n=>/^[a-f0-9]{32}$/.test(n)).map(read);}
 function owned(name,id,owner){credentials(name);const r=read(id);if(r.database!==name||r.owner!==owner)throw new HttpError(404,'SQL_IMPORT_NOT_FOUND');return r;}
 function view(r){return {id:r.id,database:r.database,size:r.size,offset:r.offset,phase:r.phase,updatedAt:r.updatedAt,error:r.error||null,diagnostic:r.diagnostic||null,backup:r.backup||null,chunkSize:SQL_CHUNK,maxSize:SQL_LIMIT};}
 function cleanFiles(r){for(const n of fs.readdirSync(folder(r.id)))if(n==='upload.sql'||/^chunk-[a-f0-9]{32}$/.test(n)){const f=path.join(folder(r.id),n);regular(f);fs.unlinkSync(f);}}
 function prune(){const now=Date.now();for(const r of all()){
  if(r.phase==='UPLOADING'&&r.updatedAt<now-86400000){cleanFiles(r);save({...r,phase:'CANCELLED'});}
  if(terminal.has(r.phase)&&r.updatedAt<now-7*86400000){cleanFiles(r);fs.unlinkSync(manifest(r.id));fs.rmdirSync(folder(r.id));}
 }}
 function assertReady(name){if(all().some(r=>r.database===name&&r.phase==='RECOVERY_REQUIRED'))throw new HttpError(409,'DATABASE_RECOVERY_REQUIRED');}
 function create(name,{confirm,size},owner){
  credentials(name);if(confirm!==name)throw new HttpError(400,'Confirmation mismatch');
  if(!Number.isSafeInteger(size)||size<1||size>SQL_LIMIT)throw new HttpError(413,'SQL_FILE_LIMIT_512MIB');
  fs.mkdirSync(base,{recursive:true,mode:0o700});safeDir(base);prune();assertReady(name);
  const pending=all().filter(r=>r.phase==='UPLOADING'||running.has(r.phase));
  if(pending.some(r=>r.database===name))throw new HttpError(409,'SQL_IMPORT_ALREADY_PENDING');
  if(pending.length>=2)throw new HttpError(429,'SQL_IMPORT_UPLOAD_CAPACITY');
  space(DATA,pending.reduce((n,r)=>n+r.size,0)+size*2+SQL_CHUNK);
  const id=crypto.randomBytes(16).toString('hex');fs.mkdirSync(folder(id),{mode:0o700});fs.writeFileSync(upload(id),'',{mode:0o600,flag:'wx'});
  return view(save({id,database:name,owner,size,offset:0,phase:'UPLOADING',createdAt:Date.now()}));
 }
 async function receive(req,file,max,expected=null){let bytes=0;const hash=crypto.createHash('sha256');
  await pipeline(req,new Transform({transform(part,_,cb){bytes+=part.length;if(bytes>max)return cb(new HttpError(413,'SQL_UPLOAD_CHUNK_LIMIT'));hash.update(part);cb(null,part);}}),fs.createWriteStream(file,{flags:'wx',mode:0o600}));
  if(expected!==null&&bytes!==expected)throw new HttpError(400,'SQL_UPLOAD_LENGTH_MISMATCH');return {bytes,sha256:hash.digest('hex')};
 }
 async function chunk(name,id,owner,req){
  const r=owned(name,id,owner);if(r.phase!=='UPLOADING')throw new HttpError(409,'SQL_IMPORT_NOT_UPLOADING');
  const offset=Number(req.headers['x-upload-offset']),length=Number(req.headers['content-length']),sha=req.headers['x-chunk-sha256'];
  if(!Number.isSafeInteger(offset)||offset!==r.offset||!Number.isSafeInteger(length)||length<1||length>SQL_CHUNK||offset+length>r.size||!/^[a-f0-9]{64}$/.test(sha||''))throw new HttpError(409,'SQL_UPLOAD_OFFSET_LENGTH_OR_CHECKSUM');
  space(DATA,SQL_CHUNK);const file=upload(id),stat=regular(file);
  if(stat.size<r.offset)throw new HttpError(409,'SQL_UPLOAD_FILE_TRUNCATED');if(stat.size>r.offset)fs.truncateSync(file,r.offset);
  const staged=path.join(folder(id),'chunk-'+crypto.randomBytes(16).toString('hex'));
  try{const result=await receive(req,staged,SQL_CHUNK,length);if(result.sha256!==sha)throw new HttpError(400,'SQL_UPLOAD_CHECKSUM_FAILED');
   await pipeline(fs.createReadStream(staged),fs.createWriteStream(file,{flags:'r+',start:offset}));
   return view(save({...r,offset:offset+length}));
  }catch(e){fs.truncateSync(file,offset);throw e;}finally{fs.rmSync(staged,{force:true});}
 }
 async function raw(name,owner,req,confirm){
  const job=create(name,{confirm,size:Number(req.headers['content-length'])},owner);
  const staged=path.join(folder(job.id),'chunk-'+crypto.randomBytes(16).toString('hex'));
  try{const result=await receive(req,staged,SQL_LIMIT,job.size);fs.renameSync(staged,upload(job.id));return view(save({...owned(name,job.id,owner),offset:result.bytes}));}
  catch(e){cleanFiles(owned(name,job.id,owner));save({...owned(name,job.id,owner),phase:'CANCELLED'});throw e;}
 }
 function prepare(name,id,owner,confirm){
  if(confirm!==name)throw new HttpError(400,'Confirmation mismatch');assertReady(name);const r=owned(name,id,owner);
  if(r.phase!=='UPLOADING'||r.offset!==r.size||regular(upload(id)).size!==r.size)throw new HttpError(409,'SQL_UPLOAD_INCOMPLETE');
  live.add(id);return view(save({...r,phase:'QUEUED'}));
 }
 async function run(name,id,owner){
  let r=owned(name,id,owner),changed=false;
  try{
   r=save({...r,phase:'VALIDATING'});await validate(upload(id),SQL_LIMIT);space(DATA,0);
   r=save({...r,phase:'BACKING_UP'});const safety=await backup(name);
   r=save({...r,backup:safety.file,phase:'IMPORTING'});changed=true;await restore(name,upload(id));
   r=save({...r,phase:'DONE'});
  }catch(e){
   const m=String(e.message).match(/^MARIADB_SQL_ERROR_(\d{1,5})(?:_LINE_(\d{1,10}))?$/);if(m)r=save({...r,diagnostic:{code:+m[1],line:m[2]?+m[2]:null}});
   if(changed){r=save({...r,phase:'ROLLING_BACK'});try{await restore(name,backupPath(r.backup));r=save({...r,phase:'ROLLED_BACK',error:'SQL_IMPORT_FAILED_ROLLED_BACK'});}catch{r=save({...r,phase:'RECOVERY_REQUIRED',error:'DATABASE_RECOVERY_REQUIRED'});}}
   else r=save({...r,phase:'FAILED',error:'SQL_VALIDATION_OR_BACKUP_FAILED_NO_DATABASE_WRITE'});
  }finally{if(terminal.has(r.phase))cleanFiles(r);}
 }
 function launch(name,id,owner,exclusive){
  // The route calls this after releasing its short prepare/upload operation lock.
  return exclusive(()=>run(name,id,owner)).catch(()=>{const r=owned(name,id,owner);if(terminal.has(r.phase))return;
   const unsafe=['IMPORTING','ROLLING_BACK','RECOVERY_REQUIRED'].includes(r.phase);save({...r,phase:unsafe?'RECOVERY_REQUIRED':'FAILED',error:unsafe?'DATABASE_RECOVERY_REQUIRED':'SQL_IMPORT_OPERATION_BUSY_NO_DATABASE_WRITE'});if(!unsafe)cleanFiles(r);
  }).finally(()=>live.delete(id));
 }
 function get(name,id,owner){return view(owned(name,id,owner));}
 function list(name,owner){credentials(name);return all().filter(r=>r.database===name&&r.owner===owner).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,20).map(view);}
 function cancel(name,id,owner){const r=owned(name,id,owner);if(r.phase!=='UPLOADING')throw new HttpError(409,'SQL_IMPORT_CANNOT_CANCEL_AFTER_START');cleanFiles(r);return view(save({...r,phase:'CANCELLED'}));}
 return {create,chunk,raw,prepare,launch,get,list,cancel,assertReady};
}
export const sqlImports=sqlImportOperations();
