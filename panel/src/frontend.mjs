import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DATA,atomicJson,readJson,registry,saveRegistry} from './config.mjs';
import {requireSite,siteRoot} from './sites.mjs';
import {guarded,publicPath,walkPublic,requireSpace} from './file-policy.mjs';
import {extractZipFile} from './zip-stream.mjs';
import {hashFile} from './uploads.mjs';
import {siteHealth} from './hosting.mjs';
import {serviceAction} from './system.mjs';
import {HttpError} from './security.mjs';
const journal=slug=>path.join(DATA,'frontend-'+slug+'.json');
const reserved=/^(?:node_modules|package(?:-lock)?\.json|server\.(?:mjs|cjs|js)|storage|uploads|sheets|data|database|backups|logs|\.env.*)$/i;
function frontPath(site,rel){if(site.type!=='node')throw new HttpError(400,'FRONTEND_NODE_ONLY');publicPath(rel);if(!rel||rel.split('/').some(p=>reserved.test(p))||site.entry===rel||site.entry.startsWith(rel+'/')||rel.startsWith(site.entry+'/'))throw new HttpError(403,'FRONTEND_OVERLAPS_BACKEND_OR_DATA');return guarded(siteRoot(site),rel);}
function frontTree(root){const s=walkPublic(root);function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(reserved.test(e.name)||/\.(?:php|sql|sh|cjs|mjs|sqlite|db)$/i.test(e.name))throw new HttpError(403,'FRONTEND_CONTAINS_BACKEND_OR_DATA');if(e.isDirectory())scan(path.join(dir,e.name));}}scan(root);return s;}
export function configureFrontend(slug,target,confirm){if(confirm!==slug)throw new HttpError(400,'FRONTEND_CONFIRM_REQUIRED');const site=requireSite(slug),p=frontPath(site,target);if(fs.existsSync(p))frontTree(p);const r=registry();r.sites=r.sites.map(s=>s.slug===slug?{...s,frontend:target}:s);saveRegistry(r);return {target,entrypoint:site.entry};}
export async function previewFrontend(slug,archive){const site=requireSite(slug);frontPath(site,site.frontend||'');const root=siteRoot(site),file=guarded(root,archive),stage=path.join(DATA,'front-preview-'+crypto.randomUUID());try{const sha256=await hashFile(file),stats=await extractZipFile(file,stage);const entries=fs.readdirSync(stage),effective=entries.length===1&&fs.statSync(path.join(stage,entries[0])).isDirectory()?path.join(stage,entries[0]):stage;if(!fs.existsSync(path.join(effective,'index.html')))throw new HttpError(400,'FRONTEND_INDEX_REQUIRED');frontTree(effective);return {archive,sha256,target:site.frontend,backendEntry:site.entry,bytes:stats.bytes,files:stats.files,restartDefault:false,paths:walkPublic(effective).files.map(f=>f.path)};}finally{fs.rmSync(stage,{recursive:true,force:true});}}
export async function deployFrontend(slug,{archive,sha256,confirm,restart=false},{health=siteHealth,restartService=serviceAction}={}){
 if(confirm!==slug||typeof restart!=='boolean'||!/^[a-f0-9]{64}$/.test(sha256||''))throw new HttpError(400,'FRONTEND_CONFIRM_REQUIRED');
 const old=readJson(journal(slug),null);if(old&&!['DONE','ROLLED_BACK'].includes(old.phase))throw new HttpError(409,'FRONTEND_RECOVERY_REQUIRED');
 const site=requireSite(slug),root=siteRoot(site),target=frontPath(site,site.frontend||''),file=guarded(root,archive);if(file===target||file.startsWith(target+path.sep))throw new HttpError(400,'FRONTEND_ARCHIVE_INSIDE_TARGET');
 if(fs.existsSync(target))frontTree(target);if(await hashFile(file)!==sha256)throw new HttpError(409,'ZIP_CHANGED_SINCE_PREVIEW');
 const id=crypto.randomUUID(),base=path.join(DATA,'frontend-releases',slug,id),stage=path.join(base,'stage'),previous=path.join(base,'previous');fs.mkdirSync(base,{recursive:true,mode:0o700});
 let stats,effective;try{stats=await extractZipFile(file,stage);const entries=fs.readdirSync(stage);effective=entries.length===1&&fs.statSync(path.join(stage,entries[0])).isDirectory()?path.join(stage,entries[0]):stage;if(!fs.existsSync(path.join(effective,'index.html')))throw new HttpError(400,'FRONTEND_INDEX_REQUIRED');frontTree(effective);requireSpace(DATA,0);}catch(e){fs.rmSync(base,{recursive:true,force:true});throw e;}
 const j={id,slug,target:site.frontend,sha256,phase:'PREPARED',hadPrevious:fs.existsSync(target),restart};atomicJson(journal(slug),j);let installed=false,moved=false;
 try{fs.mkdirSync(path.dirname(target),{recursive:true});frontPath(site,site.frontend);if(j.hadPrevious){fs.renameSync(target,previous);moved=true;}j.phase='OLD_MOVED';atomicJson(journal(slug),j);fs.renameSync(effective,target);installed=true;
  if(restart)await restartService('mhs-site-'+slug,'restart');const checked=registry().nginxIntegrated?await health(site):{ok:false,notRun:true};if(!checked.ok&&!checked.notRun)throw new HttpError(400,'FRONTEND_HTTP_FAILED');j.phase='DONE';j.health=checked;atomicJson(journal(slug),j);return {ok:true,id,target:site.frontend,stats,httpVerified:checked.ok,restarted:restart};
 }catch(e){try{if(installed)fs.renameSync(target,path.join(base,'failed'));if(moved)fs.renameSync(previous,target);if(restart)await restartService('mhs-site-'+slug,'restart');j.phase='ROLLED_BACK';atomicJson(journal(slug),j);}catch{j.phase='RECOVERY_REQUIRED';atomicJson(journal(slug),j);throw new HttpError(500,'FRONTEND_RECOVERY_REQUIRED');}throw e;}
}
export async function rollbackFrontend(slug,confirm,{restartService=serviceAction}={}){if(confirm!==slug)throw new HttpError(400,'FRONTEND_CONFIRM_REQUIRED');const j=readJson(journal(slug),null);if(!j||j.slug!==slug||!/^[a-f0-9-]{36}$/.test(j.id)||!['DONE','PREPARED','OLD_MOVED','RECOVERY_REQUIRED'].includes(j.phase))throw new HttpError(409,'NO_FRONTEND_ROLLBACK');const site=requireSite(slug),target=frontPath(site,j.target),base=path.join(DATA,'frontend-releases',slug,j.id),prev=path.join(base,'previous');if(j.hadPrevious&&!fs.existsSync(prev)&&j.phase==='DONE')throw new HttpError(409,'FRONTEND_PREVIOUS_MISSING');
 if(fs.existsSync(prev)||!j.hadPrevious&&j.phase!=='PREPARED'){if(fs.existsSync(target))fs.renameSync(target,path.join(base,'rollback-'+crypto.randomUUID()));if(fs.existsSync(prev))fs.renameSync(prev,target);}if(j.restart)await restartService('mhs-site-'+slug,'restart');j.phase='ROLLED_BACK';atomicJson(journal(slug),j);return {ok:true,target:j.target,databaseUnchanged:true};}
