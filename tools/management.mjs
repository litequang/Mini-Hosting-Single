// Source-upgrade scope: management only, never DB/web/Tunnel.
import fs from 'node:fs';
import path from 'node:path';
import {HOME,TERMUX} from '../panel/src/config.mjs';
import {writeService,quote,cmd} from '../panel/src/system.mjs';
export async function reconcileManagement({run=cmd,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const current=path.join(HOME,'.local/share/mhs/current'),monitor=path.join(TERMUX,'var/service/mhs-monitor');
 const separate=fs.existsSync(path.join(current,'panel/src/monitor-server.mjs'));
 if(separate){
  writeService('mhs-monitor',`exec ${quote(process.execPath)} ${quote(path.join(current,'panel/src/monitor-server.mjs'))}`);
  fs.rmSync(path.join(monitor,'down'),{force:true});
  for(let i=0;i<40&&!fs.existsSync(path.join(monitor,'supervise/ok'));i++)await pause(250);
 }else if(fs.existsSync(path.join(monitor,'mhs-owned'))){
  fs.writeFileSync(path.join(monitor,'down'),'');const r=await run(path.join(TERMUX,'bin/sv'),['-w','10','down',monitor],12000);if(!r.ok)throw Error('MHS_MONITOR_ROLLBACK_STOP_FAILED');
 }
 // Restart Panel first so the old bundled LAN listener releases9091 before Monitor.
 for(const name of ['mhs-panel',...(separate?['mhs-monitor']:[])]){const r=await run(path.join(TERMUX,'bin/sv'),['-w','15','restart',path.join(TERMUX,'var/service',name)],20000);if(!r.ok)throw Error('MHS_MANAGEMENT_RESTART_FAILED');}
}
