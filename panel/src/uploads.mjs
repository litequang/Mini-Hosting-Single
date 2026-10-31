import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {TusServer,FileStore} from '../vendor/runtime.mjs';
import {DATA,atomicJson,readJson} from './config.mjs';
import {requireSite,siteRoot} from './sites.mjs';
import {guarded,requireSpace,LIMITS,MiB} from './file-policy.mjs';
import {HttpError} from './security.mjs';
const context=new AsyncLocalStorage(),base=path.join(DATA,'uploads'),TTL=24*3600000;
const idOK=id=>/^[a-f0-9]{32}$/.test(id),meta=id=>path.join(base,id+'.mhs.json');
const uploadLimit=()=>{const v=readJson(path.join(DATA,'settings.json'),{}).uploadMaxMiB;return Number.isInteger(v)&&v>=1&&v<=2048?v*MiB:LIMITS.file;};
export async function hashFile(file){const hash=crypto.createHash('sha256');for await(const part of fs.createReadStream(file,{highWaterMark:128*1024}))hash.update(part);return hash.digest('hex');}
class CheckedStore extends FileStore {
 async write(readable,id,offset){
  const c=context.getStore(),chunk=path.join(base,id+'.chunk-'+crypto.randomUUID()),hash=crypto.createHash('sha256');let bytes=0;
  requireSpace(DATA,LIMITS.chunk);
  try{await pipeline(readable,new Transform({transform(part,_,cb){bytes+=part.length;if(bytes>LIMITS.chunk)return cb(new HttpError(413,'UPLOAD_CHUNK_LIMIT'));hash.update(part);cb(null,part);}}),fs.createWriteStream(chunk,{flags:'wx',mode:0o600}));
   if(hash.digest('base64')!==c.checksum)throw {status_code:460,body:'UPLOAD_CHUNK_CHECKSUM_FAILED'};
   // A partial request never advances the Tus offset: commit only verified chunks.
   const current=await this.getUpload(id);if(current.offset!==offset)throw {status_code:409,body:'UPLOAD_OFFSET_CONFLICT'};
   const result=await super.write(fs.createReadStream(chunk),id,offset);const r=readJson(meta(id),null);atomicJson(meta(id),{...r,updatedAt:Date.now()});return result;
  }finally{fs.rmSync(chunk,{force:true});}
 }
}
let server;
function getServer(){
 if(server)return server;fs.mkdirSync(base,{recursive:true,mode:0o700});fs.chmodSync(base,0o700);
 const store=new CheckedStore({directory:base,expirationPeriodInMilliseconds:TTL});
 server=new TusServer({path:'/api/uploads',datastore:store,relativeLocation:true,respectForwardedHeaders:false,allowedOrigins:[],maxSize:()=>uploadLimit(),
  generateUrl:(_,o)=>'/api/uploads/'+context.getStore().slug+'/'+o.id,
  onResponseError:(_,err)=>({status_code:[400,404,409,413,429,460,507].includes(err.status_code)?err.status_code:400,body:/^UPLOAD_[A-Z_]+$/.test(err.body||'')?err.body:'UPLOAD_REQUEST_FAILED'}),
  onUploadCreate:async(_,upload)=>{
   const c=context.getStore(),m=upload.metadata||{},size=upload.size;
   if(!Number.isSafeInteger(size)||size<1||size>uploadLimit()||!/^[a-f0-9]{64}$/.test(m.sha256||''))throw {status_code:400,body:'UPLOAD_SIZE_OR_SHA256_REQUIRED'};
   const target=guarded(siteRoot(requireSite(c.slug)),m.path||'');if(fs.existsSync(target)&&m.confirm!==m.path)throw {status_code:409,body:'UPLOAD_OVERWRITE_CONFIRM_REQUIRED'};
   const reservations=fs.readdirSync(base).filter(n=>n.endsWith('.mhs.json')).map(n=>readJson(path.join(base,n),null)).filter(r=>r?.phase==='UPLOADING'&&r.updatedAt>Date.now()-TTL);const reserved=reservations.reduce((n,r)=>n+r.size,0);
   if(reservations.length>=8||reserved+size>LIMITS.staging)throw {status_code:429,body:'UPLOAD_STAGING_QUOTA'};requireSpace(DATA,reserved+size*2+LIMITS.chunk);
   atomicJson(meta(upload.id),{id:upload.id,slug:c.slug,owner:c.owner,path:m.path,size,sha256:m.sha256,confirm:m.confirm===m.path,phase:'UPLOADING',updatedAt:Date.now()});
   return {metadata:{path:m.path,sha256:m.sha256}};
  },
  onUploadFinish:async(_,upload)=>{
   const r=readJson(meta(upload.id),null),source=path.join(base,upload.id);
   if(!r||await hashFile(source)!==r.sha256){if(r)atomicJson(meta(upload.id),{...r,phase:'CHECKSUM_FAILED'});throw {status_code:460,body:'UPLOAD_FINAL_CHECKSUM_FAILED'};}
   const root=siteRoot(requireSite(r.slug)),target=guarded(root,r.path),previous=path.join(base,upload.id+'.previous');
   requireSpace(DATA,0);if(fs.existsSync(target)&&(!r.confirm||!fs.lstatSync(target).isFile()))throw {status_code:409,body:'UPLOAD_DESTINATION_CONFLICT'};
   fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});guarded(root,r.path);
   atomicJson(meta(upload.id),{...r,phase:'PREPARED'});
   if(fs.existsSync(target))fs.renameSync(target,previous);
   try{guarded(root,r.path);fs.renameSync(source,target);fs.chmodSync(target,0o600);atomicJson(meta(upload.id),{...r,phase:'DONE',updatedAt:Date.now()});}
   catch(e){if(fs.existsSync(previous)&&!fs.existsSync(target))fs.renameSync(previous,target);throw e;}
   return {headers:{'X-MHS-SHA256':r.sha256}};
  }
 });return server;
}
export function cleanupUploads(now=Date.now()){
 if(!fs.existsSync(base))return {removed:0};let removed=0;
 for(const n of fs.readdirSync(base)){if(!n.endsWith('.mhs.json'))continue;const id=n.slice(0,-9);if(!idOK(id))continue;const r=readJson(path.join(base,n),null);if(!r||r.updatedAt>now-TTL||!['UPLOADING','DONE','CHECKSUM_FAILED'].includes(r.phase))continue;
  for(const file of fs.readdirSync(base))if(file===id||file.startsWith(id+'.')){const f=path.join(base,file);if(fs.lstatSync(f).isFile())fs.unlinkSync(f);}removed++;
 }return {removed};
}
export function pendingUploads(slug,owner){requireSite(slug);if(!fs.existsSync(base))return [];return fs.readdirSync(base).filter(n=>n.endsWith('.mhs.json')).map(n=>readJson(path.join(base,n),null)).filter(r=>r?.slug===slug&&r.owner===owner&&['PREPARED','CHECKSUM_FAILED'].includes(r.phase)).map(({id,path,phase})=>({id,path,phase}));}
export async function recoverUpload(slug,id,owner,confirm){
 if(confirm!==slug||!idOK(id))throw new HttpError(400,'UPLOAD_RECOVERY_CONFIRM_REQUIRED');const r=readJson(meta(id),null);if(!r||r.slug!==slug||r.owner!==owner||r.phase!=='PREPARED')throw new HttpError(409,'UPLOAD_RECOVERY_NOT_AVAILABLE');const target=guarded(siteRoot(requireSite(slug)),r.path),previous=path.join(base,id+'.previous');
 if(fs.existsSync(target)&&fs.lstatSync(target).isFile()&&await hashFile(target)===r.sha256){atomicJson(meta(id),{...r,phase:'DONE',updatedAt:Date.now()});return {ok:true,phase:'DONE'};}
 if(!fs.existsSync(target)&&fs.existsSync(previous)){fs.renameSync(previous,target);atomicJson(meta(id),{...r,phase:'ROLLED_BACK',updatedAt:Date.now()});return {ok:true,phase:'ROLLED_BACK'};}
 throw new HttpError(409,'UPLOAD_RECOVERY_INSPECTION_REQUIRED');
}
export async function handleUpload(req,res,slug,id,owner){
 requireSite(slug);if(!['POST','PATCH','HEAD','DELETE','OPTIONS'].includes(req.method)||id&&!idOK(id)||!id&&['PATCH','HEAD','DELETE'].includes(req.method))throw new HttpError(405,'UPLOAD_METHOD_OR_ID_REFUSED');
 const tus=getServer();if(id){const r=readJson(meta(id),null);if(!r||r.slug!==slug||r.owner!==owner)throw new HttpError(404,'UPLOAD_NOT_FOUND');if(req.method==='HEAD'&&r.phase==='DONE'){res.writeHead(200,{'Tus-Resumable':'1.0.0','Upload-Length':String(r.size),'Upload-Offset':String(r.size),'cache-control':'no-store'});res.end();return;}if(r.phase!=='UPLOADING')throw new HttpError(409,'UPLOAD_ALREADY_COMMITTED_OR_RECOVERY_REQUIRED');}
 if(req.method==='POST'){cleanupUploads();if(id||req.headers['upload-defer-length']||Number(req.headers['content-length']||0)>0)throw new HttpError(400,'UPLOAD_FIXED_LENGTH_REQUIRED');}
 let checksum;if(req.method==='PATCH'){const n=Number(req.headers['content-length']),offset=Number(req.headers['upload-offset']);checksum=String(req.headers['upload-checksum']||'').match(/^sha256 ([A-Za-z0-9+/]{43}=)$/)?.[1];if(!Number.isSafeInteger(n)||n<1||n>LIMITS.chunk||!Number.isSafeInteger(offset)||offset<0||!checksum||String(req.headers['x-mhs-chunk-index'])!==String(Math.floor(offset/LIMITS.chunk)))throw new HttpError(400,'UPLOAD_CHUNK_HEADERS_REQUIRED');}
 res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');
 await context.run({slug,owner,checksum},()=>tus.handle(req,res));
 if(req.method==='DELETE'&&res.statusCode===204)fs.rmSync(meta(id),{force:true});
}
