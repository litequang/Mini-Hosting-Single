import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {DATA,HOME,TERMUX,NGINX_CONFIG,SOCKET,readJson as storedJson,assertStandalone} from '../panel/src/config.mjs';
import {config} from '../panel/src/remote-access.mjs';
import {cmd,serviceNames} from '../panel/src/system.mjs';
const packages=['nginx','php','php-fpm','mariadb','termux-services','termux-api','cloudflared','curl','coreutils','util-linux','restic'];
export function httpProbe(port,host,route='/'){
 return new Promise(resolve=>{const q=http.get({host:'127.0.0.1',port,path:route,headers:{host},timeout:2000},r=>{let n=0;r.on('data',d=>{n+=d.length;if(n>65536)q.destroy();});r.on('end',()=>resolve({status:r.statusCode}));});q.on('error',()=>resolve({status:null}));q.on('timeout',()=>{q.destroy();resolve({status:null});});});
}
export async function doctor({run=cmd,probe=httpProbe,loadConfig=config,platform=process.platform}={}){
 const checks=[],add=(id,status,message,action='')=>checks.push({id,status,message,...(action?{action}:{})});
 const readJson=(file,fallback)=>{try{return storedJson(file,fallback);}catch{add('local-json','FAIL','Một file cấu hình/journal local không đọc được; giữ nguyên để kiểm tra.','Không xóa journal/dữ liệu; dùng bản source và backup hợp lệ.');return fallback;}};
 let validData=false;try{assertStandalone();validData=true;add('mhs-data','PASS','Dữ liệu/marker MHS độc lập hợp lệ.');}catch{add('mhs-data','FAIL','Chưa có MHS hoặc marker/site không hợp lệ.','Dùng bộ cài MHS trên Termux sạch; không xóa dữ liệu hosting cũ.');}
 const native=TERMUX==='/data/data/com.termux/files/usr'&&['android','linux'].includes(platform);
 add('termux',native?'PASS':'NOT RUN',native?'Termux prefix hợp lệ.':'Môi trường PC/fixture; không chứng nhận Android.');
 const node=process.versions.node.split('.').map(Number);add('node',node[0]>22||node[0]===22&&node[1]>=16?'PASS':'FAIL','Node.js cần từ22.16.','pkg install nodejs-lts');
 if(native&&validData){
  for(const name of packages){const r=await run('dpkg-query',['-W','-f=${Status}',name],2500,4096);add('package-'+name,r.ok&&r.out==='install ok installed'?'PASS':'FAIL',name,r.ok?'':'Chạy lại bootstrap đúng release để cài thành phần thiếu.');}
  for(const name of serviceNames()){const r=await run(path.join(TERMUX,'bin/sv'),['status',path.join(TERMUX,'var/service',name)],2000,4096),installed=fs.existsSync(path.join(TERMUX,'var/service',name,'mhs-owned'));const optional=name==='mhs-tunnel';add('service-'+name,r.ok&&/^run:/.test(r.out)?'PASS':optional&&!installed?'NOT RUN':'FAIL',r.ok&&/^run:/.test(r.out)?'Dịch vụ đang chạy.':optional&&!installed?'Tunnel chưa cấu hình.':'Dịch vụ chưa chạy hoặc chưa được giám sát.',optional&&!installed?'mhs cloudflare':'Mở lại Termux; kiểm quyền chạy nền; mhs service '+name+' up');}
  const sql=await run(path.join(TERMUX,'bin/mariadb'),['--no-defaults','--protocol=socket','--socket='+SOCKET,'-uroot','-N','-e','SELECT 1'],3000,4096);add('sql-socket',sql.ok&&sql.out==='1'?'PASS':'FAIL','MariaDB Unix socket / SELECT1.','mhs service mhs-db up');
  for(const [id,file,args] of [['nginx-config','nginx',['-t','-p',path.dirname(NGINX_CONFIG)+'/', '-c',NGINX_CONFIG]],['php-config','php-fpm',['-t','-y',path.join(DATA,'php-fpm.conf')]]]){const r=await run(path.join(TERMUX,'bin',file),args,3000,4096);add(id,r.ok?'PASS':'FAIL','Kiểm cú pháp '+file,r.ok?'':'Kiểm cấu hình MHS, không cài đè website.');}
 }else add('native-services','NOT RUN','Packages/runit/Nginx/PHP/SQL chưa kiểm trên Termux thật.');
 const boot=path.join(HOME,'.termux/boot/20-mhs-start');let bootOk=false;try{bootOk=fs.readFileSync(boot,'utf8').includes('# MHS-owned boot');}catch{}
 add('boot-entry',bootOk?'PASS':'FAIL','Termux:Boot entry MHS.',bootOk?'':'Mở Termux:Boot một lần; dùng installer/resume đúng release.');
 const receipt=readJson(path.join(DATA,'boot-last.json'),null);add('boot-invocation',receipt?.project==='MHS'?'PASS':'NOT RUN',receipt?.project==='MHS'?'Có ghi nhận boot/start script; chưa chứng minh reboot thật.':'Chưa có ghi nhận boot script.');
 add('android-reboot','NOT RUN','Quyền Android/Doze và reboot thật cần kiểm trên thiết bị.','Cho pin không hạn chế/autostart Termux + Boot + API; mở app Boot một lần.');
 const install=readJson(path.join(DATA,'install.json'),null);add('install-journal',install?.phase==='INSTALLED'?'PASS':install?'FAIL':'NOT RUN',install?.phase==='INSTALLED'?'Installer đã ghi hoàn tất.':install?'Cài đặt đang gián đoạn.':'Không có journal installer.',install&&install.phase!=='INSTALLED'?'Chạy lại cùng bootstrap release để tiếp tục.':'');
 const upgrade=readJson(path.join(DATA,'upgrade.json'),null);if(upgrade&&!['DONE','ROLLED_BACK'].includes(upgrade.phase))add('upgrade-journal','FAIL','Nâng cấp chưa hoàn tất.','Retry cùng bundle+SHA hoặc mhs rollback; giữ journal.');
 if(fs.existsSync(DATA)){const st=fs.lstatSync(DATA);add('private-data-directory',st.isSymbolicLink()||!st.isDirectory()?'FAIL':platform==='win32'?'NOT RUN':(st.mode&0o077)===0?'PASS':'FAIL','Thư mục dữ liệu phải private0700, không symlink.');}
 const files=['mhs.json','admin.json','initial-password','adminer-key','restic.json','restic-state.json','schedules.json','backup-jobs.json','domain-api.json','domain-state.json','settings.json','databases.json','remote-access.json','remote-access.previous.json','revoked-access.json','cloudflare/tunnel-token',...(fs.existsSync(DATA)?fs.readdirSync(DATA,{withFileTypes:true}):[]).filter(e=>e.isFile()&&/^node-env-.*\.json$/.test(e.name)).map(e=>e.name)];
 for(const name of files){const file=path.join(DATA,name);if(!fs.existsSync(file))continue;const st=fs.lstatSync(file);add('private-'+name.replaceAll('/','-'),st.isSymbolicLink()||!st.isFile()?'FAIL':platform==='win32'?'NOT RUN':(st.mode&0o077)===0?'PASS':'FAIL',platform==='win32'?'POSIX0600 không kiểm trên Windows.':'File private phải là regular file0600.',platform!=='win32'&&(st.mode&0o077)!==0?'Sửa quyền file private trên chính thiết bị; không gửi nội dung.':'');}
 const local=await probe(9090,'127.0.0.1:9090','/api/session');add('local-panel',local.status===200?'PASS':'FAIL','Panel local password9090.','Mở Termux; sv restart "$PREFIX/var/service/mhs-panel"');
 for(const [surface,port] of [['panel',9093],['monitor',9092]]){
  const app=loadConfig(surface),old=fs.existsSync(path.join(DATA,'remote-access.json'));add(surface+'-access-config',app?'PASS':old?'FAIL':'NOT RUN',app?'Exact hostname/team/AUD/owner đã cấu hình.':old?'Access config thiếu/sai schema/quyền hoặc chưa chỉ định owner.':'Chưa cấu hình Access.',app?'':'mhs cloudflare');
  const r=await probe(port,app?.hostname||surface+'.invalid','/');add(surface+'-anonymous-denied',r.status===403?'PASS':'FAIL','Remote listener phải từ chối request không JWT.',r.status===200?'Không publish listener này; kiểm source và mhs doctor.':'Kiểm mhs-panel/mhs-monitor đang chạy.');
  const spoof=await probe(port,'localhost:9090','/api/session');add(surface+'-localhost-host-denied',spoof.status===403?'PASS':'FAIL','Remote listener không chấp nhận Host local.');
 }
 const settings=readJson(path.join(DATA,'settings.json'),{});if(settings.lanMonitorEnabled){const lan=await probe(9091,'127.0.0.1:9091','/api/metrics');add('lan-monitor',lan.status===200?'PASS':'FAIL','LAN Monitor chỉ đọc không đăng nhập.','mhs service mhs-monitor up');}else add('lan-monitor','NOT RUN','LAN Monitor đã tắt trong settings.');
 const route=readJson(path.join(DATA,'cloudflare-route-plan.json'),null);
 if(route){const panel=loadConfig('panel'),monitor=loadConfig('monitor'),remoteRoutes=(Array.isArray(route.routes)?route.routes:[]).filter(r=>['panel','monitor'].includes(r.surface));const unsafe=!Array.isArray(route.routes)||route.routes.some(r=>!/^http:\/\/127\.0\.0\.1:(8080|9092|9093)$/.test(r.service))||remoteRoutes.length!==2||remoteRoutes.some(r=>!r.accessRequired||r.hostname!==(r.surface==='panel'?panel?.hostname:monitor?.hostname)||r.service!==`http://127.0.0.1:${r.surface==='panel'?9093:9092}`);add('local-route-plan',unsafe?'FAIL':'PASS',unsafe?'Plan route sai/không còn khớp config.':'Plan local chỉ Panel9093/Monitor9092/website8080; chưa chứng nhận Cloudflare.',unsafe?'Chạy lại mhs cloudflare; không publish9090/9091.':'');}
 add('cloudflare-live','NOT RUN','Doctor không gọi API tài khoản; chưa xác minh DNS/Access/published routes hoặc phiên Internet thật.','Đối chiếu route plan: Panel9093, Monitor9092, web8080; tuyệt đối không9090/9091.');
 return {project:'MHS',generatedAt:new Date().toISOString(),checks,summary:{PASS:checks.filter(c=>c.status==='PASS').length,FAIL:checks.filter(c=>c.status==='FAIL').length,'NOT RUN':checks.filter(c=>c.status==='NOT RUN').length},physicalVerified:false};
}
