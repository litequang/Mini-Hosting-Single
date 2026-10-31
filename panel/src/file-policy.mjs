import fs from 'node:fs';
import path from 'node:path';
import {inside,cleanRel,HttpError} from './security.mjs';
import {DATA,NGINX,registry} from './config.mjs';
export const MiB=1024*1024;
export const NGINX_UPLOAD_DENY='# MHS private transfer files\nlocation ~* \\.(?:zip|sql|bak|mhs\\.gz)$ { deny all; }\n';
export const LIMITS={file:512*MiB,chunk:8*MiB,expanded:2048*MiB,files:30000,reserve:128*MiB,staging:1024*MiB};
export function requireTransferGuard(slug,rel){if(!/\.(?:zip|sql|bak|mhs\.gz)$/i.test(rel)||!registry().nginxIntegrated)return;let text='';try{text=fs.readFileSync(path.join(NGINX,slug+'.conf'),'utf8');}catch{}if(!text.includes(NGINX_UPLOAD_DENY))throw new HttpError(409,'UPLOAD_NGINX_GUARD_REQUIRED');}
export function publicPath(rel){
 const normalized=cleanRel(rel);
 // sodium_compat's exact public class directory is not a secrets file. Keep all
 // private-name/prefix rules for other entries, including SecretStream-backup.json.
 for(const part of normalized.split('/'))if((part!=='SecretStream'&&/^(?:\.env(?:\..*)?|\.git|\.ssh|\.config|\.cloudflared|\.npmrc|\.netrc|\.pypirc|\.git-credentials|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|.*\.(?:pem|key|p12|pfx)|wp-config\.php|(?:authority|cluster|node-identity|credentials|secrets|tunnel-token|writer-gate).*|\.mhs-.*)$/i.test(part))||/[<>:"|?*\x00-\x1f]/.test(part)||/[. ]$/.test(part))throw new HttpError(403,'PROTECTED_SITE_PATH');
 return normalized;
}
export function guarded(root,rel,{rootAllowed=false}={}){
 const n=publicPath(rel);if(!n&&!rootAllowed)throw new HttpError(400,'SITE_ROOT_OPERATION_REFUSED');
 const resolved=fs.realpathSync(root),base=path.resolve(root),data=path.resolve(DATA);let expected=base;
 if(base===data||base.startsWith(data+path.sep)){if(fs.lstatSync(DATA).isSymbolicLink())throw new HttpError(403,'DATA_SYMLINK_REFUSED');expected=path.resolve(fs.realpathSync(DATA),path.relative(data,base));}
 if((process.platform==='win32'?resolved.toLowerCase():resolved)!==(process.platform==='win32'?expected.toLowerCase():expected))throw new HttpError(403,'SITE_PARENT_SYMLINK_REFUSED');
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
