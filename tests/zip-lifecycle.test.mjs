import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-zip-close-'));
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('ZIP extraction awaits its sole descriptor owner on success and rejection, with delayed native close callbacks',()=>{
 const script=`
 import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
 const c=await import(${JSON.stringify(new URL('../panel/src/config.mjs',import.meta.url).href)});c.initialize();
 const {zip}=await import(${JSON.stringify(new URL('./helpers.mjs',import.meta.url).href)}),{extractZipFile}=await import(${JSON.stringify(new URL('../panel/src/zip-stream.mjs',import.meta.url).href)});
 const close=fs.close;let pending=0,calls=0;
 fs.close=(fd,callback)=>{pending++;calls++;setTimeout(()=>close(fd,error=>{pending--;callback(error);}),20);};
 try{for(let i=0;i<12;i++){
  const file=path.join(c.DATA,'archive-'+i+'.zip'),target=path.join(c.DATA,'out-'+i);
  fs.writeFileSync(file,zip(i%2?{'../escape':'bad'}:{'server.cjs':'module.exports=1;','assets/index.js':'asset'}));
  if(i%2)await assert.rejects(()=>extractZipFile(file,target),/path|invalid/i);else {await extractZipFile(file,target);assert.equal(fs.readFileSync(path.join(target,'server.cjs'),'utf8'),'module.exports=1;');}
  assert.equal(pending,0,'extraction returned while an archive descriptor close was still pending');
  const sentinel=fs.openSync(path.join(c.DATA,'sentinel'),'w+');await new Promise(r=>setTimeout(r,30));assert.ok(fs.fstatSync(sentinel).isFile());fs.closeSync(sentinel);
 }
 fs.writeFileSync(path.join(c.DATA,'invalid.zip'),'invalid');await assert.rejects(()=>extractZipFile(path.join(c.DATA,'invalid.zip'),path.join(c.DATA,'invalid')));assert.equal(pending,0);assert.ok(calls>=12);
 console.log('ZIP lifecycle PASS');
 }finally{fs.close=close;}
 `;
 const result=execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,MHS_HOME:path.join(temp,'home'),MHS_DATA:path.join(temp,'data'),PREFIX:path.join(temp,'prefix')},timeout:30000});assert.match(result,/ZIP lifecycle PASS/);
});
