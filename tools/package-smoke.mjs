import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {extractSource} from './extract-release.mjs';
import {verifyRelease,sha256} from './release.mjs';
const file=path.resolve(process.argv[2]),expected=process.argv[3];if(sha256(fs.readFileSync(file))!==expected)throw Error('PACKAGE_SHA_FAILED');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-package-smoke-'));
try{
 const source=extractSource(file,path.join(temp,'source')),manifest=verifyRelease(source);
 process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'home/.local/share/mhs/data');process.env.PREFIX=path.join(temp,'prefix');fs.mkdirSync(path.join(process.env.PREFIX,'bin'),{recursive:true});
 const {installSource}=await import(pathToFileURL(path.join(source,'tools/install.mjs')));
 const result=await installSource(source,{fixture:true,database:async()=>{},start:async()=>{},health:async()=>({fixture:true})});
 if(result.phase!=='INSTALLED'||result.sourceCommit!==manifest.commit)throw Error('PACKAGE_FIXTURE_INSTALL_FAILED');
 if(fs.existsSync(path.join(source,'panel/src/monitor-server.mjs'))){
  const {createPanelServer}=await import(pathToFileURL(path.join(source,'panel/src/server.mjs'))),{createRemoteMonitor}=await import(pathToFileURL(path.join(source,'panel/src/lan-monitor.mjs')));
  for(const server of [createPanelServer({remote:true,readConfig:()=>null}),createRemoteMonitor({readConfig:()=>null})]){await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/session');if(response.status!==403)throw Error('PACKAGE_REMOTE_ANONYMOUS_NOT_DENIED');}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
 }
 console.log(JSON.stringify({result:'PASS',mode:'PC_FIXTURE_ONLY',sourceCommit:manifest.commit,version:manifest.version,files:manifest.files.length,physical:'NOT_RUN'},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
