import fs from 'node:fs';
import path from 'node:path';
import {LOG_DIR,SERVICE_DIR} from './config.mjs';
import {serviceOK} from './security.mjs';
// Keep per-service logs without a separate long-lived svlogd child for each
// service. Android can terminate background children when the process budget
// is exhausted. Preserve the inode used by the service's append-only fd.
export function prepareServiceLog(name){
 if(!serviceOK(name))throw Error('SERVICE_NOT_ALLOWED');
 const dir=path.join(LOG_DIR,name);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 if(fs.lstatSync(dir).isSymbolicLink())throw Error('MHS_LOG_PATH_REFUSED');
 const file=path.join(dir,'current'),s=fs.lstatSync(file,{throwIfNoEntry:false});
 if(s&&(!s.isFile()||s.isSymbolicLink()||s.nlink!==1))throw Error('MHS_LOG_PATH_REFUSED');
 fs.writeFileSync(file,'',{flag:'a',mode:0o600});fs.chmodSync(file,0o600);return file;
}
export function rotateServiceLogs({limit=2*1024*1024,tail=128*1024}={}){
 if(!fs.existsSync(SERVICE_DIR))return;
 for(const e of fs.readdirSync(SERVICE_DIR,{withFileTypes:true})){
  if(!e.isDirectory()||!fs.existsSync(path.join(SERVICE_DIR,e.name,'mhs-direct-log')))continue;
  const file=prepareServiceLog(e.name),fd=fs.openSync(file,fs.constants.O_RDWR|(fs.constants.O_NOFOLLOW||0));
  try{const s=fs.fstatSync(fd);if(s.size<=limit)continue;const bytes=Buffer.alloc(Math.min(tail,s.size));fs.readSync(fd,bytes,0,bytes.length,s.size-bytes.length);fs.ftruncateSync(fd,0);fs.writeSync(fd,bytes,0,bytes.length,0);}finally{fs.closeSync(fd);}
 }
}
