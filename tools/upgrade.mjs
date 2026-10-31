import {secureDownloads} from './secure-downloads.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {HOME,DATA,TERMUX,assertStandalone,readJson,atomicJson} from '../panel/src/config.mjs';
import {withOperation} from '../panel/src/operation.mjs';
import {cmd} from '../panel/src/system.mjs';
import {extractSource} from './extract-release.mjs';
import {verifyRelease,copyRelease,switchCurrent,sha256} from './release.mjs';
import {reconcileManagement} from './management.mjs';
import {httpProbe} from './doctor.mjs';
const base=path.join(HOME,'.local/share/mhs'),journal=path.join(DATA,'upgrade.json');
async function restartPanel(){if(fs.existsSync(path.join(base,'current/tools/secure-downloads.mjs')))await secureDownloads();await reconcileManagement();}
async function panelHealth(){for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:9090/api/session',{signal:AbortSignal.timeout(1000)}),v=await r.json(),current=fs.realpathSync(path.join(base,'current'));if(r.ok&&v.project==='MHS'&&v.version===verifyRelease(current).version){if(fs.existsSync(path.join(current,'panel/src/monitor-server.mjs'))){const [panel,monitor]=await Promise.all([httpProbe(9093,'localhost:9090'),httpProbe(9092,'localhost:9090')]);if(panel.status!==403||monitor.status!==403)throw Error('MHS_REMOTE_NEGATIVE_HEALTH_FAILED');}return;}}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('MHS_UPGRADE_PANEL_HEALTH_FAILED');}
function ownedTarget(target){const p=fs.realpathSync(target);if(!p.startsWith(path.join(base,'releases')+path.sep))throw Error('MHS_UPGRADE_TARGET_REFUSED');verifyRelease(p);return p;}
export async function upgrade(archive,expected,{restart=restartPanel,health=panelHealth,checkpoint=()=>{}}={}){
 assertStandalone();if(!/^[a-f0-9]{64}$/.test(expected)||sha256(fs.readFileSync(archive))!==expected)throw Error('MHS_UPGRADE_ARCHIVE_SHA_FAILED');
 return withOperation(async()=>{
  const old=readJson(journal,null),pending=old&&!['DONE','ROLLED_BACK'].includes(old.phase);
  if(pending&&old.archiveSha!==expected)throw Error('MHS_UPGRADE_RESUME_SAME_ARCHIVE_REQUIRED');
  const stage=path.join(base,'upgrade-stage-'+crypto.randomUUID());fs.mkdirSync(stage,{recursive:true,mode:0o700});
  let j=null;
  try{extractSource(archive,stage);const m=verifyRelease(stage),previous=ownedTarget(pending?old.previous:path.join(base,'current')),{target}=copyRelease(stage,path.join(base,'releases'));
   if(target===previous&&!pending)return {alreadyCurrent:true,version:m.version};
   j=pending?old:{project:'MHS',schema:1,phase:'PREPARED',previous,target,archiveSha:expected,version:m.version,sourceCommit:m.commit,startedAt:new Date().toISOString()};atomicJson(journal,j);
   j.phase='SWITCHING';atomicJson(journal,j);switchCurrent(base,ownedTarget(target));checkpoint('switched');j.phase='VERIFYING';atomicJson(journal,j);await restart();await health();j.phase='DONE';atomicJson(journal,j);return {version:m.version,sourceCommit:m.commit,rollbackAvailable:true};
  }catch(e){if(j){try{switchCurrent(base,ownedTarget(j.previous));await restart();await health();j.phase='ROLLED_BACK';atomicJson(journal,j);}catch{j.phase='ROLLBACK_FAILED';atomicJson(journal,j);throw Error('MHS_UPGRADE_ROLLBACK_FAILED');}}throw e;
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
 });
}
export async function rollback({restart=restartPanel,health=panelHealth}={}){assertStandalone();return withOperation(async()=>{const j=readJson(journal,null);if(!j?.previous||j.project!=='MHS')throw Error('MHS_NO_SOURCE_ROLLBACK');switchCurrent(base,ownedTarget(j.previous));await restart();await health();j.phase='ROLLED_BACK';atomicJson(journal,j);return {rolledBack:true,source:verifyRelease(j.previous).commit,dataUnchanged:true};});}
