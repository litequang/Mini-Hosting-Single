import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {registry,saveRegistry,SITES,TRASH,DATA,atomicJson,readJson} from './config.mjs';
import {slugOK,hostOK,inside,cleanRel,HttpError} from './security.mjs';
import {createService,removeService,regenerateNginx,serviceAction} from './system.mjs';
import {extractZip} from './zip.mjs';
import {guarded,publicPath,safeOpen} from './file-policy.mjs';
import {extractZipFile} from './zip-stream.mjs';
import {hashFile} from './uploads.mjs';
import {createDatabase} from './databases.mjs';
import {assertIndependentTree,wpConfig,siteHealth} from './hosting.mjs';
export function requireSite(slug){const site=registry().sites.find(s=>s.slug===slug);if(!site)throw new HttpError(404,'WEBSITE_NOT_FOUND');if(!slugOK(site.slug))throw Error('INVALID_REGISTRY');return site;}
export const listSites=()=>registry().sites.map(s=>({...s,directory:siteRoot(s),deployPhase:readJson(deployFile(s.slug),null)?.phase||null,restorePhase:readJson(path.join(DATA,'restore-'+s.slug+'.json'),null)?.phase||null}));
export const siteRoot=site=>path.join(SITES,site.slug,site.type==='node'?'app':'public');
export function entryOK(entry){try{cleanRel(entry);return /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,150}\.(?:mjs|cjs|js)$/.test(entry);}catch{return false;}}
export function validateEnvironment(values){if(!values||Array.isArray(values)||typeof values!=='object'||Object.keys(values).length>50)throw Error('INVALID_NODE_ENV');for(const [k,v] of Object.entries(values)){if(!/^[A-Z_][A-Z0-9_]{0,63}$/.test(k)||/^(?:PORT|NODE_OPTIONS|NODE_PATH|LD_.*|DYLD_.*|PATH|HOME|PREFIX|MHS_.*)$/.test(k)||typeof v!=='string'||v.length>8192||v.includes('\0'))throw Error('INVALID_NODE_ENV');}return values;}
export async function updateSite(slug,{hostname,entry,port,environment}){
 const site=requireSite(slug),r=registry(),next={...site};
 if(hostname!==undefined){if(!hostOK(hostname)||r.sites.some(s=>s.slug!==slug&&s.hostname===hostname))throw Error('INVALID_OR_DUPLICATE_HOSTNAME');next.hostname=hostname;}
 if(entry!==undefined||port!==undefined||environment!==undefined){if(site.type!=='node')throw Error('NODE_CONFIG_ONLY');if(entry!==undefined){if(!entryOK(entry)||!fs.existsSync(inside(siteRoot(site),entry)))throw Error('NODE_ENTRY_NOT_FOUND');next.entry=entry;}if(port!==undefined){if(!Number.isSafeInteger(port)||port<1024||port>65535||[8080,9090,9091,8022].includes(port)||r.sites.some(s=>s.slug!==slug&&s.port===port))throw Error('NODE_PORT_INVALID_OR_USED');next.port=port;}if(environment!==undefined)validateEnvironment(environment);}
 const envFile=path.join(DATA,'node-env-'+slug+'.json'),oldEnv=readJson(envFile,null);
 try{await regenerateNginx(r.sites.map(s=>s.slug===slug?next:s));if(environment!==undefined)atomicJson(envFile,environment);r.sites=r.sites.map(s=>s.slug===slug?next:s);saveRegistry(r);if(site.type==='node'){await createService(next);if(r.nginxIntegrated)await serviceAction('mhs-site-'+slug,'restart');}return next;}
 catch(e){saveRegistry({...r,sites:r.sites.map(s=>s.slug===slug?site:s)});if(oldEnv)atomicJson(envFile,oldEnv);else fs.rmSync(envFile,{force:true});await regenerateNginx(registry().sites);throw e;}
}
export async function addSite({slug,hostname,type='static',entry='server.mjs'}){
 if(!slugOK(slug)||!hostOK(hostname)||!['static','node','php','wordpress'].includes(type))throw new HttpError(400,'Invalid site config');
 if(!entryOK(entry))throw new HttpError(400,'Invalid Node entrypoint');
 const r=registry();if(r.sites.some(s=>s.slug===slug||s.hostname===hostname))throw new HttpError(409,'Site slug or hostname already exists');
 if(fs.existsSync(path.join(SITES,slug)))throw new HttpError(409,'SITE_DIRECTORY_EXISTS');
 const used=new Set(r.sites.map(s=>s.port));let port=3200;while(used.has(port)&&port<=3399)port++;if(port>3399)throw new HttpError(409,'NO_NODE_PORT');
 const site={managedBy:'MHS',slug,hostname,type,entry:type==='node'?entry:null,port:type==='node'?port:null,createdAt:new Date().toISOString()};
 const root=siteRoot(site);fs.mkdirSync(root,{recursive:true,mode:0o700});
 try{
  if(type==='wordpress'){
   site.database='wp_'+slug.replaceAll('-','_').slice(0,18)+'_'+crypto.randomBytes(3).toString('hex');
   await createDatabase(site.database);
   fs.writeFileSync(path.join(root,'wp-config.php'),wpConfig(site),{mode:0o600});
   fs.writeFileSync(path.join(root,'index.php'),"<?php header('Content-Type: text/plain; charset=utf-8'); echo 'MHS WordPress: upload official WordPress ZIP in Panel, then open /wp-admin/install.php';");
  }else if(type==='php')fs.writeFileSync(path.join(root,'index.php'),"<?php header('Content-Type: text/plain'); echo 'MHS PHP ready';");
  else if(type==='static')fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8"><h1>${hostname}</h1><p>Mini Hosting Single</p>`);
  else{fs.mkdirSync(path.dirname(path.join(root,entry)),{recursive:true});fs.writeFileSync(path.join(root,entry),`const http=require('node:http');http.createServer((req,res)=>{res.end('MHS Node ready');}).listen(Number(process.env.PORT),'127.0.0.1');\n`.replace("const http=require('node:http');",entry.endsWith('.mjs')?"import http from 'node:http';":"const http=require('node:http');"));await createService(site);}
  await regenerateNginx([...r.sites,site]);r.sites.push(site);saveRegistry(r);return site;
 }catch(e){
  // Keep a failed WordPress setup and its database for diagnosis; never drop it.
  atomicJson(path.join(DATA,'failed-create-'+slug+'.json'),{site,error:'CREATE_INCOMPLETE',at:new Date().toISOString()});throw e;
 }
}
export async function deleteSite(slug){const r=registry(),site=requireSite(slug);const remaining=r.sites.filter(s=>s.slug!==slug);if(site.type==='node')await removeService(site);await regenerateNginx(remaining);const dest=path.join(TRASH,`${Date.now()}-${slug}`);fs.mkdirSync(TRASH,{recursive:true});fs.renameSync(path.join(SITES,slug),dest);r.sites=remaining;saveRegistry(r);return {trash:path.basename(dest),databasePreserved:site.database||null};}
export function listFiles(slug,rel=''){const dir=guarded(siteRoot(requireSite(slug)),rel,{rootAllowed:true});return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>{try{publicPath(e.name);return !e.isSymbolicLink();}catch{return false;}}).map(e=>{const s=fs.statSync(path.join(dir,e.name));return {name:e.name,dir:e.isDirectory(),size:s.size,mtime:s.mtime.toISOString()};}).sort((a,b)=>Number(b.dir)-Number(a.dir)||a.name.localeCompare(b.name));}
export function readFileForSite(slug,rel){const {fd,stat}=safeOpen(siteRoot(requireSite(slug)),rel);try{if(stat.size>2*1024*1024)throw new HttpError(413,'EDITOR_LIMIT');const b=fs.readFileSync(fd);if(b.includes(0))throw new HttpError(400,'BINARY_FILE_EDITOR_REFUSED');return b.toString('utf8');}finally{fs.closeSync(fd);}}
export function writeSiteFile(slug,rel,bytes){if(!rel||bytes.length>2*1024*1024)throw new HttpError(400,'EDITOR_SIZE_OR_PATH');const root=siteRoot(requireSite(slug)),dest=guarded(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});guarded(root,rel);if(fs.existsSync(dest)&&(!fs.lstatSync(dest).isFile()||fs.lstatSync(dest).nlink!==1))throw new HttpError(400,'NOT_REGULAR_FILE');const fd=fs.openSync(dest,fs.constants.O_WRONLY|fs.constants.O_CREAT|(fs.constants.O_NOFOLLOW||0),0o600);try{if(fs.fstatSync(fd).nlink!==1)throw new HttpError(403,'FILE_LINK_REFUSED');fs.ftruncateSync(fd,0);fs.writeFileSync(fd,bytes);}finally{fs.closeSync(fd);}return {path:rel,bytes:bytes.length};}
export function mkdirSite(slug,rel){const root=siteRoot(requireSite(slug));fs.mkdirSync(guarded(root,rel),{recursive:true});guarded(root,rel);return {created:rel};}
export function deleteSiteFile(slug,rel){const file=guarded(siteRoot(requireSite(slug)),rel);if(fs.statSync(file).isDirectory()){if(fs.readdirSync(file).length)throw new HttpError(409,'DIRECTORY_NOT_EMPTY');fs.rmdirSync(file);}else fs.unlinkSync(file);return {deleted:rel};}
const deployFile=slug=>path.join(DATA,'deploy-'+slug+'.json');
export async function deployZip(slug,buf,expectedSha=null){
 const site=requireSite(slug),target=siteRoot(site),id=crypto.randomUUID(),stage=path.join(DATA,'staging-'+id),previous=target+'-previous-'+id;
 const sha256=typeof buf==='string'?await hashFile(buf):crypto.createHash('sha256').update(buf).digest('hex');if(expectedSha&&expectedSha!==sha256)throw new HttpError(400,'ZIP_CHECKSUM_MISMATCH');
 const old=readJson(deployFile(slug),null);if(old&&old.phase!=='DONE'&&old.phase!=='ROLLED_BACK')throw new HttpError(409,'DEPLOY_RECOVERY_REQUIRED');
 let moved=false,installed=false,paused=false;
 try{
  const stats=typeof buf==='string'?await extractZipFile(buf,stage):extractZip(buf,stage,{maxFiles:12000,maxTotal:256*1024*1024});assertIndependentTree(stage);
  let effective=stage;const expected=site.type==='node'?site.entry:['php','wordpress'].includes(site.type)?'index.php':'index.html';
  const f=fs.readdirSync(stage);if(f.length===1&&fs.statSync(path.join(stage,f[0])).isDirectory()&&fs.existsSync(path.join(stage,f[0],expected)))effective=path.join(stage,f[0]);
  if(!fs.existsSync(path.join(effective,expected)))throw Error('ZIP_ENTRYPOINT_MISSING');
  if(site.type==='wordpress'){
   if(!fs.existsSync(path.join(effective,'wp-settings.php')))throw Error('WORDPRESS_CORE_MISSING');
   fs.copyFileSync(path.join(target,'wp-config.php'),path.join(effective,'wp-config.php'));
   // A deployment replaces code, not existing uploads. Never overwrite existing media silently.
   if(fs.existsSync(path.join(target,'wp-content/uploads'))){if(fs.existsSync(path.join(effective,'wp-content/uploads')))throw Error('WORDPRESS_UPLOADS_CONFLICT');fs.cpSync(path.join(target,'wp-content/uploads'),path.join(effective,'wp-content/uploads'),{recursive:true});}
  }
  atomicJson(deployFile(slug),{id,slug,sha256,phase:'PREPARED',previous:path.basename(previous)});
  if(site.type==='node'){await serviceAction('mhs-site-'+slug,'down');paused=true;}
  fs.renameSync(target,previous);moved=true;atomicJson(deployFile(slug),{id,slug,sha256,phase:'OLD_MOVED',previous:path.basename(previous)});
  fs.renameSync(effective,target);installed=true;
  if(paused)await serviceAction('mhs-site-'+slug,'up');
  const health=registry().nginxIntegrated?await siteHealth(site):{ok:false,httpStatus:null,notRun:true};
  if(registry().nginxIntegrated&&!health.ok)throw Error('DEPLOY_HTTP_FAILED');
  atomicJson(deployFile(slug),{id,slug,sha256,phase:'DONE',previous:path.basename(previous),health});return {stats,sha256,release:id,httpVerified:health.ok,previous:path.basename(previous)};
 }catch(e){
  if(moved){if(installed){const failed=target+'-failed-'+id;fs.renameSync(target,failed);}fs.renameSync(previous,target);}
  if(paused)await serviceAction('mhs-site-'+slug,'up');
  if(moved||paused)atomicJson(deployFile(slug),{id,slug,phase:'ROLLED_BACK'});throw e;
 }finally{fs.rmSync(stage,{force:true,recursive:true});}
}
export async function rollbackDeploy(slug){const site=requireSite(slug),j=readJson(deployFile(slug),null);if(j?.phase!=='DONE'||!j.previous||!/^[-a-z0-9.]+$/.test(j.previous))throw Error('NO_DEPLOY_ROLLBACK');const root=siteRoot(site),prev=path.join(path.dirname(root),j.previous);if(!fs.existsSync(prev))throw Error('ROLLBACK_FILES_MISSING');if(site.type==='node')await serviceAction('mhs-site-'+slug,'down');const saved=root+'-rollback-'+crypto.randomUUID();fs.renameSync(root,saved);fs.renameSync(prev,root);if(site.type==='node')await serviceAction('mhs-site-'+slug,'up');atomicJson(deployFile(slug),{...j,phase:'ROLLED_BACK',saved:path.basename(saved)});return {ok:true,databaseUnchanged:true};}
