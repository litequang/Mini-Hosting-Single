import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DATA,atomicJson,readJson} from './config.mjs';
import {requireSite} from './sites.mjs';
import {withOperation} from './operation.mjs';
import {restic} from './restic.mjs';
import {cron} from '../vendor/cron.mjs';
import {HttpError} from './security.mjs';
const schedulesFile=path.join(DATA,'schedules.json'),jobsFile=path.join(DATA,'backup-jobs.json');
const kinds=['init','backup','verify','restore','recover','retention','prune'];
export const schedules=()=>readJson(schedulesFile,[]);
export const backupJobs=()=>readJson(jobsFile,[]).slice(-50).reverse();
export function saveSchedule({slug,expression='0 3 * * *',timezone='Asia/Ho_Chi_Minh',enabled=false,catchUp='skip',intervalMinutes=null,confirm}){
 requireSite(slug);if(confirm!==slug||typeof enabled!=='boolean'||!['skip','once'].includes(catchUp))throw new HttpError(400,'SCHEDULE_CONFIRM_REQUIRED');
 if(intervalMinutes!==null&&(!Number.isInteger(intervalMinutes)||intervalMinutes<5||intervalMinutes>10080))throw new HttpError(400,'SCHEDULE_INTERVAL_5_TO_10080');
 if(!cron.validate(expression)||expression.trim().split(/\s+/).length!==5)throw new HttpError(400,'SCHEDULE_CRON_INVALID');try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{throw new HttpError(400,'SCHEDULE_TIMEZONE_INVALID');}
 const old=schedules(),prior=old.find(s=>s.slug===slug),record={...prior,id:prior?.id||crypto.randomUUID(),slug,expression,timezone,enabled,catchUp,intervalMinutes,updatedAt:new Date().toISOString(),createdAt:prior?.createdAt||new Date().toISOString()};atomicJson(schedulesFile,[...old.filter(s=>s.slug!==slug),record]);return record;
}
export function enqueueBackupJob({kind,slug=null,snapshot=null,confirm}){
 if(!kinds.includes(kind)||kind==='init'&&confirm!=='MHS INIT NEW REPOSITORY'||kind!=='init'&&confirm!==slug)throw new HttpError(400,'BACKUP_JOB_CONFIRM_REQUIRED');if(kind!=='init')requireSite(slug);if(['verify','restore'].includes(kind)&&!/^[a-f0-9]{64}$/.test(snapshot||''))throw new HttpError(400,'BACKUP_SNAPSHOT_ID_REQUIRED');
 const jobs=readJson(jobsFile,[]);if(jobs.some(j=>j.phase==='QUEUED'||j.phase==='RUNNING'||j.phase==='INTERRUPTED'))throw new HttpError(409,'BACKUP_JOB_PENDING');const job={id:crypto.randomUUID(),kind,slug,snapshot,phase:'QUEUED',createdAt:new Date().toISOString()};atomicJson(jobsFile,[...jobs.slice(-49),job]);return job;
}
export function retryBackupJob(id,confirm){const jobs=readJson(jobsFile,[]),old=jobs.find(j=>j.id===id);if(!old||!['FAILED','INTERRUPTED'].includes(old.phase)||confirm!==(old.slug||'MHS INIT NEW REPOSITORY'))throw new HttpError(409,'BACKUP_RETRY_CONFIRM_REQUIRED');if(old.phase==='INTERRUPTED'&&old.pid){try{process.kill(old.pid,0);throw new HttpError(409,'BACKUP_OLD_PROCESS_MAY_BE_ALIVE');}catch(e){if(e.code!=='ESRCH')throw e;}}old.phase='ACKNOWLEDGED';atomicJson(jobsFile,jobs);return enqueueBackupJob({kind:old.kind==='restore'?'recover':old.kind,slug:old.slug,snapshot:old.snapshot,confirm});}
export async function runNextJob({operations=restic,lock=withOperation}={}){
 const jobs=readJson(jobsFile,[]),job=jobs.find(j=>j.phase==='QUEUED');if(!job)return null;
 const save=()=>atomicJson(jobsFile,jobs);job.phase='RUNNING';job.startedAt=new Date().toISOString();job.pid=process.pid;save();
 try{job.result=await lock(async()=>{switch(job.kind){case'init':return operations.init('MHS INIT NEW REPOSITORY');case'backup':return operations.backup(job.slug);case'verify':return operations.verify(job.slug,job.snapshot);case'restore':return operations.restoreSnapshot(job.slug,job.snapshot,job.slug);case'recover':return operations.recoverRestore(job.slug,job.slug);case'retention':return operations.retention(job.slug);case'prune':return operations.prune(job.slug);default:throw Error('BACKUP_JOB_KIND_REFUSED');}});job.phase='DONE';}
 catch(e){job.phase=e.message==='MHS_OPERATION_BUSY'?'QUEUED':'FAILED';job.errorCode=/^[A-Z_]+$/.test(e.message)?e.message:'BACKUP_JOB_FAILED';}
 job.finishedAt=new Date().toISOString();save();return job;
}
export function startScheduler({operations=restic}={}){
 let active=false,signature='',tasks=[];const startup=Date.now();
 const old=readJson(jobsFile,[]);for(const job of old)if(job.phase==='RUNNING'){job.phase='INTERRUPTED';job.errorCode='BACKUP_INSPECT_BEFORE_RETRY';}atomicJson(jobsFile,old);
 function scheduleBackup(record,slot){try{const all=schedules(),current=all.find(s=>s.id===record.id);if(!current?.enabled||current.lastSlot===slot)return;enqueueBackupJob({kind:'backup',slug:record.slug,confirm:record.slug});current.lastSlot=slot;current.lastEnqueuedAt=new Date().toISOString();atomicJson(schedulesFile,all);}catch{}}
 async function poll(){if(active)return;active=true;try{
  const records=schedules(),next=JSON.stringify(records.map(({lastSlot,lastEnqueuedAt,...s})=>s));if(next!==signature){tasks.forEach(t=>t.destroy());tasks=[];signature=next;for(const record of records.filter(s=>s.enabled)){if(record.intervalMinutes===null)tasks.push(cron.schedule(record.expression,()=>scheduleBackup(record,new Date().toISOString().slice(0,16)),{timezone:record.timezone,noOverlap:true}));if(record.catchUp==='once'&&new Date(record.updatedAt).getTime()<startup&&(!record.lastEnqueuedAt||startup-new Date(record.lastEnqueuedAt).getTime()>3600000))scheduleBackup(record,'boot:'+Math.floor(startup/3600000));}}
  for(const record of records.filter(s=>s.enabled&&s.intervalMinutes!==null)){const last=new Date(record.lastEnqueuedAt||record.createdAt).getTime();if(Date.now()-last>=record.intervalMinutes*60000)scheduleBackup(record,'interval:'+Math.floor(Date.now()/(record.intervalMinutes*60000)));}
  await runNextJob({operations});
 }finally{active=false;}}
  const timer=setInterval(()=>poll().catch(()=>{}),5000);poll().catch(()=>{});return ()=>{clearInterval(timer);tasks.forEach(t=>t.destroy());};
}
