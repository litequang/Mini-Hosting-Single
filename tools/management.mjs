// Source-upgrade scope: management only, never DB/web/Tunnel.
import fs from 'node:fs';
import path from 'node:path';
import {HOME,TERMUX} from '../panel/src/config.mjs';
import {writeService,quote,cmd} from '../panel/src/system.mjs';
import {configureEntrypoints} from './entrypoints.mjs';
export async function reconcileManagement({run=cmd,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 // Pin every service to the selected release. Older entry guards compare argv
 // with import.meta.url and cannot launch through a symlink named "current".
 const current=fs.realpathSync(path.join(HOME,'.local/share/mhs/current')),monitor=path.join(TERMUX,'var/service/mhs-monitor');
 configureEntrypoints();
 writeService('mhs-panel',`exec ${quote(process.execPath)} ${quote(path.join(current,'panel/src/server.mjs'))}`);
 const separate=fs.existsSync(path.join(current,'panel/src/monitor-server.mjs'));
 const scheduler=fs.existsSync(path.join(current,'tools/scheduler-service.mjs')),schedulerDir=path.join(TERMUX,'var/service/mhs-scheduler');
 if(scheduler){writeService('mhs-scheduler',`exec ${quote(process.execPath)} ${quote(path.join(current,'tools/scheduler-service.mjs'))}`);fs.rmSync(path.join(schedulerDir,'down'),{force:true});for(let i=0;i<40&&!fs.existsSync(path.join(schedulerDir,'supervise/ok'));i++)await pause(250);}
 else if(fs.existsSync(path.join(schedulerDir,'mhs-owned'))){fs.writeFileSync(path.join(schedulerDir,'down'),'');const r=await run(path.join(TERMUX,'bin/sv'),['-w','10','down',schedulerDir],12000);if(!r.ok)throw Error('MHS_SCHEDULER_ROLLBACK_STOP_FAILED');}
 if(separate){
  writeService('mhs-monitor',`exec ${quote(process.execPath)} ${quote(path.join(current,'panel/src/monitor-server.mjs'))}`);
  fs.rmSync(path.join(monitor,'down'),{force:true});
  for(let i=0;i<40&&!fs.existsSync(path.join(monitor,'supervise/ok'));i++)await pause(250);
 }else if(fs.existsSync(path.join(monitor,'mhs-owned'))){
  fs.writeFileSync(path.join(monitor,'down'),'');const r=await run(path.join(TERMUX,'bin/sv'),['-w','10','down',monitor],12000);if(!r.ok)throw Error('MHS_MONITOR_ROLLBACK_STOP_FAILED');
 }
 // Restart Panel first so the old bundled LAN listener releases9091 before Monitor.
 for(const name of ['mhs-panel',...(separate?['mhs-monitor']:[]),...(scheduler?['mhs-scheduler']:[])]){const r=await run(path.join(TERMUX,'bin/sv'),['-w','15','restart',path.join(TERMUX,'var/service',name)],20000);if(!r.ok)throw Error('MHS_MANAGEMENT_RESTART_FAILED');}
}
