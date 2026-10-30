import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {pathToFileURL} from 'node:url';
// Standalone bootstrap decoder: builtin modules only; embedded into pinned bootstrap.
export function extractSource(archive,target){
 const raw=fs.readFileSync(archive);if(raw.length>16*1024*1024)throw Error('MHS_SOURCE_SIZE_LIMIT');
 const lines=zlib.gunzipSync(raw,{maxOutputLength:32*1024*1024}).toString('utf8').trimEnd().split('\n'),header=JSON.parse(lines.shift());
 if(header.format!=='MHS_SOURCE_RELEASE'||header.project!=='MHS'||header.schema!==1||!Array.isArray(header.files)||header.files.length>301||header.files.length<16)throw Error('MHS_SOURCE_FORMAT_REFUSED');
 if(fs.existsSync(target)&&fs.readdirSync(target).length)throw Error('MHS_EXTRACT_NONEMPTY_REFUSED');fs.mkdirSync(target,{recursive:true,mode:0o700});if(fs.lstatSync(target).isSymbolicLink())throw Error('MHS_EXTRACT_SYMLINK_REFUSED');
 const map=new Map(header.files.map(f=>[f.path,f]));if(map.size!==header.files.length)throw Error('MHS_SOURCE_DUPLICATE');const seen=new Set();
 for(const line of lines){const v=JSON.parse(line),f=map.get(v.path);if(!f||seen.has(v.path)||!/^files\/[A-Za-z0-9_./-]+$/.test(v.path)||v.path.split('/').some(p=>p==='.'||p==='..')||typeof v.data!=='string'||v.data.length>4*1024*1024)throw Error('MHS_SOURCE_PATH_REFUSED');const data=Buffer.from(v.data,'base64');if(data.length!==f.size||crypto.createHash('sha256').update(data).digest('hex')!==f.sha256)throw Error('MHS_SOURCE_CHECKSUM_FAILED');const file=path.join(target,...v.path.split('/').slice(1));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,data,{mode:0o600,flag:'wx'});seen.add(v.path);}
 if(seen.size!==map.size)throw Error('MHS_SOURCE_INCOMPLETE');return target;
}
if(process.argv[1]&&process.argv[1]!=='-'&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)extractSource(process.argv[2],process.argv[3]);
