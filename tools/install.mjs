import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {HOME,DATA,TERMUX,SOCKET,NGINX_CONFIG,initialize,readJson,atomicJson,registry} from '../panel/src/config.mjs';
import {makePassword,setPassword,configured} from '../panel/src/security.mjs';
import {hostingConfigs} from '../panel/src/hosting.mjs';
import {writeService,quote,cmd} from '../panel/src/system.mjs';
import {copyRelease,switchCurrent,verifyRelease,sha256} from './release.mjs';
import {withOperation} from '../panel/src/operation.mjs';
export const BASE=path.join(HOME,'.local/share/mhs');
export function preflight(){
 for(const name of ['.config/mhc-full-installer','.local/share/mhc-full-installer','android-hosting-panel','.config/mini-hosting-cluster','apps','.nginx','.cloudflared'])if(fs.existsSync(path.join(HOME,name)))throw Error('MHS_EXISTING_HOSTING_REFUSED');
 const stats=fs.statfsSync(fs.existsSync(HOME)?HOME:path.dirname(HOME));
 for(const name of ['amh-panel','mhc-authority-agent','mhc-lab-p33','mini-web','named-tunnel'])if(fs.existsSync(path.join(TERMUX,'var/service',name)))throw Error('MHS_EXISTING_HOSTING_SERVICE_REFUSED');
 const mysql=path.join(TERMUX,'var/lib/mysql');if(fs.existsSync(mysql)&&fs.readdirSync(mysql,{withFileTypes:true}).some(e=>e.isDirectory()&&!['mysql','sys','performance_schema','test'].includes(e.name)))throw Error('MHS_EXISTING_DATABASE_REFUSED');
 const prop=key=>{const r=spawnSync('getprop',[key],{encoding:'utf8',timeout:1200});return r.status===0?r.stdout.trim().slice(0,80):null;};
 let battery={available:false};if(process.platform==='android'){const b=spawnSync(path.join(TERMUX,'bin/termux-battery-status'),[],{encoding:'utf8',timeout:2500,maxBuffer:16384});try{const v=JSON.parse(b.stdout);battery={available:true,percentage:Number.isFinite(v.percentage)?v.percentage:null,temperature:Number.isFinite(v.temperature)?v.temperature:null};}catch{}}
 return {project:'MHS',arch:os.arch(),cpuCores:os.availableParallelism(),model:prop('ro.product.model'),android:prop('ro.build.version.release'),battery,memoryMiB:Math.floor(os.totalmem()/1048576),freeMiB:Math.floor(stats.bavail*stats.bsize/1048576),data:DATA,androidPermissionsVerified:false};
}
export async function configureServices(){
 const source=path.join(BASE,'current');
 writeService('mhs-db',`exec ${quote(path.join(TERMUX,'bin/mariadbd'))} --no-defaults --basedir=${quote(TERMUX)} --datadir=${quote(path.join(DATA,'mysql'))} --socket=${quote(SOCKET)} --skip-networking --skip-name-resolve --pid-file=${quote(path.join(DATA,'run/mariadb.pid'))} --innodb-buffer-pool-size=64M --max-connections=30 --performance-schema=OFF`);
 writeService('mhs-php',`exec ${quote(path.join(TERMUX,'bin/php-fpm'))} -F -y ${quote(path.join(DATA,'php-fpm.conf'))}`);
 writeService('mhs-nginx',`exec ${quote(path.join(TERMUX,'bin/nginx'))} -p ${quote(path.dirname(NGINX_CONFIG)+'/')} -c ${quote(NGINX_CONFIG)} -g 'daemon off;'`);
 writeService('mhs-panel',`exec ${quote(process.execPath)} ${quote(path.join(source,'panel/src/server.mjs'))}`);
 writeService('mhs-monitor',`exec ${quote(process.execPath)} ${quote(path.join(source,'panel/src/monitor-server.mjs'))}`);
 writeService('mhs-scheduler',`exec ${quote(process.execPath)} ${quote(path.join(source,'tools/scheduler-service.mjs'))}`);
 const launcher=path.join(TERMUX,'bin/mhs');if(fs.existsSync(launcher)&&!fs.readFileSync(launcher,'utf8').includes('# MHS-owned launcher'))throw Error('MHS_FOREIGN_LAUNCHER_REFUSED');
 fs.writeFileSync(launcher,`#!${TERMUX}/bin/sh\n# MHS-owned launcher\nexec ${quote(process.execPath)} ${quote(path.join(source,'tools/cli.mjs'))} "$@"\n`,{mode:0o700});fs.chmodSync(launcher,0o700);
 const boot=path.join(HOME,'.termux/boot/20-mhs-start');fs.mkdirSync(path.dirname(boot),{recursive:true,mode:0o700});if(fs.existsSync(boot)&&!fs.readFileSync(boot,'utf8').includes('# MHS-owned boot'))throw Error('MHS_FOREIGN_BOOT_REFUSED');
 fs.writeFileSync(boot,`#!${TERMUX}/bin/bash\n# MHS-owned boot\nexec ${quote(path.join(TERMUX,'bin/bash'))} ${quote(path.join(source,'scripts/boot.sh'))}\n`,{mode:0o700});fs.chmodSync(boot,0o700);
}
async function nativeDatabase(){
 const dir=path.join(DATA,'mysql');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 if(!fs.existsSync(path.join(dir,'mysql'))){const r=await cmd(path.join(TERMUX,'bin/mariadb-install-db'),['--no-defaults','--basedir='+TERMUX,'--datadir='+dir,'--auth-root-authentication-method=normal','--skip-test-db'],120000);if(!r.ok)throw Error('MHS_DATABASE_INIT_FAILED_RETRY_SAME_RELEASE');}
}
async function nativeStart(){
 // Fresh-only installer: prevent unused package defaults from competing for ports.
 for(const name of ['nginx','php-fpm','mysqld']){const dir=path.join(TERMUX,'var/service',name);if(fs.existsSync(dir))fs.writeFileSync(path.join(dir,'down'),'');}
 const r=await cmd(path.join(TERMUX,'bin/bash'),[path.join(BASE,'current/scripts/boot.sh')],120000);if(!r.ok)throw Error('MHS_SUPERVISOR_START_FAILED_RETRY');
}
export async function nativeHealth(){
 for(let i=0;i<30;i++){
  try{const r=await fetch('http://127.0.0.1:9090/api/session',{signal:AbortSignal.timeout(1500)}),d=await r.json();
   const sql=await cmd(path.join(TERMUX,'bin/mariadb'),['--no-defaults','--protocol=socket','--socket='+SOCKET,'-uroot','-N','-e','SELECT 1'],3000);
   const nginx=await cmd(path.join(TERMUX,'bin/nginx'),['-t','-p',path.dirname(NGINX_CONFIG)+'/', '-c',NGINX_CONFIG],3000);
   const php=await cmd(path.join(TERMUX,'bin/sv'),['status',path.join(TERMUX,'var/service/mhs-php')],1500);
   const web=await cmd(path.join(TERMUX,'bin/sv'),['status',path.join(TERMUX,'var/service/mhs-nginx')],1500);
   const probe=await fetch('http://127.0.0.1:8080/__mhs_php_ready',{signal:AbortSignal.timeout(1500)});
   const [sso,monitor]=await Promise.all([fetch('http://127.0.0.1:9093/',{signal:AbortSignal.timeout(1500)}),fetch('http://127.0.0.1:9092/',{signal:AbortSignal.timeout(1500)})]);
   if(r.ok&&d.project==='MHS'&&sql.ok&&sql.out==='1'&&nginx.ok&&php.ok&&/^run:/.test(php.out)&&web.ok&&/^run:/.test(web.out)&&probe.ok&&await probe.text()==='MHS_PHP_READY'&&sso.status===403&&monitor.status===403)return {panel:true,sql:true,nginx:true,php:true,anonymousRemoteDenied:true,remoteAccessVerified:false};
  }catch{}await new Promise(r=>setTimeout(r,500));
 }throw Error('MHS_LOCAL_HEALTH_FAILED');
}
export async function installSource(source,{fixture=false,database=nativeDatabase,start=nativeStart,health=nativeHealth,checkpoint=()=>{}}={}){
 const release=verifyRelease(source),hardware=preflight();if(!fixture&&(!['android','linux'].includes(process.platform)||TERMUX!=='/data/data/com.termux/files/usr'||hardware.freeMiB<3072))throw Error('MHS_FRESH_TERMUX_3GIB_REQUIRED');
 initialize();return withOperation(async()=>{
  const journal=path.join(DATA,'install.json'),old=readJson(journal,null);
  if(old&&old.commit!==release.commit)throw Error('MHS_RESUME_SAME_RELEASE_OR_USE_UPGRADE');
  const j=old||{project:'MHS',schema:1,commit:release.commit,version:release.version,completed:[],phase:'INSTALLING',hardware};
  const save=()=>atomicJson(journal,j);save();
  const stage=async(name,fn)=>{if(j.completed.includes(name))return;j.stage=name;j.phase='INSTALLING';save();try{await fn();checkpoint(name);j.completed.push(name);save();}catch(e){j.phase='INTERRUPTED';j.errorCode=/^MHS_[A-Z0-9_]+$/.test(e.message)?e.message:'MHS_INSTALL_STAGE_FAILED';save();throw e;}};
  await stage('source',async()=>{const {target}=copyRelease(source,path.join(BASE,'releases'));switchCurrent(BASE,target);});
  if(verifyRelease(fs.realpathSync(path.join(BASE,'current'))).commit!==release.commit)throw Error('MHS_CURRENT_SOURCE_CHANGED');
  await stage('admin',async()=>{if(!configured()){const password=makePassword();setPassword(password);fs.writeFileSync(path.join(DATA,'initial-password'),password+'\n',{mode:0o600,flag:'wx'});}if(!fs.existsSync(path.join(DATA,'settings.json')))atomicJson(path.join(DATA,'settings.json'),{lanMonitorEnabled:true});});
  await stage('database',database);
  await stage('config',async()=>{hostingConfigs();});
  await stage('services',configureServices);
  await stage('start',start);
  // Always verify on resume, even if a previous health stage was recorded.
  j.checks=await health();j.phase='INSTALLED';j.stage=null;j.errorCode=null;j.installedAt=new Date().toISOString();save();
  const r=registry();r.nginxIntegrated=true;atomicJson(path.join(DATA,'sites.json'),r);
  return {project:'MHS',version:release.version,sourceCommit:release.commit,phase:j.phase,checks:j.checks,physicalAccepted:false};
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const source=path.resolve(import.meta.dirname,'..');
 (process.argv.includes('--plan')?Promise.resolve(preflight()):installSource(source)).then(v=>console.log(JSON.stringify(v,null,2))).catch(e=>{console.error(/^MHS_[A-Z0-9_]+$/.test(e.message)?e.message:'MHS_INSTALL_FAILED');process.exitCode=1;});
}
