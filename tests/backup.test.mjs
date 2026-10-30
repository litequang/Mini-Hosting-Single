import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-backup-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const sites=await import('../panel/src/sites.mjs'),backups=await import('../panel/src/backups.mjs'),{digest}=await import('../panel/src/archive.mjs');
test('verified per-site file backup/restore, safety archive, checksum denial and upload verification',async()=>{
 const site=await sites.addSite({slug:'backup-web',hostname:'backup.example.com'}),root=sites.siteRoot(site);fs.writeFileSync(path.join(root,'Nội dung.txt'),'Dữ liệu thử nghiệm');
 const shot=await backups.backupSiteArchive(site.slug);assert.equal(shot.verified,true);assert.match(shot.sha256,/^[a-f0-9]{64}$/);
 fs.writeFileSync(path.join(root,'Nội dung.txt'),'Changed');await assert.rejects(()=>backups.restoreSiteArchive(site.slug,shot.file,{confirm:site.slug,sha256:'a'.repeat(64)}),/SHA256/);assert.equal(fs.readFileSync(path.join(root,'Nội dung.txt'),'utf8'),'Changed');
 const restored=await backups.restoreSiteArchive(site.slug,shot.file,{confirm:site.slug,sha256:shot.sha256});assert.ok(restored.safety);assert.equal(fs.readFileSync(path.join(root,'Nội dung.txt'),'utf8'),'Dữ liệu thử nghiệm');
 const upload=path.join(c.DATA,'upload');fs.copyFileSync(backups.backupFile(shot.file),upload);const imported=await backups.importBackup(upload,shot.sha256);assert.equal(imported.verified,true);assert.ok(backups.listBackups().some(b=>b.name===imported.file));
 assert.throws(()=>backups.backupFile('../secret'),/INVALID_BACKUP/);
});
test('SQL adapter fault after mutation rolls back files and SQL, preserves safety evidence',async()=>{
 const site=await sites.addSite({slug:'sql-site',hostname:'sql.example.com',type:'php'});site.database='fixture_db';c.saveRegistry({...c.registry(),sites:c.registry().sites.map(s=>s.slug===site.slug?site:s)});
 let database='CREATE TABLE original_content (id INT);',counter=0,fail=false;const services=[];
 const ops=backups.backupOperations({dump:async()=>{const file='db-fixture_db-'+new Date(Date.now()+(++counter)).toISOString().replace(/[:.]/g,'-')+'.sql';fs.writeFileSync(path.join(c.BACKUPS,file),database);return {file};},restore:async(name,file)=>{database=fs.readFileSync(file,'utf8');if(fail){fail=false;database='PARTIAL';throw Error('SYNTHETIC_IMPORT_FAILURE');}},service:async(name,action)=>services.push([name,action])});
 const shot=await ops.backupSiteArchive(site.slug),root=sites.siteRoot(site),before=fs.readFileSync(path.join(root,'index.php'),'utf8');
 database='CREATE TABLE current_content (id INT);';fs.writeFileSync(path.join(root,'index.php'),'current content');fail=true;
 await assert.rejects(()=>ops.restoreSiteArchive(site.slug,shot.file,{confirm:site.slug,sha256:shot.sha256}),/SYNTHETIC/);
 assert.equal(database,'CREATE TABLE current_content (id INT);');assert.equal(fs.readFileSync(path.join(root,'index.php'),'utf8'),'current content');assert.ok(!fs.existsSync(path.join(c.DATA,'maintenance-'+site.slug)));
 assert.equal(c.readJson(path.join(c.DATA,'restore-'+site.slug+'.json')).phase,'ROLLED_BACK');assert.ok(services.some(([n,a])=>n==='mhs-php'&&a==='down'));
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
