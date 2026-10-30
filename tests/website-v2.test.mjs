import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-v2-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const config=await import('../panel/src/config.mjs');config.initialize();const sites=await import('../panel/src/sites.mjs');
test('Website edit validates hostname/port/entry/environment and preserves files',async()=>{
 const s=await sites.addSite({slug:'node-app',hostname:'node.example.com',type:'node',entry:'dist/server.mjs'}),file=path.join(sites.siteRoot(s),s.entry),before=fs.readFileSync(file);
 const next=await sites.updateSite(s.slug,{hostname:'new.example.com',entry:'dist/server.mjs',port:3456,environment:{NODE_ENV:'production',APP_TITLE:'fixture'}});
 assert.equal(next.port,3456);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(config.readJson(path.join(config.DATA,'node-env-node-app.json')),{NODE_ENV:'production',APP_TITLE:'fixture'});
 await assert.rejects(()=>sites.updateSite(s.slug,{port:9090}),/PORT_INVALID/);
 await assert.rejects(()=>sites.updateSite(s.slug,{entry:'../unsafe.mjs'}),/ENTRY_NOT_FOUND/);
 await assert.rejects(()=>sites.updateSite(s.slug,{environment:{NODE_OPTIONS:'--import evil'}}),/NODE_ENV/);
 await sites.addSite({slug:'second-web',hostname:'second.example.com'});await assert.rejects(()=>sites.updateSite(s.slug,{hostname:'second.example.com'}),/DUPLICATE_HOSTNAME/);
});
test('Panel WordPress download uses allowlisted HTTPS, verifies official file map and fails closed',async()=>{
 const {verifiedCore,wordpressVersions}=await import('../panel/src/wordpress.mjs'),{zip}=await import('./helpers.mjs');
 const files={'wp-settings.php':'<?php // fixture','wp-includes/version.php':'<?php // fixture version','index.php':'<?php // fixture index'},checks=Object.fromEntries(Object.entries(files).map(([n,v])=>[n,crypto.createHash('md5').update(v).digest('hex')]));
 const data=zip(Object.fromEntries(Object.entries(files).map(([n,v])=>['wordpress/'+n,v]))),urls=[];
 const fetcher=async url=>{urls.push(url);return new Response(url.includes('version-check')?JSON.stringify({offers:[{version:'6.8.3'}]}):url.includes('checksums')?JSON.stringify({checksums:checks}):data);};
 assert.deepEqual((await wordpressVersions(fetcher)).versions,['6.8.3']);assert.deepEqual(await verifiedCore('6.8.3',fetcher),data);
 assert.ok(urls.every(u=>u.startsWith('https://api.wordpress.org/')||u.startsWith('https://downloads.wordpress.org/')));
 await assert.rejects(()=>verifiedCore('../bad',fetcher),/VERSION_INVALID/);
 const bad=async url=>new Response(url.includes('checksums')?JSON.stringify({checksums:{...checks,'wp-settings.php':'a'.repeat(32)}}):data);
 await assert.rejects(()=>verifiedCore('6.8.3',bad),/CHECKSUM_MISMATCH/);
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
