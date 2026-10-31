import fs from 'node:fs';
import path from 'node:path';
import {HOME,DATA,readJson,atomicJson,assertStandalone} from '../panel/src/config.mjs';
import {systemStats,serviceAction} from '../panel/src/system.mjs';
import {withOperation} from '../panel/src/operation.mjs';
import {upgrade,rollback} from './upgrade.mjs';
import {wizard} from './cloudflare.mjs';
import {ask} from './input.mjs';
import {deployZip,requireSite} from '../panel/src/sites.mjs';
import {recoverSiteRestore} from '../panel/src/backups.mjs';
import {doctor} from './doctor.mjs';
import {exportRecoveryKit,importRecoveryKit} from '../panel/src/restic.mjs';
import {configureDomainApi,domains} from '../panel/src/domains.mjs';
async function main(){
 const [action,...args]=process.argv.slice(2);
 if(action==='doctor'){const report=await doctor();if(report.summary.FAIL)process.exitCode=1;return report;}
 if(action==='reset'&&args[0]==='--undo'){const {undoReinstall}=await import('./reinstall.mjs'),confirm=await ask('Nhap RESTORE MHS '+args[1]+': ');return undoReinstall(args[1],confirm);}
 assertStandalone();
 if(action==='nginx'&&args[0]==='secure-uploads'){const {secureDownloads}=await import('./secure-downloads.mjs');return withOperation(()=>secureDownloads());}
 if(action==='reset'){const {planReinstall,applyReinstall}=await import('./reinstall.mjs');if(args[0]==='--plan')return planReinstall();if(args[0]==='--apply'){const confirm=await ask('Can backup ngoai may da kiem + recovery kit. Nhap QUARANTINE MHS '+args[1]+': ');return applyReinstall(args[1],confirm);}throw Error('MHS_RESET_PLAN_FIRST');}
 if(action==='setup'&&args[0]==='first-site'){const slug=await ask('Ma website (vd demo-web): '),hostname=await ask('Hostname rieng (vd demo.example.com): '),type=await ask('Loai static/node/php/wordpress: ');const {addSite}=await import('../panel/src/sites.mjs');const site=await withOperation(()=>addSite({slug,hostname,type}));return {site,next:type==='wordpress'?'Open Panel > Websites > Cai WordPress (DB/config da tao).':'Open Panel > Files to upload prebuilt code, then Domain preview/manual publish.'};}
 if(action==='domain'&&args[0]==='setup'){const accountId=await ask('Account ID: '),zoneId=await ask('Zone ID: '),zone=await ask('Zone (example.com): '),tunnelId=await ask('UUID Tunnel MHS rieng, ten bat dau mhs-: '),apiToken=await ask('API token DNS/Zone/Tunnel gioi han (an): ',{secret:true}),confirm=await ask('Nhap MHS OWNS TUNNEL '+tunnelId+': ');return withOperation(()=>configureDomainApi({accountId,zoneId,zone,tunnelId,apiToken,confirm}));}
 if(action==='domain'&&args[0]==='plan')return withOperation(()=>domains.preview(args[1]));
 if(action==='domain'&&args[0]==='apply'){const confirm=await ask('Thay doi Cloudflare that: nhap hostname trong preview de xac nhan: ');return withOperation(()=>domains.apply(args[1],confirm));}
 if(action==='recovery-kit'){const file=path.resolve(args[1]||'mhs-recovery.encrypted.json');if(!['export','import'].includes(args[0]))throw Error('RECOVERY_KIT_EXPORT_OR_IMPORT');const passphrase=await ask('Mat khau recovery kit (an, it nhat16 ky tu): ',{secret:true});return withOperation(async()=>{if(args[0]==='export'){const kit=exportRecoveryKit(passphrase);fs.writeFileSync(file,JSON.stringify(kit,null,2)+'\n',{mode:0o600,flag:'wx'});return {exported:true,file,encrypted:true};}const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('RECOVERY_KIT_FILE_INVALID');const confirm=await ask('Nhap MHS IMPORT ENCRYPTED RECOVERY (chi config MHS moi): ');return importRecoveryKit(JSON.parse(fs.readFileSync(file,'utf8')),passphrase,confirm);});}
 if(action==='status'||action==='monitor')return systemStats();
 if(action==='service')return withOperation(()=>serviceAction(args[0],args[1]));
 if(action==='cloudflare'||action==='setup'&&args[0]==='remote')return withOperation(()=>wizard());
 if(action==='upgrade')return upgrade(path.resolve(args[0]),args[1]);
 if(action==='rollback')return rollback();
 if(action==='recover-restore'){if(await ask('Type '+args[0]+' to restore original safety backup: ')!==args[0])throw Error('CANCELLED');return withOperation(()=>recoverSiteRestore(args[0],args[0]));}
 if(action==='lan-monitor'){if(!['on','off'].includes(args[0]))throw Error('MHS_MONITOR_ON_OR_OFF_REQUIRED');const file=path.join(DATA,'settings.json');atomicJson(file,{...readJson(file,{}),lanMonitorEnabled:args[0]==='on'});return {saved:true,restart:'mhs service mhs-monitor restart'};}
 if(action==='password'){if(!process.stdout.isTTY)throw Error('MHS_PASSWORD_LOCAL_TTY_REQUIRED');process.stdout.write(fs.readFileSync(path.join(DATA,'initial-password'),'utf8'));return;}
 if(action==='reset-password'){await import('../panel/tools/reset-password.mjs');return;}
 if(action==='recover-deploy'){const slug=args[0],site=requireSite(slug);if(await ask('Type '+slug+' to restore previous code: ')!==slug)throw Error('CANCELLED');return withOperation(async()=>{const file=path.join(DATA,'deploy-'+slug+'.json'),j=readJson(file,null);if(!j||!['PREPARED','OLD_MOVED'].includes(j.phase)||!/^[-a-z0-9.]+$/.test(j.previous||''))throw Error('MHS_NO_PENDING_DEPLOY');const root=path.join(DATA,'sites',slug,site.type==='node'?'app':'public'),prev=path.join(path.dirname(root),j.previous);if(fs.existsSync(prev)){if(fs.existsSync(root))fs.renameSync(root,root+'-recovery-saved-'+Date.now());fs.renameSync(prev,root);}else if(!fs.existsSync(root))throw Error('MHS_DEPLOY_PREVIOUS_MISSING');atomicJson(file,{...j,phase:'ROLLED_BACK'});if(site.type==='node')await serviceAction('mhs-site-'+slug,'up');return {recovered:true,databaseUnchanged:true};});}
 return {usage:['mhs doctor','mhs setup first-site','mhs setup remote','mhs status','mhs service <mhs-name> up|down|restart','mhs cloudflare','mhs domain setup|plan <slug>|apply <plan-id>','mhs recovery-kit export|import <encrypted-file>','mhs password','mhs reset-password','mhs lan-monitor on|off','mhs nginx secure-uploads','mhs reset --plan|--apply <id>|--undo <id>','mhs upgrade <release.mhs.gz> <sha256>','mhs rollback','mhs recover-deploy <slug>'],panel:'http://127.0.0.1:9090',lanMonitor:'http://PHONE_LAN_IP:9091 (read-only, no login)'};
}
main().then(v=>{if(v!==undefined)console.log(JSON.stringify(v,null,2));}).catch(e=>{console.error(/^[A-Z][A-Z0-9_]{2,100}$/.test(e.message)?e.message:'MHS_OPERATION_FAILED');process.exitCode=1;});
