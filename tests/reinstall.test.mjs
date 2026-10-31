import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-reinstall-')),real=path.join(temp,'home-real'),alias=path.join(temp,'home-alias');fs.mkdirSync(real);fs.symlinkSync(real,alias,process.platform==='win32'?'junction':'dir');process.env.MHS_HOME=alias;process.env.MHS_DATA=path.join(alias,'.local/share/mhs/data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const sites=await import('../panel/src/sites.mjs'),reset=await import('../tools/reinstall.mjs');const site=await sites.addSite({slug:'reset-web',hostname:'reset.example.com'});const proof={mode:'s3',repositoryId:'a'.repeat(64),kitExportedAt:'fixture-time',snapshots:[{slug:site.slug,id:'b'.repeat(64)}]};
after(()=>{if(!temp.startsWith(path.join(os.tmpdir(),'mhs-reinstall-')))throw Error('BAD_TEMP');fs.rmSync(temp,{recursive:true,force:true});});
test('trusted parent alias works; symlink site root still cannot cross site; reset requires backup and rejects foreign footprints',async()=>{
 sites.writeSiteFile(site.slug,'note.txt',Buffer.from('preserved'));assert.equal(sites.readFileForSite(site.slug,'note.txt'),'preserved');
 const other=await sites.addSite({slug:'other-web',hostname:'other.example.com'}),root=sites.siteRoot(site),backup=root+'-saved';fs.renameSync(root,backup);fs.symlinkSync(sites.siteRoot(other),root,process.platform==='win32'?'junction':'dir');assert.throws(()=>sites.readFileForSite(site.slug,'index.html'),/SYMLINK/);fs.unlinkSync(root);fs.renameSync(backup,root);
 await assert.rejects(()=>reset.planReinstall(),/EXTERNAL_BACKUP/);fs.mkdirSync(path.join(c.HOME,'apps'));await assert.rejects(()=>reset.planReinstall({prove:async()=>proof}),/FOREIGN/);fs.rmdirSync(path.join(c.HOME,'apps'));assert.equal(sites.readFileForSite(site.slug,'note.txt'),'preserved');
});
test('explicit verified reset quarantines only MHS data, releases moved lock, and undo refuses existing fresh data',async()=>{
 const plan=await reset.planReinstall({prove:async()=>proof});let stopped=[];await assert.rejects(()=>reset.applyReinstall(plan.id,'wrong',{prove:async()=>proof,stop:async names=>stopped=names}),/CONFIRM/);assert.equal(stopped.length,0);
 const applied=await reset.applyReinstall(plan.id,plan.confirmation,{prove:async()=>proof,stop:async names=>stopped=names});assert.equal(applied.noDataDeleted,true);assert.ok(stopped.every(n=>n.startsWith('mhs-')));assert.equal(fs.existsSync(c.DATA),false);const quarantine=path.join(c.HOME,'.local/share/mhs','data-quarantine-'+plan.id);assert.equal(fs.readFileSync(path.join(quarantine,'sites',site.slug,'public/note.txt'),'utf8'),'preserved');assert.equal(fs.existsSync(path.join(quarantine,'operation.lock')),false);
 fs.mkdirSync(c.DATA);await assert.rejects(()=>reset.undoReinstall(plan.id,'RESTORE MHS '+plan.id),/EMPTY_CURRENT_DATA/);fs.rmdirSync(c.DATA);const undone=await reset.undoReinstall(plan.id,'RESTORE MHS '+plan.id);assert.equal(undone.restored,true);assert.equal(sites.readFileForSite(site.slug,'note.txt'),'preserved');
});
