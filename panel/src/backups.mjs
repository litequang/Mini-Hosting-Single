import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {BACKUPS,DATA,atomicJson,readJson,registry} from './config.mjs';
import {HttpError} from './security.mjs';
import {requireSite,siteRoot} from './sites.mjs';
import {treeFiles,writeArchive,readArchive,digest} from './archive.mjs';
import {backupDatabase,restoreDatabase,assertIndependentSql} from './databases.mjs';
import {assertIndependentTree,siteHealth} from './hosting.mjs';
import {serviceAction} from './system.mjs';
const validFile=n=>/^(?:site-[a-z][a-z0-9-]{1,30}-[a-f0-9-]{36}\.mhs\.gz|db-[a-z][a-z0-9_]{2,29}-\d{4}-\d{2}-\d{2}T[\d-]+Z\.sql)$/.test(n);
export function backupFile(name){if(!validFile(name))throw new HttpError(400,'INVALID_BACKUP_NAME');const f=path.join(BACKUPS,name);if(!fs.existsSync(f)||fs.lstatSync(f).isSymbolicLink()||!fs.statSync(f).isFile())throw new HttpError(404,'BACKUP_NOT_FOUND');return f;}
export function listBackups(){return fs.readdirSync(BACKUPS).filter(validFile).map(name=>{const m=readJson(path.join(BACKUPS,name+'.json'),{});return {name,size:fs.statSync(path.join(BACKUPS,name)).size,createdAt:fs.statSync(path.join(BACKUPS,name)).mtime.toISOString(),verified:m.verified===true,sha256:m.sha256||null,slug:m.slug||null};}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function importBackup(file,sha256){const id=crypto.randomUUID(),stage=path.join(DATA,'import-verify-'+id);if(!sha256||digest(fs.readFileSync(file))!==sha256)throw Error('BACKUP_UPLOAD_SHA_MISMATCH');try{const h=await readArchive(file,stage);if(h.project!=='MHS'||!/^([a-z][a-z0-9-]{1,30})$/.test(h.site?.slug||''))throw Error('BACKUP_PROJECT_REFUSED');assertIndependentTree(path.join(stage,'files'));if(fs.existsSync(path.join(stage,'database.sql')))assertIndependentSql(fs.readFileSync(path.join(stage,'database.sql'),'utf8'));const name=`site-${h.site.slug}-${id}.mhs.gz`;fs.renameSync(file,path.join(BACKUPS,name));atomicJson(path.join(BACKUPS,name+'.json'),{verified:true,slug:h.site.slug,sha256,importedAt:new Date().toISOString()});return {file:name,sha256,verified:true};}finally{fs.rmSync(stage,{recursive:true,force:true});}}
export function backupOperations({dump=backupDatabase,restore=restoreDatabase,service=serviceAction,health=siteHealth}={}){
 async function backupSiteArchive(slug){
  const site=requireSite(slug),id=crypto.randomUUID(),file=`site-${slug}-${id}.mhs.gz`,target=path.join(BACKUPS,file),verify=path.join(DATA,'backup-verify-'+id);
  try{const entries=treeFiles(siteRoot(site));if(site.database){const sql=await dump(site.database),source=backupFile(sql.file);entries.push({path:'database.sql',file:source,size:fs.statSync(source).size,sha256:digest(fs.readFileSync(source))});}
   const meta={project:'MHS',site:{slug:site.slug,hostname:site.hostname,type:site.type,database:!!site.database},createdAt:new Date().toISOString(),consistency:'ONLINE_SQL_TRANSACTION_FILES_SEPARATE',privateConfigExcluded:true};
   const result=await writeArchive(target,meta,entries);await readArchive(target,verify);atomicJson(target+'.json',{...result,verified:true,slug,createdAt:meta.createdAt});return {file,...result,verified:true,consistency:meta.consistency};
  }catch(e){fs.rmSync(target,{force:true});throw e;}finally{fs.rmSync(verify,{recursive:true,force:true});}
 }
 async function restoreSiteArchive(slug,name,{confirm,sha256,resume=false}={}){
  if(confirm!==slug)throw new HttpError(400,'RESTORE_CONFIRM_REQUIRED');const site=requireSite(slug),file=backupFile(name);if(!sha256||digest(fs.readFileSync(file))!==sha256)throw new HttpError(400,'RESTORE_SHA256_REQUIRED_OR_MISMATCH');
  const id=crypto.randomUUID(),stage=path.join(DATA,'restore-'+id),target=siteRoot(site),previous=target+'-restore-'+id,journal=path.join(DATA,'restore-'+slug+'.json'),maintenance=path.join(DATA,'maintenance-'+slug);
  const active=readJson(journal,null);if(active&&!['DONE','ROLLED_BACK'].includes(active.phase)&&!resume)throw Error('RESTORE_RECOVERY_REQUIRED');
  if(resume&&(!active||['DONE','ROLLED_BACK'].includes(active.phase)||name!==active.safety||!/^[-a-z0-9.]+$/.test(active.recoveryPrevious||active.previous||'')))throw Error('RESTORE_RESUME_SAFETY_BACKUP_REQUIRED');
  const originalPrevious=resume?path.join(path.dirname(target),active.recoveryPrevious||active.previous):null;
  let oldMoved=false,installed=false,paused=false,sqlBackup=null,sqlAttempted=false;
  try{
   const header=await readArchive(file,stage);if(header.project!=='MHS'||header.site?.type!==site.type||header.site?.slug!==slug)throw Error('BACKUP_SITE_MISMATCH');
   const files=path.join(stage,'files');assertIndependentTree(files);const sql=path.join(stage,'database.sql');if(header.site.database!==!!site.database||fs.existsSync(sql)!==!!site.database)throw Error('BACKUP_DATABASE_MISMATCH');if(fs.existsSync(sql))assertIndependentSql(fs.readFileSync(sql,'utf8'));
   const configSource=fs.existsSync(target)?target:originalPrevious;
   if(!configSource||!fs.existsSync(configSource))throw Error('RESTORE_ORIGINAL_FILES_REQUIRED');
   if(site.type==='wordpress')fs.copyFileSync(path.join(configSource,'wp-config.php'),path.join(files,'wp-config.php'));
   // Full safety backup before any database/files mutation. Config/env stay local.
   const safety=resume?{file:active.safety}:await backupSiteArchive(slug);if(site.database)sqlBackup=resume?{file:active.sqlBackup}:await dump(site.database);
   atomicJson(journal,{id,slug,name,phase:'PREPARED',safety:safety.file,previous:path.basename(previous),recoveryPrevious:originalPrevious?path.basename(originalPrevious):null,sqlBackup:sqlBackup?.file||null});
   fs.writeFileSync(maintenance,'MHS restore maintenance\n',{mode:0o600});
   if(site.type==='node'){await service('mhs-site-'+slug,'down');paused=true;}
   else if(['php','wordpress'].includes(site.type)){await service('mhs-php','down');paused=true;}
   atomicJson(journal,{...readJson(journal),phase:'APPLYING'});
   if(site.database){sqlAttempted=true;await restore(site.database,sql);}
   if(fs.existsSync(target)){fs.renameSync(target,previous);oldMoved=true;}fs.renameSync(files,target);installed=true;
   if(paused)await service(site.type==='node'?'mhs-site-'+slug:'mhs-php','up');
   fs.rmSync(maintenance,{force:true});const result=registry().nginxIntegrated?await health(site):{ok:false,notRun:true};
   if(registry().nginxIntegrated&&!result.ok)throw Error('RESTORE_HTTP_FAILED');
   atomicJson(journal,{...readJson(journal),phase:'DONE',health:result});return {restored:slug,safety:safety.file,httpVerified:result.ok};
  }catch(e){
   if(oldMoved||sqlAttempted||installed){
    fs.writeFileSync(maintenance,'MHS restore rollback\n',{mode:0o600});
    try{if(paused)await service(site.type==='node'?'mhs-site-'+slug:'mhs-php','down');if(sqlAttempted)await restore(site.database,backupFile(sqlBackup.file));if(installed)fs.renameSync(target,target+'-failed-'+id);if(oldMoved)fs.renameSync(previous,target);else if(resume&&fs.existsSync(originalPrevious))fs.renameSync(originalPrevious,target);if(paused)await service(site.type==='node'?'mhs-site-'+slug:'mhs-php','up');atomicJson(journal,{...readJson(journal),phase:'ROLLED_BACK'});fs.rmSync(maintenance,{force:true});}
    catch{atomicJson(journal,{...readJson(journal),phase:'RECOVERY_REQUIRED'});throw Error('RESTORE_ROLLBACK_FAILED_SITE_IN_MAINTENANCE');}
   }else{if(paused)await service(site.type==='node'?'mhs-site-'+slug:'mhs-php','up');if(!resume)fs.rmSync(maintenance,{force:true});}
   throw e;
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
 }
 return {backupSiteArchive,restoreSiteArchive};
}
export const {backupSiteArchive,restoreSiteArchive}=backupOperations();
export async function recoverSiteRestore(slug,confirm){requireSite(slug);const j=readJson(path.join(DATA,'restore-'+slug+'.json'),null);if(!j?.safety)throw Error('RESTORE_NO_SAFETY_JOURNAL');backupFile(j.safety);const m=readJson(path.join(BACKUPS,j.safety+'.json'),null);if(!m?.verified||!m.sha256)throw Error('RESTORE_SAFETY_NOT_VERIFIED');return restoreSiteArchive(slug,j.safety,{confirm,sha256:m.sha256,resume:true});}
