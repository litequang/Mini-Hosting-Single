import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-service-logs-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const {writeService,stopLegacyLogger}=await import('../panel/src/system.mjs');const {prepareServiceLog,rotateServiceLogs}=await import('../panel/src/service-logs.mjs');after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('fresh owned services retain per-service private logs without a logger child',()=>{
 const dir=writeService('mhs-panel','exec fixture-server'),log=path.join(c.LOG_DIR,'mhs-panel/current');assert.ok(!fs.existsSync(path.join(dir,'log')));assert.ok(fs.existsSync(path.join(dir,'mhs-direct-log')));
 assert.ok(fs.readFileSync(path.join(dir,'run'),'utf8').includes(log));fs.appendFileSync(log,'startup fixture\n');writeService('mhs-panel','exec next-server');assert.equal(fs.readFileSync(log,'utf8'),'startup fixture\n');
 const foreign=path.join(c.SERVICE_DIR,'mhs-monitor');fs.mkdirSync(foreign);assert.throws(()=>writeService('mhs-monitor','fixture'),/FOREIGN_SERVICE_REFUSED/);
});
test('legacy loggers are disabled only for an owned direct-log service after handoff',async()=>{
 const dir=path.join(c.SERVICE_DIR,'mhs-panel'),legacy=path.join(dir,'log');fs.mkdirSync(path.join(legacy,'supervise'),{recursive:true});fs.writeFileSync(path.join(legacy,'supervise/ok'),'fixture');fs.writeFileSync(path.join(legacy,'run'),'legacy fixture logger');
 writeService('mhs-panel','exec next-server');assert.ok(fs.existsSync(path.join(legacy,'down')));const calls=[];await stopLegacyLogger('mhs-panel',{run:async(file,args)=>{calls.push(args);return {ok:true};}});assert.deepEqual(calls,[['-w','5','down',legacy]]);
 await assert.rejects(()=>stopLegacyLogger('mhs-panel',{run:async()=>({ok:false})}),/MHS_LEGACY_LOGGER_STOP_FAILED/);
});
test('bounded rotation preserves active append descriptors and refuses hard-linked log targets',()=>{
 const file=prepareServiceLog('mhs-panel');fs.writeFileSync(file,'0123456789ABCDEF');const fd=fs.openSync(file,'a'),before=fs.statSync(file).ino;
 rotateServiceLogs({limit:8,tail:4});fs.writeSync(fd,'new');fs.closeSync(fd);assert.equal(fs.statSync(file).ino,before);assert.equal(fs.readFileSync(file,'utf8'),'CDEFnew');
 const protectedFile=path.join(temp,'protected-fixture');fs.writeFileSync(protectedFile,'preserve');fs.unlinkSync(file);fs.linkSync(protectedFile,file);assert.throws(()=>prepareServiceLog('mhs-panel'),/MHS_LOG_PATH_REFUSED/);assert.equal(fs.readFileSync(protectedFile,'utf8'),'preserve');
});
