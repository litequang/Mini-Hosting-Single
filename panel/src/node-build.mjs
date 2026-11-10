// Replace the directory containing a nested Node entrypoint, never the app root.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DATA,NODE,atomicJson,readJson,registry} from './config.mjs';
import {requireSite,siteRoot} from './sites.mjs';
import {guarded,publicPath,safeOpen,walkPublic,requireSpace} from './file-policy.mjs';
import {extractZipFile} from './zip-stream.mjs';
import {hashFile} from './uploads.mjs';
import {assertIndependentTree,siteHealth} from './hosting.mjs';
import {serviceAction,shellStatus,siteHttpHealth,cmd} from './system.mjs';
import {HttpError} from './security.mjs';
import {buildJournal,assertNodeBuildSettled} from './node-build-state.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const dataName=/^(?:node_modules|package(?:-lock)?\.json|storage|uploads|sheets|data|database|backups|logs|\.env.*)$/i;
const persistentName=/^(?:node_modules|package(?:-lock)?\.json|storage|uploads|sheets|database|backups|logs|\.env.*)$/i;
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const code=error=>error instanceof HttpError?error.message:'NODE_BUILD_OPERATION_FAILED';
function layout(slug){
 const site=requireSite(slug);if(site.type!=='node')throw new HttpError(400,'NODE_BUILD_NODE_ONLY');
 const parts=publicPath(site.entry).split('/'),target=parts.shift();
 if(!parts.length||dataName.test(target))throw new HttpError(400,'NODE_BUILD_NESTED_ENTRY_REQUIRED');
 const root=siteRoot(site);return {site,root,target,entry:parts.join('/'),absolute:guarded(root,target)};
}
function otherRecovery(slug){
 for(const name of ['deploy','frontend','unzip','restore']){const j=readJson(path.join(DATA,name+'-'+slug+'.json'),null);if(j&&!['DONE','ROLLED_BACK'].includes(j.phase))throw new HttpError(409,'NODE_BUILD_OTHER_RECOVERY_REQUIRED');}
}
function tree(root){
 const result=walkPublic(root);const scan=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if((dir===root?dataName:persistentName).test(e.name)||/\.(?:sql|sqlite|db|bak|zip|mhs\.gz)$/i.test(e.name))throw new HttpError(403,'NODE_BUILD_CONTAINS_DATA_OR_DEPENDENCIES');if(e.isDirectory())scan(path.join(dir,e.name));}};scan(root);assertIndependentTree(root);return result;
}
async function fingerprint(root){
 const files=tree(root).files.sort((a,b)=>a.path.localeCompare(b.path)),hash=crypto.createHash('sha256');
 for(const f of files){const content=crypto.createHash('sha256'),{fd}=safeOpen(root,f.path);try{for await(const part of fs.createReadStream('',{fd,autoClose:false,highWaterMark:128*1024}))content.update(part);}finally{fs.closeSync(fd);}hash.update(JSON.stringify([f.path,f.size,content.digest('hex')])+'\n');}
 return hash.digest('hex');
}
function archiveFile(root,archive,target){
 const {fd,file}=safeOpen(root,archive);fs.closeSync(fd);
 if(!/\.zip$/i.test(archive)||file===target||file.startsWith(target+path.sep))throw new HttpError(400,'NODE_BUILD_ZIP_OUTSIDE_BUILD_REQUIRED');return file;
}
function selectBuild(stage,stats,l){
 const candidates=[stage,path.join(stage,l.target)],entries=fs.readdirSync(stage,{withFileTypes:true});
 if(entries.length===1&&entries[0].isDirectory()){const wrapper=path.join(stage,entries[0].name);candidates.push(wrapper,path.join(wrapper,l.target));}
 const matches=[...new Set(candidates)].filter(root=>fs.existsSync(path.join(root,l.entry))&&fs.statSync(path.join(root,l.entry)).isFile());
 if(matches.length!==1)throw new HttpError(400,matches.length?'NODE_BUILD_AMBIGUOUS_ZIP':'NODE_BUILD_ENTRY_MISSING');
 const effective=matches[0],prefix=path.relative(stage,effective).split(path.sep).join('/');
 if(prefix&&stats.entries.some(e=>e.path!==prefix&&!e.path.startsWith(prefix+'/')&&!(e.dir&&prefix.startsWith(e.path+'/'))))throw new HttpError(400,'NODE_BUILD_ZIP_HAS_FILES_OUTSIDE_BUILD');
 tree(effective);return effective;
}
async function checkSyntax(file){if(!(await cmd(NODE,['--check',file],15000,8192)).ok)throw new HttpError(400,'NODE_BUILD_SYNTAX_FAILED');}
async function checkHealth(site){
 const direct=await siteHttpHealth(site);if(!direct.ok||direct.placeholder)return {...direct,ok:false};
 const nginx=registry().nginxIntegrated?await siteHealth(site):null;return {...direct,ok:!nginx||nginx.ok,nginxStatus:nginx?.httpStatus||null};
}
export function nodeBuildOperations({service=serviceAction,status=shellStatus,health=checkHealth,syntax=checkSyntax,pause=()=>new Promise(r=>setTimeout(r,350)),checkpoint=()=>{}}={}){
 async function ready(site){for(let i=0;i<20;i++){const result=await health(site);if(result.ok&&!result.placeholder)return result;if(i<19)await pause();}throw new HttpError(502,'NODE_BUILD_HTTP_FAILED');}
 async function running(site){const s=await status('mhs-site-'+site.slug);if(!s.ok||!s.out.startsWith('run:'))throw new HttpError(409,'NODE_BUILD_START_SITE_FIRST');}
 function planPath(id){if(!UUID.test(id||''))throw new HttpError(400,'NODE_BUILD_PLAN_INVALID');return path.join(DATA,'node-build-plans',id+'.json');}
 function baseFor(j){if(j?.project!=='MHS'||!UUID.test(j.id||''))throw new HttpError(409,'NODE_BUILD_JOURNAL_INVALID');return path.join(DATA,'node-build-releases',j.slug,j.id);}
 function save(j,phase){j.phase=phase;atomicJson(buildJournal(j.slug),j);checkpoint(phase,j);}
 async function stage(file,base,l){
  fs.mkdirSync(base,{recursive:true,mode:0o700});const dir=path.join(base,'stage'),stats=await extractZipFile(file,dir),effective=selectBuild(dir,stats,l);
  // Match the live package's JS module type during --check without installing
  // dependencies or copying a manifest into the replaceable build directory.
  let type='commonjs';if(fs.existsSync(path.join(l.root,'package.json'))){const {fd,stat}=safeOpen(l.root,'package.json');try{if(stat.size>2*1024*1024)throw new HttpError(413,'NODE_BUILD_PACKAGE_LIMIT');type=JSON.parse(fs.readFileSync(fd,'utf8')).type==='module'?'module':'commonjs';}finally{fs.closeSync(fd);}}
  atomicJson(path.join(base,'package.json'),{type});await syntax(path.join(effective,l.entry));return {stats,effective,hash:await fingerprint(effective)};
 }
 function report(j){return {slug:j.slug,id:j.id,target:j.target,entry:j.entry,phase:j.phase,errorCode:j.errorCode||null,health:j.health||null,rollbackAvailable:j.phase==='DONE'};}
 function getStatus(slug){const l=layout(slug),j=readJson(buildJournal(slug),null);return {slug,target:l.target,entry:l.site.entry,journal:j?report(j):null};}
 async function preview(slug,archive){
  assertNodeBuildSettled(slug);otherRecovery(slug);const l=layout(slug),file=archiveFile(l.root,archive,l.absolute);tree(l.absolute);
  const base=path.join(DATA,'node-build-preview-'+crypto.randomUUID());
  try{const archiveHash=await hashFile(file),staged=await stage(file,base,l);if(await hashFile(file)!==archiveHash)throw new HttpError(409,'ZIP_CHANGED_SINCE_PREVIEW');const beforeHash=await fingerprint(l.absolute),id=crypto.randomUUID(),plan={project:'MHS',id,slug,archive,archiveHash,beforeHash,afterHash:staged.hash,target:l.target,entry:l.site.entry,siteHash:digest(l.site),createdAt:Date.now(),phase:'PREPARED'};atomicJson(planPath(id),plan);
   return {id,slug,archive,sha256:archiveHash,target:l.target,entry:l.site.entry,files:tree(staged.effective).files.length,bytes:staged.stats.bytes,restartRequired:true,preserved:['package.json','package-lock.json','node_modules','.env','storage','sheets','database'],expiresAt:new Date(plan.createdAt+600000).toISOString()};
  }finally{fs.rmSync(base,{recursive:true,force:true});}
 }
 async function restore(j,l){
  const base=baseFor(j),previous=path.join(base,'previous'),hasPrevious=fs.existsSync(previous);
  if(hasPrevious&&await fingerprint(previous)!==j.beforeHash)throw new HttpError(409,'NODE_BUILD_PREVIOUS_CHANGED');
  if(fs.existsSync(l.absolute)){const actual=await fingerprint(l.absolute);if(actual!==j.afterHash&&actual!==j.beforeHash)throw new HttpError(409,'NODE_BUILD_TARGET_CHANGED');}
  if(!hasPrevious&&(!fs.existsSync(l.absolute)||await fingerprint(l.absolute)!==j.beforeHash))throw new HttpError(409,'NODE_BUILD_PREVIOUS_MISSING');
  await service('mhs-site-'+j.slug,'down');
  if(hasPrevious){if(fs.existsSync(l.absolute))fs.renameSync(l.absolute,path.join(base,'rolled-back-'+crypto.randomUUID()));fs.renameSync(previous,l.absolute);}
  await service('mhs-site-'+j.slug,'up');j.health=await ready(l.site);save(j,'ROLLED_BACK');return {...report(j),databaseUnchanged:true};
 }
 async function deploy(slug,{id,confirm}){
  if(confirm!==slug)throw new HttpError(400,'NODE_BUILD_CONFIRM_REQUIRED');assertNodeBuildSettled(slug);otherRecovery(slug);
  const l=layout(slug),p=readJson(planPath(id),null);if(!p||p.project!=='MHS'||p.phase!=='PREPARED'||p.slug!==slug||Date.now()-p.createdAt>600000||p.target!==l.target||p.entry!==l.site.entry||p.siteHash!==digest(l.site))throw new HttpError(409,'NODE_BUILD_REPREVIEW_REQUIRED');
  const file=archiveFile(l.root,p.archive,l.absolute);if(await hashFile(file)!==p.archiveHash)throw new HttpError(409,'ZIP_CHANGED_SINCE_PREVIEW');
  const releaseId=crypto.randomUUID(),j={project:'MHS',id:releaseId,slug,target:l.target,entry:l.site.entry,beforeHash:p.beforeHash,afterHash:p.afterHash,plan:id,createdAt:Date.now()},base=baseFor(j);let staged;
  try{staged=await stage(file,base,l);if(staged.hash!==p.afterHash||await hashFile(file)!==p.archiveHash||await fingerprint(l.absolute)!==p.beforeHash)throw new HttpError(409,'NODE_BUILD_CHANGED_REPREVIEW');await running(l.site);if(!(await health(l.site)).ok)throw new HttpError(409,'NODE_BUILD_CURRENT_HTTP_NOT_READY');requireSpace(DATA,0);}catch(e){fs.rmSync(base,{recursive:true,force:true});throw e;}
  p.phase='USED';atomicJson(planPath(id),p);save(j,'PREPARED');
  try{save(j,'STOPPING');await service('mhs-site-'+slug,'down');save(j,'STOPPED');fs.renameSync(l.absolute,path.join(base,'previous'));save(j,'OLD_MOVED');fs.renameSync(staged.effective,l.absolute);save(j,'NEW_INSTALLED');await service('mhs-site-'+slug,'up');save(j,'VERIFYING');j.health=await ready(l.site);save(j,'DONE');return {...report(j),httpVerified:true,restarted:true,databaseUnchanged:true};}
  catch(error){j.errorCode=code(error);try{await restore(j,l);}catch{save(j,'RECOVERY_REQUIRED');throw new HttpError(500,'NODE_BUILD_RECOVERY_REQUIRED');}throw new HttpError(502,j.errorCode);}
 }
 async function rollback(slug,confirm){
  if(confirm!==slug)throw new HttpError(400,'NODE_BUILD_CONFIRM_REQUIRED');const l=layout(slug),j=readJson(buildJournal(slug),null);
  if(!j||j.slug!==slug||j.target!==l.target||j.entry!==l.site.entry||j.phase==='ROLLED_BACK')throw new HttpError(409,'NO_NODE_BUILD_ROLLBACK');baseFor(j);
  try{return await restore(j,l);}catch(error){j.errorCode=code(error);save(j,'RECOVERY_REQUIRED');throw new HttpError(500,'NODE_BUILD_RECOVERY_REQUIRED');}
 }
 return {preview,deploy,rollback,status:getStatus};
}
export const nodeBuild=nodeBuildOperations();
