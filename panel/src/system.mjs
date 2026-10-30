import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {HOME,DATA,LOG_DIR,NGINX,NGINX_CONFIG,SERVICE_DIR,TERMUX,registry,SITES,saveRegistry} from './config.mjs';
import {serviceOK,slugOK,hostOK} from './security.mjs';
const exec=promisify(execFile);
export async function cmd(file,args=[],timeout=15000,maxBuffer=1024*1024){
 try{const {stdout,stderr}=await exec(file,args,{timeout,maxBuffer,encoding:'utf8',env:process.env});return {ok:true,out:stdout.trim(),err:stderr.trim()};}
 catch(e){return {ok:false,out:String(e.stdout||'').slice(-2000),err:e.code==='ENOENT'?'NOT_INSTALLED':String(e.stderr||'COMMAND_FAILED').slice(-1000)};}
}
export const serviceNames=()=>['mhs-panel','mhs-nginx','mhs-php','mhs-db','mhs-tunnel',...registry().sites.filter(s=>s.type==='node').map(s=>'mhs-site-'+s.slug)];
export async function shellStatus(name){if(!serviceOK(name))throw Error('SERVICE_NOT_ALLOWED');return cmd(path.join(TERMUX,'bin/sv'),['status',path.join(SERVICE_DIR,name)],2500);}
export async function serviceAction(name,action){if(!serviceNames().includes(name)||name==='mhs-panel'||!['up','down','restart'].includes(action)||!fs.existsSync(path.join(SERVICE_DIR,name,'mhs-owned')))throw Error('SERVICE_ACTION_REFUSED');const down=path.join(SERVICE_DIR,name,'down');if(action==='down')fs.writeFileSync(down,'');else fs.rmSync(down,{force:true});const r=await cmd(path.join(TERMUX,'bin/sv'),['-w','15',action,path.join(SERVICE_DIR,name)],20000);if(!r.ok)throw Error('SERVICE_ACTION_FAILED');return {ok:true};}
export function getLog(name){if(!serviceNames().includes(name))throw Error('SERVICE_NOT_ALLOWED');try{const p=path.join(LOG_DIR,name,'current'),fd=fs.openSync(p,'r');try{const size=fs.fstatSync(fd).size,n=Math.min(size,16000),b=Buffer.alloc(n);fs.readSync(fd,b,0,n,Math.max(0,size-n));return b.toString().replace(/(token|password|authorization|cookie|secret)\s*[:=]\s*\S+/gi,'$1=[REDACTED]');}finally{fs.closeSync(fd);}}catch{return 'LOG_UNAVAILABLE';}}
let lastNet=null,lastCpu=null,statsCache=null,statsPromise=null;
export async function systemStats(){
 if(statsCache&&Date.now()-statsCache.at<5000)return statsCache.value;
 if(statsPromise)return statsPromise;
 statsPromise=collectStats();try{const value=await statsPromise;statsCache={at:Date.now(),value};return value;}finally{statsPromise=null;}
}
async function collectStats(){
 let cpuPct=null,network=null,disk=null;
 try{const v=fs.readFileSync('/proc/stat','utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number),t=v.reduce((a,b)=>a+b,0),idle=v[3]+v[4];if(lastCpu&&t>lastCpu.t)cpuPct=Math.round(100*(1-(idle-lastCpu.idle)/(t-lastCpu.t)));lastCpu={t,idle};}catch{}
 try{let rx=0,tx=0;for(const l of fs.readFileSync('/proc/net/dev','utf8').split('\n').slice(2)){const [n,rest]=l.split(':');if(!rest||n.trim()==='lo')continue;const v=rest.trim().split(/\s+/).map(Number);rx+=v[0];tx+=v[8];}const now=Date.now(),secs=lastNet?(now-lastNet.at)/1000:0;network={rxBytes:rx,txBytes:tx,rxPerSecond:secs?Math.max(0,(rx-lastNet.rx)/secs):null,txPerSecond:secs?Math.max(0,(tx-lastNet.tx)/secs):null};lastNet={rx,tx,at:now};}catch{}
 try{const d=fs.statfsSync(DATA);disk={total:d.blocks*d.bsize,available:d.bavail*d.bsize,used:(d.blocks-d.bfree)*d.bsize};}catch{}
 const services={};await Promise.all(serviceNames().map(async n=>services[n]=await shellStatus(n)));
 const [b,device]=await Promise.all([cmd(path.join(TERMUX,'bin/termux-battery-status'),[],2500,16384),cmd('getprop',['ro.product.model'],1500,2048)]);
 let battery={available:false};try{const v=JSON.parse(b.out);battery={available:true,percentage:Number.isFinite(v.percentage)?v.percentage:null,temperature:Number.isFinite(v.temperature)?v.temperature:null,status:String(v.status||'').slice(0,24)};}catch{}
 return {time:new Date().toISOString(),device:device.ok?device.out.slice(0,80):os.platform(),uptime:os.uptime(),mem:{total:os.totalmem(),available:os.freemem()},disk,cpuPct,network,battery,node:process.version,arch:process.arch,services,sites:registry().sites.length,mode:'SINGLE',clusterRequests:0};
}
export function nginxConf(site){
 if(!slugOK(site.slug)||!hostOK(site.hostname))throw Error('INVALID_SITE');
 const root=path.join(SITES,site.slug,site.type==='node'?'app':'public').replaceAll('\\','/');
 const common=`listen 127.0.0.1:8080;\nserver_name ${site.hostname};\nclient_max_body_size 64m;\nif (-f "${path.join(DATA,'maintenance-'+site.slug).replaceAll('\\','/')}") { return 503; }\nlocation ~ /\\. { deny all; }\n`;
 if(site.type==='node')return `server {\n${common}location / { proxy_pass http://127.0.0.1:${site.port}; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto; proxy_set_header X-Forwarded-For $remote_addr; }\n}\n`;
 if(['php','wordpress'].includes(site.type))return `server {\n${common}root "${root}";\nindex index.php index.html;\nlocation / { try_files $uri $uri/ /index.php?$args; }\nlocation ~* /(wp-config\\.php|.*\\.sql|.*\\.bak)$ { deny all; }\nlocation ~* /(?:uploads|files)/.*\\.php$ { deny all; }\nlocation ~ \\.php$ { try_files $uri =404; include "${TERMUX}/etc/nginx/fastcgi_params"; fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; fastcgi_param HTTP_PROXY ""; fastcgi_pass unix:${path.join(DATA,'run/php.sock').replaceAll('\\','/')}; }\n}\n`;
 return `server {\n${common}root "${root}";\nindex index.html;\nlocation / { try_files $uri $uri/ /index.html; }\n}\n`;
}
export async function nginxTest(){return cmd(path.join(TERMUX,'bin/nginx'),['-t','-p',path.dirname(NGINX_CONFIG)+'/', '-c',NGINX_CONFIG]);}
export async function reloadNginx(){if(!(await nginxTest()).ok)throw Error('NGINX_CONFIG_FAILED');const r=await cmd(path.join(TERMUX,'bin/nginx'),['-s','reload','-p',path.dirname(NGINX_CONFIG)+'/', '-c',NGINX_CONFIG]);if(!r.ok)throw Error('NGINX_RELOAD_FAILED');return {ok:true};}
export async function regenerateNginx(sites){
 const old=new Map();fs.mkdirSync(NGINX,{recursive:true});const next=sites.map(s=>[s.slug+'.conf',nginxConf(s)]);
 for(const f of fs.readdirSync(NGINX).filter(f=>f.endsWith('.conf')))old.set(f,fs.readFileSync(path.join(NGINX,f)));
 const clear=()=>{for(const f of fs.readdirSync(NGINX).filter(f=>f.endsWith('.conf')))fs.unlinkSync(path.join(NGINX,f));};
 try{clear();for(const [f,v] of next)fs.writeFileSync(path.join(NGINX,f),v,{mode:0o600});if(registry().nginxIntegrated)await reloadNginx();}
 catch(e){clear();for(const [f,v] of old)fs.writeFileSync(path.join(NGINX,f),v);throw e;}
}
export async function integrateNginx(){const r=registry();if(!(await nginxTest()).ok)throw Error('NGINX_CONFIG_FAILED');r.nginxIntegrated=true;saveRegistry(r);return {ok:true};}
export const quote=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
export function writeService(name,command){if(!serviceOK(name))throw Error('SERVICE_NOT_ALLOWED');const dir=path.join(SERVICE_DIR,name);if(fs.existsSync(dir)&&!fs.existsSync(path.join(dir,'mhs-owned')))throw Error('FOREIGN_SERVICE_REFUSED');fs.mkdirSync(path.join(dir,'log'),{recursive:true});fs.writeFileSync(path.join(dir,'mhs-owned'),'MHS\n');for(const [f,v] of [['run',`#!${TERMUX}/bin/sh\nexec 2>&1\n${command}\n`],['log/run',`#!${TERMUX}/bin/sh\nmkdir -p ${quote(path.join(LOG_DIR,name))}\nexec ${quote(path.join(TERMUX,'bin/svlogd'))} -tt ${quote(path.join(LOG_DIR,name))}\n`]]){fs.writeFileSync(path.join(dir,f),v,{mode:0o700});fs.chmodSync(path.join(dir,f),0o700);}return dir;}
export async function createService(site){if(site.type!=='node')return;writeService('mhs-site-'+site.slug,`exec ${quote(process.execPath)} ${quote(path.join(HOME,'.local/share/mhs/current/tools/node-app.mjs'))} ${quote(site.slug)}`);}
export async function removeService(site){if(site.type!=='node')return;await serviceAction('mhs-site-'+site.slug,'down');fs.writeFileSync(path.join(SERVICE_DIR,'mhs-site-'+site.slug,'down'),'');}
