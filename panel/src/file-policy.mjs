import fs from 'node:fs';
import path from 'node:path';
import {inside,cleanRel,HttpError} from './security.mjs';
export const MiB=1024*1024;
export const LIMITS={file:512*MiB,chunk:8*MiB,expanded:2048*MiB,files:30000,reserve:128*MiB,staging:1024*MiB};
export function publicPath(rel){
 const normalized=cleanRel(rel);
 for(const part of normalized.split('/'))if(/^(?:\.env(?:\..*)?|\.git|\.ssh|\.config|\.cloudflared|wp-config\.php|(?:authority|cluster|node-identity|credentials|secrets|tunnel-token|writer-gate).*|\.mhs-.*)$/i.test(part)||/[<>:"|?*\x00-\x1f]/.test(part)||/[. ]$/.test(part))throw new HttpError(403,'PROTECTED_SITE_PATH');
 return normalized;
}
export function guarded(root,rel,{rootAllowed=false}={}){
 const n=publicPath(rel);if(!n&&!rootAllowed)throw new HttpError(400,'SITE_ROOT_OPERATION_REFUSED');
 const resolved=fs.realpathSync(root),expected=path.resolve(root);if((process.platform==='win32'?resolved.toLowerCase():resolved)!==(process.platform==='win32'?expected.toLowerCase():expected))throw new HttpError(403,'SITE_PARENT_SYMLINK_REFUSED');
 return inside(root,n);
}
export function freeDisk(dir){const d=fs.statfsSync(dir);return Number(d.bavail)*Number(d.bsize);}
export function requireSpace(dir,bytes,free=freeDisk){if(!Number.isSafeInteger(bytes)||bytes<0||free(dir)<bytes+LIMITS.reserve)throw new HttpError(507,'INSUFFICIENT_DISK_SPACE');}
export function safeOpen(root,rel){const file=guarded(root,rel),fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));try{const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.nlink!==1)throw new HttpError(403,'FILE_LINK_OR_TYPE_REFUSED');if(guarded(root,rel)!==file)throw Error('PATH_CHANGED');return {fd,stat,file};}catch(e){fs.closeSync(fd);throw e;}}
export function walkPublic(root,rel='',{maxBytes=LIMITS.expanded,maxFiles=LIMITS.files}={}){
 const files=[];let bytes=0,count=0;
 function visit(r){if(++count>maxFiles)throw new HttpError(413,'FILE_COUNT_LIMIT');const f=guarded(root,r,{rootAllowed:true}),s=fs.lstatSync(f);if(s.isSymbolicLink()||!s.isDirectory()&&!s.isFile()||s.isFile()&&s.nlink!==1)throw new HttpError(403,'FILE_LINK_OR_TYPE_REFUSED');if(s.isDirectory()){for(const e of fs.readdirSync(f))visit([r,e].filter(Boolean).join('/'));}else{bytes+=s.size;if(bytes>maxBytes)throw new HttpError(413,'FILE_BYTES_LIMIT');files.push({path:r,size:s.size,mtime:s.mtime.toISOString()});}}
 visit(rel);return {files,bytes,count};
}
