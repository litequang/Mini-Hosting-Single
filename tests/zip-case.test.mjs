import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-zip-case-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const {zip}=await import('./helpers.mjs'),{extractZipFile,zipCaseSensitive}=await import('../panel/src/zip-stream.mjs');after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('media directories preserve case on case-sensitive storage and refuse aliases on insensitive storage',async t=>{
 const file=path.join(temp,'sheets.zip'),out=path.join(temp,'out');fs.writeFileSync(file,zip({'sheets/TVCHH/page.webp':'upper','sheets/tvchh/page.webp':'lower'}));
 if(zipCaseSensitive(c.DATA)){const result=await extractZipFile(file,out);assert.equal(result.files,2);assert.equal(fs.readFileSync(path.join(out,'sheets/TVCHH/page.webp'),'utf8'),'upper');assert.equal(fs.readFileSync(path.join(out,'sheets/tvchh/page.webp'),'utf8'),'lower');t.diagnostic('CASE_SENSITIVE_EXTRACTION_PASS');}
 else {await assert.rejects(()=>extractZipFile(file,out),/COLLISION/);assert.equal(fs.existsSync(out),false);t.diagnostic('CASE_INSENSITIVE_ALIAS_REFUSAL_PASS');}
 assert.ok(!fs.readdirSync(c.DATA).some(n=>n.startsWith('zip-case-')));
});
test('a file cannot become a directory even on a case-sensitive filesystem',async()=>{
 const file=path.join(temp,'type-conflict.zip'),out=path.join(temp,'type-out');fs.writeFileSync(file,zip({'sheets/TVCHH':'file','sheets/TVCHH/page.webp':'child'}));await assert.rejects(()=>extractZipFile(file,out),/DIRECTORY_COLLISION/);assert.equal(fs.existsSync(out),false);
});
