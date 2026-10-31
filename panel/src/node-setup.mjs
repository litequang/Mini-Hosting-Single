// First-use dependency preparation. No application scripts, builds or SQL migrations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {DATA,TERMUX,SOCKET,REGISTRY,registry,atomicJson,readJson} from './config.mjs';
import {requireSite,siteRoot} from './sites.mjs';
import {HttpError} from './security.mjs';
import {requireSpace} from './file-policy.mjs';
import {databaseCredentials,listDatabases} from './databases.mjs';
import {serviceAction,siteHttpHealth} from './system.mjs';
import {hasNodeEnv,saveNodeEnv} from './node-env.mjs';
export async function installLockedDependencies(stage){
 const cache=path.join(DATA,'npm-cache');fs.mkdirSync(cache,{recursive:true,mode:0o700});
 await new Promise((resolve,reject)=>{
  const child=spawn(path.join(TERMUX,'bin/npm'),['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund','--cache',cache],{cwd:stage,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=384'},stdio:['ignore','ignore','pipe']});
  // npm output can contain private registry URLs: consume it without API/log echo.
  child.stderr.resume();let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),3000).unref();},15*60000);
  child.once('error',()=>{clearTimeout(timer);reject(Error('NODE_NPM_UNAVAILABLE'));});
  child.once('close',code=>{clearTimeout(timer);code===0&&!timedOut?resolve():reject(Error(timedOut?'NODE_DEPENDENCIES_TIMEOUT':'NODE_DEPENDENCIES_INSTALL_FAILED'));});
 });
}
export function nodeSetupOperations({install=installLockedDependencies,space=requireSpace,restart=serviceAction,probe=siteHttpHealth}={}){
 const live=new Set(),file=slug=>path.join(DATA,'node-setup-'+slug+'.json');
 function stagePath(record){if(!/^[a-f0-9]{32}$/.test(record?.id||''))throw Error('NODE_SETUP_STAGE_INVALID');const expected=path.join(DATA,'node-setup',record.id);if(record.stage!==expected)throw Error('NODE_SETUP_STAGE_INVALID');const st=fs.lstatSync(expected);if(st.isSymbolicLink()||!st.isDirectory())throw Error('NODE_SETUP_STAGE_INVALID');return expected;}
 function site(slug){const s=requireSite(slug);if(s.type!=='node')throw new HttpError(400,'NODE_SITE_REQUIRED');return s;}
 function checked(root,name){const f=path.join(root,name),st=fs.lstatSync(f,{throwIfNoEntry:false});if(!st||!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>2*1024*1024)throw new HttpError(400,'NODE_PACKAGE_AND_LOCK_REQUIRED');return fs.readFileSync(f);}
 function fingerprint(root){return crypto.createHash('sha256').update(checked(root,'package.json')).update(checked(root,'package-lock.json')).digest('hex');}
 function status(slug){const s=site(slug),root=siteRoot(s);let pkg=null;try{pkg=JSON.parse(checked(root,'package.json'));}catch{}
  const names=Object.keys(pkg?.dependencies||{}).filter(n=>/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i.test(n)&&!n.includes('..'));
  const missing=names.filter(n=>!fs.existsSync(path.join(root,'node_modules',n,'package.json')));
  let job=readJson(file(slug),null);if(job&&['QUEUED','INSTALLING','APPLYING'].includes(job.phase)&&!live.has(slug)){job={...job,phase:job.phase==='APPLYING'?'RECOVERY_REQUIRED':'FAILED',error:'NODE_SETUP_PROCESS_INTERRUPTED'};atomicJson(file(slug),job);}
  return {slug,hostname:s.hostname,url:'https://'+s.hostname,database:s.database||null,envFile:hasNodeEnv(slug),entry:s.entry,entryExists:fs.existsSync(path.join(root,s.entry)),package:!!pkg,lock:fs.existsSync(path.join(root,'package-lock.json')),dependencies:names.length,missingDependencies:missing,job:job?{id:job.id,phase:job.phase,error:job.error||null}:null};
 }
 function prepare(slug,confirm){if(confirm!==slug)throw new HttpError(400,'NODE_SETUP_CONFIRM_REQUIRED');const s=site(slug),old=status(slug);
  if(old.job&&['QUEUED','INSTALLING','APPLYING','RECOVERY_REQUIRED'].includes(old.job.phase))throw new HttpError(409,'NODE_SETUP_PENDING_OR_RECOVERY_REQUIRED');
  const root=siteRoot(s);if(!old.entryExists)throw new HttpError(400,'NODE_ENTRY_NOT_FOUND');const hash=fingerprint(root);space(DATA,256*1024*1024);
  const previous=readJson(file(slug),null);if(previous&&['READY','FAILED'].includes(previous.phase)){const target=stagePath(previous);fs.rmSync(target,{recursive:true,force:true});}
  const id=crypto.randomBytes(16).toString('hex'),base=path.join(DATA,'node-setup');fs.mkdirSync(base,{recursive:true,mode:0o700});const stage=path.join(base,id);fs.mkdirSync(stage,{mode:0o700});
  for(const name of ['package.json','package-lock.json'])fs.writeFileSync(path.join(stage,name),checked(root,name),{mode:0o600,flag:'wx'});
  live.add(slug);atomicJson(file(slug),{id,phase:'QUEUED',hash,stage,createdAt:Date.now()});return status(slug);
 }
 function launch(slug,exclusive){return exclusive(async()=>{
  const s=site(slug),root=siteRoot(s),record=readJson(file(slug)),stage=stagePath(record),modules=path.join(root,'node_modules'),previous=path.join(stage,'previous-node_modules');let swapped=false,oldMoved=false;
  const save=(phase,error=null)=>atomicJson(file(slug),{...record,phase,error,updatedAt:Date.now()});
  try{save('INSTALLING');await install(stage);if(fingerprint(root)!==record.hash)throw Error('NODE_PACKAGE_CHANGED_RETRY');
   if(!fs.statSync(path.join(stage,'node_modules')).isDirectory())throw Error('NODE_MODULES_NOT_CREATED');
   const existing=fs.lstatSync(modules,{throwIfNoEntry:false});if(existing&&(existing.isSymbolicLink()||!existing.isDirectory()))throw Error('NODE_MODULES_PATH_REVIEW_REQUIRED');
   save('APPLYING');if(existing){fs.renameSync(modules,previous);oldMoved=true;}fs.renameSync(path.join(stage,'node_modules'),modules);swapped=true;save('READY');
  }catch(e){if(oldMoved&&!swapped){try{fs.renameSync(previous,modules);}catch{save('RECOVERY_REQUIRED','NODE_DEPENDENCIES_RECOVERY_REQUIRED');return;}}
   save('FAILED',/^NODE_[A-Z_]+$/.test(e.message)?e.message:'NODE_DEPENDENCIES_INSTALL_FAILED');
  }
 }).catch(()=>{const r=readJson(file(slug));if(r?.phase==='APPLYING')atomicJson(file(slug),{...r,phase:'RECOVERY_REQUIRED',error:'NODE_DEPENDENCIES_RECOVERY_REQUIRED'});else if(r?.phase!=='READY')atomicJson(file(slug),{...r,phase:'FAILED',error:'NODE_SETUP_OPERATION_BUSY'});}).finally(()=>live.delete(slug));}
 async function configuration(slug){const s=site(slug),r=registry(),names=await listDatabases();return {...status(slug),databases:names.filter(name=>!r.sites.some(other=>other.slug!==slug&&other.database===name))};}
 function configure(slug,{confirm,database}){
  if(confirm!==slug)throw new HttpError(400,'NODE_SETUP_CONFIRM_REQUIRED');const s=site(slug),r=registry(),old=status(slug);
  if(['QUEUED','INSTALLING','APPLYING','RECOVERY_REQUIRED'].includes(old.job?.phase))throw new HttpError(409,'NODE_SETUP_PENDING_OR_RECOVERY_REQUIRED');
  const envFile=path.join(DATA,'node-env-'+slug+'.json'),before=readJson(envFile,{}),next={...before,NODE_ENV:'production',APP_URL:'https://'+s.hostname,APP_ORIGIN:'https://'+s.hostname,TRUST_PROXY_HOPS:'1'};
  let selected=s.database;
  if(database){const credentials=databaseCredentials(database);if(r.sites.some(other=>other.slug!==slug&&other.database===database))throw new HttpError(409,'NODE_DATABASE_ALREADY_BOUND');
   selected=database;Object.assign(next,{MYSQL_SOCKET:SOCKET,MYSQL_USER:credentials.user,MYSQL_PASSWORD:credentials.password,MYSQL_DATABASE:database});delete next.MYSQL_HOST;delete next.MYSQL_PORT;if(!next.MYSQL_POOL_LIMIT)next.MYSQL_POOL_LIMIT='3';
  }
  const checkpoint=path.join(DATA,'node-config-before-'+slug+'-'+crypto.randomBytes(8).toString('hex')+'.json');atomicJson(checkpoint,{site:s,environment:before,createdAt:new Date().toISOString()});
  try{atomicJson(envFile,next);atomicJson(REGISTRY,{...r,sites:r.sites.map(value=>value.slug===slug?{...value,...(selected?{database:selected}:{})}:value)});}
  catch(e){atomicJson(envFile,before);atomicJson(REGISTRY,r);throw e;}
  return status(slug);
 }
 async function start(slug,confirm){if(confirm!==slug)throw new HttpError(400,'NODE_SETUP_CONFIRM_REQUIRED');const s=site(slug),state=status(slug);
  if(!state.entryExists||state.missingDependencies.length)throw new HttpError(409,'NODE_DEPENDENCIES_REQUIRED');
  if(['QUEUED','INSTALLING','APPLYING','RECOVERY_REQUIRED'].includes(state.job?.phase))throw new HttpError(409,'NODE_SETUP_PENDING_OR_RECOVERY_REQUIRED');
  await restart('mhs-site-'+slug,'restart');let health;
  for(let n=0;n<20;n++){health=await probe(s);if(health.ok&&!health.placeholder)return {started:true,health};await new Promise(r=>setTimeout(r,500));}
  return {started:false,health,error:health?.placeholder?'NODE_PLACEHOLDER_NOT_DEPLOYED':'NODE_APPLICATION_HTTP_NOT_READY'};
 }
 function environmentFile(slug,text,confirm){site(slug);if(confirm!==slug)throw new HttpError(400,'NODE_SETUP_CONFIRM_REQUIRED');return saveNodeEnv(slug,text);}
 return {status,prepare,launch,configuration,configure,start,environmentFile};
}
export const nodeSetup=nodeSetupOperations();
