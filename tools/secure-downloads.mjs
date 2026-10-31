import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DATA,NGINX,registry,atomicJson} from '../panel/src/config.mjs';
import {NGINX_UPLOAD_DENY} from '../panel/src/file-policy.mjs';
import {reloadNginx} from '../panel/src/system.mjs';
export async function secureDownloads({reload=reloadNginx}={}){
 const r=registry(),changes=[],anchor='location ~ /\\. { deny all; }\n';
 for(const s of r.sites){const file=path.join(NGINX,s.slug+'.conf');if(!fs.existsSync(file))throw Error('MHS_NGINX_SITE_CONFIG_MISSING');const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('MHS_NGINX_SITE_CONFIG_REFUSED');const old=fs.readFileSync(file,'utf8');if(old.includes(NGINX_UPLOAD_DENY))continue;if(!old.includes(anchor))throw Error('MHS_NGINX_UPLOAD_GUARD_REVIEW_REQUIRED');changes.push({file,old,next:old.replace(anchor,anchor+NGINX_UPLOAD_DENY),slug:s.slug});}
 if(!changes.length)return {changed:0};const backup=path.join(DATA,'config-safety',crypto.randomUUID());fs.mkdirSync(backup,{recursive:true,mode:0o700});for(const change of changes)fs.writeFileSync(path.join(backup,change.slug+'.conf'),change.old,{mode:0o600});
 const journal=path.join(backup,'manifest.json');atomicJson(journal,{project:'MHS',phase:'PREPARED',sites:changes.map(c=>c.slug)});
 try{for(const c of changes)fs.writeFileSync(c.file,c.next,{mode:0o600});if(r.nginxIntegrated)await reload();atomicJson(journal,{project:'MHS',phase:'DONE',sites:changes.map(c=>c.slug)});return {changed:changes.length,scope:'OWNED_NGINX_TRANSFER_DOWNLOAD_DENY_ONLY'};}
 catch(e){for(const c of changes)fs.writeFileSync(c.file,c.old,{mode:0o600});if(r.nginxIntegrated)await reload().catch(()=>{});atomicJson(journal,{project:'MHS',phase:'ROLLED_BACK',sites:changes.map(c=>c.slug)});throw e;}
}
