import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
export function releasePath(p){return typeof p==='string'&&/^(?:panel|tools|scripts|docs)\/[A-Za-z0-9_./-]+$/.test(p)&&!p.split('/').some(v=>!v||v==='.'||v==='..')||['package.json','README.md','AGENTS.md'].includes(p);}
export function verifyRelease(root){
 const m=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
 if(m.project!=='MHS'||m.schema!==1||!/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(m.version)||!/^([a-f0-9]{40})$/.test(m.commit)||!Array.isArray(m.files)||m.files.length<15||m.files.length>300)throw Error('MHS_RELEASE_INVALID');
 const seen=new Set();for(const f of m.files){if(!releasePath(f.path)||seen.has(f.path)||![0o600,0o700].includes(f.mode)||!/^([a-f0-9]{64})$/.test(f.sha256))throw Error('MHS_RELEASE_PATH_INVALID');seen.add(f.path);let p=root;for(const segment of f.path.split('/')){p=path.join(p,segment);if(fs.lstatSync(p).isSymbolicLink())throw Error('MHS_RELEASE_SYMLINK_REFUSED');}if(!fs.statSync(p).isFile()||sha256(fs.readFileSync(p))!==f.sha256)throw Error('MHS_RELEASE_CHECKSUM_FAILED');}
 for(const file of ['package.json','panel/src/server.mjs','tools/install.mjs','tools/cli.mjs','scripts/boot.sh'])if(!seen.has(file))throw Error('MHS_RELEASE_INCOMPLETE');
 const walk=(dir,rel='')=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=rel?rel+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('MHS_RELEASE_SYMLINK_REFUSED');if(e.isDirectory())walk(path.join(dir,e.name),name);else if(name!=='release.json'&&!seen.has(name))throw Error('MHS_RELEASE_UNEXPECTED_FILE');}};walk(root);
 return m;
}
export function copyRelease(source,base){const m=verifyRelease(source),target=path.join(base,m.version+'-'+m.commit.slice(0,12));fs.mkdirSync(base,{recursive:true,mode:0o700});if(fs.existsSync(target)){verifyRelease(target);return {target,manifest:m};}const stage=target+'.staging';if(fs.existsSync(stage)){if(fs.lstatSync(stage).isSymbolicLink())throw Error('MHS_STAGE_SYMLINK_REFUSED');}fs.mkdirSync(stage,{recursive:true,mode:0o700});for(const f of [...m.files,{path:'release.json',mode:0o600}]){const dest=path.join(stage,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,f.path),dest);fs.chmodSync(dest,f.mode||0o600);}verifyRelease(stage);fs.renameSync(stage,target);return {target,manifest:m};}
export function switchCurrent(base,target){const releases=path.resolve(base,'releases'),resolved=fs.realpathSync(target);if(!resolved.startsWith(releases+path.sep))throw Error('MHS_RELEASE_TARGET_REFUSED');const current=path.join(base,'current'),next=path.join(base,'current-next');if(fs.existsSync(next))fs.unlinkSync(next);fs.symlinkSync(resolved,next,process.platform==='win32'?'junction':'dir');if(process.platform==='win32'&&fs.existsSync(current))fs.unlinkSync(current);fs.renameSync(next,current);}
