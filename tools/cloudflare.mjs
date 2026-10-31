import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DATA,TERMUX,assertStandalone,atomicJson,readJson,registry} from '../panel/src/config.mjs';
import {writeService,quote} from '../panel/src/system.mjs';
import {validApplication,PORTS} from '../panel/src/remote-access.mjs';
import {ask} from './input.mjs';
const file=path.join(DATA,'remote-access.json');
function validate(panel,monitor){
 if(!validApplication(panel)||monitor&&(!validApplication(monitor)||monitor.hostname===panel.hostname||monitor.audience===panel.audience||monitor.ownerEmail!==panel.ownerEmail))throw Error('INVALID_ACCESS_CONFIG');
 for(const s of registry().sites)if([panel.hostname,monitor?.hostname].includes(s.hostname))throw Error('ACCESS_HOSTNAME_CONFLICTS_WITH_WEBSITE');
}
export function configureAccess(panel){assertStandalone();validate(panel);atomicJson(file,{schema:2,panel});return {configured:true};}
export function routePlan(panel,monitor){validate(panel,monitor);return {project:'MHS',schema:1,manualCloudflareChangesRequired:true,cloudflareApplied:false,
 routes:[{hostname:panel.hostname,service:'http://127.0.0.1:'+PORTS.panel,accessRequired:true,surface:'panel'},...(monitor?[{hostname:monitor.hostname,service:'http://127.0.0.1:'+PORTS.monitor,accessRequired:true,surface:'monitor'}]:[]),...registry().sites.map(s=>({hostname:s.hostname,service:'http://127.0.0.1:8080',accessRequired:false,surface:'website'}))],
 forbiddenPublicPorts:[9090,9091,3306,8022],hostHeader:'Preserve exact public hostname; never override to localhost',newMhsResourcesOnly:true};}
export function configureRemote(panel,monitor){assertStandalone();validate(panel,monitor);if(!monitor)throw Error('MONITOR_ACCESS_REQUIRED');atomicJson(file,{schema:2,panel,monitor});const plan=routePlan(panel,monitor);atomicJson(path.join(DATA,'cloudflare-route-plan.json'),plan);return plan;}
export function configureConnector(token){
 assertStandalone();if(typeof token!=='string'||token.length<100||token.length>4096||!/^[A-Za-z0-9_+/=-]+$/.test(token))throw Error('INVALID_CONNECTOR_TOKEN');
 const dir=path.join(DATA,'cloudflare');fs.mkdirSync(dir,{recursive:true,mode:0o700});const target=path.join(dir,'tunnel-token');fs.writeFileSync(target,token,{mode:0o600});fs.chmodSync(target,0o600);
 writeService('mhs-tunnel',`exec ${quote(path.join(TERMUX,'bin/cloudflared'))} tunnel --no-autoupdate run --token-file ${quote(target)}`);return {configured:true};
}
export async function wizard({input=ask,print=console.log}={}){
 assertStandalone();print('Cấu hình MHS riêng: không dùng Tunnel/hostname đang phục vụ MHC hoặc production.');
 print('Bạn cần tạo 2 ứng dụng Access (Panel và Monitor), mỗi app Allow đúng email chủ máy; không Everyone/Bypass. Không cần API token.');
 if(await input('Nhập MHS để xác nhận tài nguyên riêng: ')!=='MHS')throw Error('CANCELLED');
 const ownerEmail=(await input('Email chủ thiết bị được phép quản trị/xem Monitor: ')).trim().toLowerCase();
 const teamDomain=(await input('Team domain (...cloudflareaccess.com): ')).trim().toLowerCase();
 const panel={hostname:(await input('Hostname Panel mới (ví dụ panel.example.com): ')).trim().toLowerCase(),teamDomain,audience:(await input('Application AUD của Panel: ')).trim(),ownerEmail};
 const monitor={hostname:(await input('Hostname Monitor mới (ví dụ monitor.example.com): ')).trim().toLowerCase(),teamDomain,audience:(await input('Application AUD riêng của Monitor: ')).trim(),ownerEmail};
 validate(panel,monitor);
 const tokenFile=path.join(DATA,'cloudflare/tunnel-token'),oldToken=fs.existsSync(tokenFile);
 const token=await input(oldToken?'Tunnel connector token (ẩn, để trống giữ token hiện có): ':'Tunnel connector token MHS mới (ẩn): ',{secret:true});
 if(!token&&!oldToken)throw Error('CONNECTOR_TOKEN_REQUIRED');
 if(token&&(token.length<100||token.length>4096||!/^[A-Za-z0-9_+/=-]+$/.test(token)))throw Error('INVALID_CONNECTOR_TOKEN');
 // Save only after all user input/validation. Keep previous config for local rollback.
 if(fs.existsSync(file))fs.copyFileSync(file,path.join(DATA,'remote-access.previous.json'));if(fs.existsSync(path.join(DATA,'remote-access.previous.json')))fs.chmodSync(path.join(DATA,'remote-access.previous.json'),0o600);
 if(token)configureConnector(token);const plan=configureRemote(panel,monitor);
 print('Đã lưu cấu hình private tại máy. Chưa tạo/sửa DNS, Tunnel route hoặc Access trên Cloudflare.');
 for(const r of plan.routes)print(`${r.hostname} → ${r.service}${r.accessRequired?' — Access Allow email chủ máy + Protect with Access':''}`);
 print('KHÔNG publish9090/9091/3306/8022. Giữ Host header theo đúng hostname, không override localhost.');
 print('Trong Tunnel MHS hiện có → Published application routes: thêm đúng các route trên. Access app của mỗi hostname dùng đúng AUD riêng.');
 print('Chạy: mhs service mhs-tunnel up ; mhs doctor . Không cần restart Panel sau thay Access config.');
 print('Panel Internet: chỉ đăng nhập Access. Local9090: mật khẩu Admin. Monitor Internet: Access riêng, không cần phiên Panel.');
 return {configured:true,cloudflareApplied:false,manualStepsRequired:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)wizard().catch(()=>{console.error('MHS_CLOUDFLARE_SETUP_FAILED (token không được in ra)');process.exitCode=1;});
