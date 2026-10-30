import fs from 'node:fs';
import path from 'node:path';
import {DATA} from './config.mjs';
export async function withOperation(fn){
 const file=path.join(DATA,'operation.lock');
 try{const fd=fs.openSync(file,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({project:'MHS',pid:process.pid}));fs.closeSync(fd);}
 catch(e){if(e.code!=='EEXIST')throw e;let old;try{old=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('MHS_OPERATION_LOCK_INVALID');}if(old.project!=='MHS'||!Number.isSafeInteger(old.pid)||old.pid<1)throw Error('MHS_OPERATION_LOCK_INVALID');let alive=true;try{process.kill(old.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}if(alive)throw Error('MHS_OPERATION_BUSY');fs.unlinkSync(file);return withOperation(fn);}
 try{return await fn();}finally{fs.unlinkSync(file);}
}
