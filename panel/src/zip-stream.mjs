import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {yauzl} from '../vendor/runtime.mjs';
import {DATA,atomicJson,readJson} from './config.mjs';
import {requireSite,siteRoot} from './sites.mjs';
import {safeOpen,guarded,publicPath,requireSpace,LIMITS} from './file-policy.mjs';
import {HttpError,inside} from './security.mjs';
import {assertIndependentTree} from './hosting.mjs';
import {hashFile} from './uploads.mjs';
// ZIP names must use the destination filesystem's rules. Termux private storage
// distinguishes TVCHH from tvchh; a typical Windows filesystem does not.
export function zipCaseSensitive(dir){const probe=fs.mkdtempSync(path.join(dir,'zip-case-'));try{fs.writeFileSync(path.join(probe,'Probe'),'',{mode:0o600,flag:'wx'});return !fs.existsSync(path.join(probe,'probe'));}finally{fs.rmSync(probe,{recursive:true,force:true});}}
export async function extractZipFile(file,target,{maxBytes=LIMITS.expanded,maxFiles=LIMITS.files,space=DATA}={}){
 requireSpace(space,0);const caseSensitive=zipCaseSensitive(space),key=name=>caseSensitive?name:name.toLowerCase();const handle=await fs.promises.open(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));let zip;
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.nlink!==1)throw Error('ZIP_LINK_OR_TYPE_REFUSED');
  zip=await yauzl.fromFdPromise(handle.fd,{autoClose:false,lazyEntries:true,strictFileNames:true,validateEntrySizes:true});
  if(zip.entryCount<1||zip.entryCount>maxFiles)throw new HttpError(413,'ZIP_FILE_COUNT_LIMIT');
  const seen=new Map(),entries=[];let total=0;
  for await(const e of zip.eachEntry()){const dir=e.fileName.endsWith('/'),name=publicPath(dir?e.fileName.slice(0,-1):e.fileName),mode=(e.externalFileAttributes>>>16)&0xf000;
   if(!name||seen.has(key(name))||mode&&mode!==0x8000&&mode!==0x4000||e.generalPurposeBitFlag&1||![0,8].includes(e.compressionMethod))throw new HttpError(400,'ZIP_PATH_TYPE_OR_COLLISION');
   if(!Number.isSafeInteger(e.uncompressedSize)||e.uncompressedSize<0||!Number.isSafeInteger(e.compressedSize)||e.uncompressedSize>Math.max(1,e.compressedSize)*200)throw new HttpError(413,'ZIP_EXPANSION_RATIO_LIMIT');
   seen.set(key(name),dir);total+=e.uncompressedSize;if(total>maxBytes)throw new HttpError(413,'ZIP_EXPANDED_LIMIT');entries.push({entry:e,path:name,dir});
  }
  for(const e of entries){const parts=key(e.path).split('/');while(parts.length>1){parts.pop();if(seen.get(parts.join('/'))===false)throw new HttpError(400,'ZIP_FILE_DIRECTORY_COLLISION');}}
  requireSpace(space,total);fs.mkdirSync(target,{recursive:true,mode:0o700});let written=0;
  for(const {entry:e,path:rel,dir} of entries){const out=inside(target,rel);if(dir){fs.mkdirSync(out,{recursive:true,mode:0o700});continue;}fs.mkdirSync(path.dirname(out),{recursive:true,mode:0o700});let bytes=0,crc=0;const input=await zip.openReadStreamPromise(e);
   await pipeline(input,new Transform({transform(chunk,_,cb){bytes+=chunk.length;written+=chunk.length;if(bytes>e.uncompressedSize||written>maxBytes)return cb(new Error('ZIP_ACTUAL_BYTES_LIMIT'));crc=zlib.crc32(chunk,crc);cb(null,chunk);}}),fs.createWriteStream(out,{flags:'wx',mode:0o600}));
   if(bytes!==e.uncompressedSize||crc!==e.crc32)throw new HttpError(400,'ZIP_CRC_OR_SIZE_MISMATCH');
  }
  assertIndependentTree(target);return {files:entries.length,bytes:written,entries:entries.map(({path,dir})=>({path,dir}))};
 }finally{zip?.close();await handle.close().catch(()=>{});}
}
const journal=slug=>path.join(DATA,'unzip-'+slug+'.json');
function noPending(slug){const j=readJson(journal(slug),null);if(j&&!['DONE','ROLLED_BACK'].includes(j.phase))throw new HttpError(409,'UNZIP_RECOVERY_REQUIRED');}
function planFromStage(slug,dest,stats,mode){const root=siteRoot(requireSite(slug));guarded(root,dest,{rootAllowed:true});const items=stats.entries.map(e=>{const rel=[dest,e.path].filter(Boolean).join('/'),target=guarded(root,rel),exists=fs.existsSync(target),s=exists?fs.lstatSync(target):null;if(s&&(s.isSymbolicLink()||e.dir!==s.isDirectory()))throw new HttpError(409,'UNZIP_DESTINATION_TYPE_CONFLICT');return {...e,target:rel,exists,action:e.dir?'directory':exists?(mode==='skip'?'skip':'replace'):'create'};});return items;}
export async function unzipPreview(slug,archive,dest='',mode='cancel'){
 noPending(slug);if(!['cancel','skip','overwrite'].includes(mode))throw new HttpError(400,'UNZIP_MODE');const root=siteRoot(requireSite(slug)),{fd,file}=safeOpen(root,archive);fs.closeSync(fd);const stage=path.join(DATA,'unzip-preview-'+crypto.randomUUID());try{const sha256=await hashFile(file),stats=await extractZipFile(file,stage);const items=planFromStage(slug,dest,stats,mode);return {archive,dest,sha256,files:stats.files,bytes:stats.bytes,items,conflicts:items.filter(i=>i.action==='replace').length};}finally{fs.rmSync(stage,{recursive:true,force:true});}
}
export async function unzipApply(slug,{archive,dest='',mode='cancel',sha256,confirm}){
 noPending(slug);if(confirm!==slug||!['cancel','skip','overwrite'].includes(mode)||!/^[a-f0-9]{64}$/.test(sha256||''))throw new HttpError(400,'UNZIP_CONFIRMATION_REQUIRED');
 const root=siteRoot(requireSite(slug)),{fd,file}=safeOpen(root,archive);fs.closeSync(fd);if(await hashFile(file)!==sha256)throw new HttpError(409,'ZIP_CHANGED_SINCE_PREVIEW');
 const id=crypto.randomUUID(),base=path.join(DATA,'unzip-transactions',id),stage=path.join(base,'stage'),old=path.join(base,'previous');fs.mkdirSync(base,{recursive:true,mode:0o700});
 let stats,items;try{stats=await extractZipFile(file,stage);items=planFromStage(slug,dest,stats,mode);if(mode==='cancel'&&items.some(i=>i.action==='replace'))throw new HttpError(409,'UNZIP_OVERWRITE_CONFIRM_REQUIRED');}catch(e){fs.rmSync(base,{recursive:true,force:true});throw e;}
 fs.mkdirSync(old,{recursive:true,mode:0o700});
 const j={id,slug,phase:'APPLYING',items:[],createdDirs:[],sha256};atomicJson(journal(slug),j);
 function parents(rel){const parts=rel.split('/');parts.pop();let p='';for(const part of parts){p=[p,part].filter(Boolean).join('/');const f=guarded(root,p);if(!fs.existsSync(f)){j.createdDirs.push(p);atomicJson(journal(slug),j);fs.mkdirSync(f,{mode:0o700});}else if(!fs.statSync(f).isDirectory())throw Error('UNZIP_PARENT_TYPE_CONFLICT');}}
 try{for(const i of items){if(i.dir){parents(i.target+'/placeholder');continue;}if(i.action==='skip')continue;if(i.target===archive)throw new HttpError(409,'UNZIP_CANNOT_REPLACE_OWN_ARCHIVE');parents(i.target);const record={path:i.target,stage:i.path,existed:i.exists};j.items.push(record);atomicJson(journal(slug),j);const target=guarded(root,i.target),prev=inside(old,i.path);fs.mkdirSync(old,{recursive:true,mode:0o700});if(i.exists){fs.mkdirSync(path.dirname(prev),{recursive:true});fs.renameSync(target,prev);}fs.renameSync(inside(stage,i.path),guarded(root,i.target));}
  j.phase='DONE';atomicJson(journal(slug),j);return {ok:true,id,files:j.items.length,bytes:stats.bytes,restart:false};
 }catch(e){try{await recoverUnzip(slug,slug);}catch{throw new HttpError(500,'UNZIP_RECOVERY_REQUIRED');}throw e;}
}
export async function recoverUnzip(slug,confirm){if(confirm!==slug)throw new HttpError(400,'UNZIP_CONFIRMATION_REQUIRED');const j=readJson(journal(slug),null);if(!j||!/^[a-f0-9-]{36}$/.test(j.id)||j.slug!==slug||!['APPLYING','RECOVERY_REQUIRED'].includes(j.phase))throw new HttpError(409,'NO_UNZIP_RECOVERY');const root=siteRoot(requireSite(slug)),base=path.join(DATA,'unzip-transactions',j.id),stage=path.join(base,'stage'),old=path.join(base,'previous');
 try{for(const r of [...j.items].reverse()){const target=guarded(root,r.path),prev=path.join(old,publicPath(r.stage)),source=path.join(stage,publicPath(r.stage));if(fs.existsSync(prev)){if(fs.existsSync(target))fs.unlinkSync(target);fs.renameSync(prev,target);}else if(!r.existed&&!fs.existsSync(source)&&fs.existsSync(target))fs.unlinkSync(target);}
  for(const d of [...j.createdDirs].reverse()){const f=guarded(root,d);if(fs.existsSync(f)&&fs.statSync(f).isDirectory()&&fs.readdirSync(f).length===0)fs.rmdirSync(f);}j.phase='ROLLED_BACK';atomicJson(journal(slug),j);return {ok:true};
 }catch{j.phase='RECOVERY_REQUIRED';atomicJson(journal(slug),j);throw new HttpError(500,'UNZIP_RECOVERY_REQUIRED');}
}
