import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
export const ROOT=path.resolve(import.meta.dirname,'..');
export const HOME=process.env.MHS_HOME||process.env.HOME||os.homedir();
export const TERMUX=process.env.PREFIX||'/data/data/com.termux/files/usr';
export const DATA=path.resolve(process.env.MHS_DATA||path.join(HOME,'.local/share/mhs/data'));
export const SITES=path.join(DATA,'sites'),TRASH=path.join(DATA,'trash'),BACKUPS=path.join(DATA,'backups');
export const NGINX=path.join(DATA,'nginx/sites'),NGINX_CONFIG=path.join(DATA,'nginx/nginx.conf');
export const REGISTRY=path.join(DATA,'sites.json'),ADMIN=path.join(DATA,'admin.json');
export const SERVICE_DIR=path.join(TERMUX,'var/service'),LOG_DIR=path.join(TERMUX,'var/log/sv');
export const NODE=process.execPath,PORT=Number(process.env.MHS_PORT||9090);
export const SOCKET=path.join(DATA,'mysql/mysql.sock');
export function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
export function atomicJson(file,data){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const tmp=file+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600});fs.chmodSync(tmp,0o600);fs.renameSync(tmp,file);}
export function assertStandalone(){
 const marker=readJson(path.join(DATA,'mhs.json'),null);
 if(marker?.project!=='MHS'||marker.schema!==1)throw Error('MHS_SETUP_REQUIRED');
 for(const f of ['authority.json','authority-enrollment.json','node-identity.json','cluster.json','p33.json'])if(fs.existsSync(path.join(DATA,f)))throw Error('MHS_CLUSTER_IMPORT_REFUSED');
 const r=readJson(REGISTRY,{sites:[]});
 if(!Array.isArray(r.sites)||r.sites.some(s=>s.managedBy!=='MHS'||s.external||s.lease||s.clusterId))throw Error('MHS_FOREIGN_SITE_REFUSED');
}
export function ensureDirs(){assertStandalone();for(const p of [DATA,SITES,TRASH,BACKUPS,NGINX])fs.mkdirSync(p,{recursive:true,mode:0o700});}
export function registry(){assertStandalone();return readJson(REGISTRY,{sites:[],nginxIntegrated:false});}
export function saveRegistry(data){atomicJson(REGISTRY,data);}
export function initialize(){
 for(const p of ['.config/mhc-full-installer','.local/share/mhc-full-installer','android-hosting-panel','mhc-full'])if(fs.existsSync(path.join(HOME,p)))throw Error('MHS_EXISTING_MHC_REFUSED');
 if(fs.existsSync(DATA)&&fs.readdirSync(DATA).length&&!fs.existsSync(path.join(DATA,'mhs.json')))throw Error('MHS_NONEMPTY_DATA_REFUSED');
 const existing=readJson(path.join(DATA,'mhs.json'),null);
 if(existing&&existing.project!=='MHS')throw Error('MHS_FOREIGN_DATA_REFUSED');
 if(!existing)atomicJson(path.join(DATA,'mhs.json'),{project:'MHS',schema:1,createdAt:new Date().toISOString()});
 ensureDirs();
}
