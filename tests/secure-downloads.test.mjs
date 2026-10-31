import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-download-guard-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');const c=await import('../panel/src/config.mjs');c.initialize();const sites=await import('../panel/src/sites.mjs'),{secureDownloads}=await import('../tools/secure-downloads.mjs'),{NGINX_UPLOAD_DENY}=await import('../panel/src/file-policy.mjs');const site=await sites.addSite({slug:'guard-web',hostname:'guard.example.com'}),file=path.join(c.NGINX,site.slug+'.conf');after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('owned Nginx transfer guard migration preserves custom rules, rolls back config on reload error and gates archives',async()=>{
 const fresh=fs.readFileSync(file,'utf8');assert.ok(fresh.includes(NGINX_UPLOAD_DENY));const old=fresh.replace(NGINX_UPLOAD_DENY,'')+'\n# custom setting preserved\n';fs.writeFileSync(file,old);c.saveRegistry({...c.registry(),nginxIntegrated:true});assert.throws(()=>sites.writeSiteFile(site.slug,'private.zip',Buffer.from('fixture')),/GUARD_REQUIRED/);
 await assert.rejects(()=>secureDownloads({reload:async()=>{throw Error('NATIVE_RELOAD_FIXTURE_FAILURE');}}),/RELOAD/);assert.equal(fs.readFileSync(file,'utf8'),old);
 const result=await secureDownloads({reload:async()=>{}});assert.equal(result.changed,1);assert.ok(fs.readFileSync(file,'utf8').endsWith('# custom setting preserved\n'));sites.writeSiteFile(site.slug,'private.zip',Buffer.from('fixture'));assert.equal((await secureDownloads({reload:async()=>{}})).changed,0);
 for(const p of ['server.key','id_ed25519','.npmrc'])assert.throws(()=>sites.writeSiteFile(site.slug,p,Buffer.from('fixture')),/PROTECTED/);
});
