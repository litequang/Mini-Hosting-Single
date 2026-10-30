import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {once} from 'node:events';
import {inside} from './security.mjs';
export const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const MAX_FILE=64*1024*1024,MAX_TOTAL=256*1024*1024;
export function treeFiles(root){const out=[];const walk=(rel)=>{for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const r=[rel,e.name].filter(Boolean).join('/');if(e.isSymbolicLink())throw Error('BACKUP_SYMLINK_REFUSED');if(e.isDirectory())walk(r);else if(e.isFile()){if(e.name==='wp-config.php'||e.name==='.env')continue;const file=inside(root,r),st=fs.statSync(file);if(st.size>MAX_FILE)throw Error('BACKUP_FILE_LIMIT');out.push({path:'files/'+r,file,size:st.size,sha256:digest(fs.readFileSync(file))});if(out.length>12000)throw Error('BACKUP_FILE_COUNT');}else throw Error('BACKUP_SPECIAL_FILE_REFUSED');}};walk('');if(out.reduce((n,f)=>n+f.size,0)>MAX_TOTAL)throw Error('BACKUP_TOTAL_LIMIT');return out;}
export async function writeArchive(file,header,entries){
 const out=fs.createWriteStream(file,{mode:0o600,flags:'wx'}),gzip=zlib.createGzip();gzip.pipe(out);let error=null;
 out.on('error',e=>{error=e;gzip.destroy(e);});gzip.on('error',e=>{error=e;out.destroy();});
 const put=async text=>{if(error)throw error;if(!gzip.write(text))await once(gzip,'drain');};
 try{await put(JSON.stringify({...header,format:header.format||'MHS_SITE_BACKUP',schema:1,files:entries.map(({path,size,sha256})=>({path,size,sha256}))})+'\n');
  for(const e of entries){const data=fs.readFileSync(e.file);if(data.length!==e.size||digest(data)!==e.sha256)throw Error('BACKUP_SOURCE_CHANGED');await put(JSON.stringify({path:e.path,data:data.toString('base64')})+'\n');}
  const done=once(out,'finish');gzip.end();await done;if(error)throw error;return {sha256:digest(fs.readFileSync(file)),bytes:fs.statSync(file).size};
 }catch(e){gzip.destroy();out.destroy();throw e;}
}
export async function readArchive(file,target){
 if(fs.statSync(file).size>MAX_TOTAL)throw Error('BACKUP_COMPRESSED_LIMIT');
 const source=fs.createReadStream(file),gunzip=zlib.createGunzip();gunzip.setEncoding('utf8');source.on('error',e=>gunzip.destroy(e));source.pipe(gunzip);
 let pending='',total=0,header=null,expected=new Map(),seen=new Set();fs.mkdirSync(target,{recursive:true,mode:0o700});
 const line=text=>{const v=JSON.parse(text);if(!header){
   if(v.format!=='MHS_SITE_BACKUP'||v.schema!==1||!Array.isArray(v.files)||v.files.length>12001||v.files.length<1)throw Error('BACKUP_FORMAT_REFUSED');
   for(const f of v.files){if(typeof f.path!=='string'||(!f.path.startsWith('files/')&&f.path!=='database.sql')||!Number.isSafeInteger(f.size)||f.size<0||f.size>MAX_FILE||!/^\w{64}$/.test(f.sha256)||expected.has(f.path))throw Error('BACKUP_MANIFEST_INVALID');inside(target,f.path);expected.set(f.path,f);}
   if(v.files.reduce((n,f)=>n+f.size,0)>MAX_TOTAL)throw Error('BACKUP_TOTAL_LIMIT');header=v;return;
  }
  const e=expected.get(v.path);if(!e||seen.has(v.path)||typeof v.data!=='string'||v.data.length>Math.ceil(MAX_FILE/3)*4||v.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(v.data))throw Error('BACKUP_ENTRY_INVALID');
  const data=Buffer.from(v.data,'base64');if(data.length!==e.size||digest(data)!==e.sha256)throw Error('BACKUP_CHECKSUM_FAILED');const dest=inside(target,v.path);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.writeFileSync(dest,data,{mode:0o600,flag:'wx'});seen.add(v.path);
 };
 try{for await(const chunk of gunzip){total+=Buffer.byteLength(chunk);if(total>Math.ceil(MAX_TOTAL*1.5))throw Error('BACKUP_EXPANDED_LIMIT');pending+=chunk;let p;while((p=pending.indexOf('\n'))>=0){line(pending.slice(0,p));pending=pending.slice(p+1);}if(pending.length>90*1024*1024)throw Error('BACKUP_LINE_LIMIT');}
  if(pending||!header||seen.size!==expected.size)throw Error('BACKUP_TRUNCATED');return header;
 }finally{source.destroy();gunzip.destroy();}
}
