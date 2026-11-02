import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-native-fixes-'));
process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();
const {publicPath}=await import('../panel/src/file-policy.mjs');
const {extractZipFile}=await import('../panel/src/zip-stream.mjs');
const {disableStockServices,nativeDatabase}=await import('../tools/install.mjs');
const {zip}=await import('./helpers.mjs');
test('official sodium_compat SecretStream directories pass streamed ZIP; private lookalikes remain denied',async()=>{
 const files={};for(const core of ['Core','Core32']){const name='wordpress/wp-includes/sodium_compat/src/'+core+'/SecretStream/State.php';assert.equal(publicPath(name),name);files[name]='<?php // public library fixture';}
 const archive=path.join(temp,'wordpress.zip'),stage=path.join(temp,'stage');fs.writeFileSync(archive,zip(files));
 const result=await extractZipFile(archive,stage);assert.equal(result.files,2);
 for(const name of ['secrets.json','SecretStream-backup.json','SecretStream.php','credentials.json','authority.json','node-identity.json','.env','wp-config.php','id_ed25519','../escape'])assert.throws(()=>publicPath(name));
 for(const name of ['SecretStream/secrets.json','SecretStream/wp-config.php','SecretStream/.ssh/id_ed25519'])assert.throws(()=>publicPath(name));
 const bad=path.join(temp,'bad.zip');fs.writeFileSync(bad,zip({'wordpress/SecretStream/secrets.json':'synthetic private'}));await assert.rejects(()=>extractZipFile(bad,path.join(temp,'bad-stage')),/PROTECTED_SITE_PATH/);
});
test('fresh startup stops only supervised stock web services and preserves SSH/user services',async()=>{
 const root=c.SERVICE_DIR;for(const name of ['nginx','php-fpm','mysqld','sshd','custom-app']){fs.mkdirSync(path.join(root,name),{recursive:true});fs.writeFileSync(path.join(root,name,'run'),'# fixture');}
 for(const name of ['nginx','php-fpm']){fs.mkdirSync(path.join(root,name,'supervise'));fs.writeFileSync(path.join(root,name,'supervise/ok'),'fixture');}
 const calls=[];await disableStockServices({run:async(file,args)=>{calls.push({file,args});return {ok:true};}});
 assert.deepEqual(calls.map(v=>path.basename(v.args.at(-1))),['nginx','php-fpm']);assert.ok(calls.every(v=>v.args.slice(0,3).join(' ')==='-w 15 down'));
 for(const name of ['nginx','php-fpm','mysqld'])assert.ok(fs.existsSync(path.join(root,name,'down')));
 for(const name of ['sshd','custom-app'])assert.ok(!fs.existsSync(path.join(root,name,'down')));
 await assert.rejects(()=>disableStockServices({run:async()=>({ok:false})}),/MHS_STOCK_SERVICE_STOP_FAILED/);
 fs.rmSync(path.join(root,'nginx/down'));fs.mkdirSync(path.join(root,'nginx/down'));await assert.rejects(()=>disableStockServices({run:async()=>({ok:true})}),/MHS_STOCK_SERVICE_PATH_REVIEW_REQUIRED/);
});
test('bootstrap includes GD and non-login boot exports logger environment before starting services',()=>{
 const root=path.resolve(import.meta.dirname,'..'),bootstrap=fs.readFileSync(path.join(root,'scripts/bootstrap.sh.in'),'utf8'),boot=fs.readFileSync(path.join(root,'scripts/boot.sh'),'utf8');
 assert.match(bootstrap,/for package in [^\n]*php-gd/);assert.ok(boot.indexOf('export LOGDIR=')<boot.indexOf('. "$PREFIX/etc/profile.d/start-services.sh"'));
 assert.match(boot,/LOGDIR:-\$PREFIX\/var\/log\/sv/);
});
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
test('Termux fresh MariaDB init uses packaged binary paths and retries without touching an initialized database',async()=>{
 const calls=[],run=async(file,args)=>{calls.push({file,args});return {ok:false};};
 await assert.rejects(()=>nativeDatabase({run}),/MHS_DATABASE_INIT_FAILED_RETRY_SAME_RELEASE/);
 assert.equal(path.basename(calls[0].file),'mariadb-install-db');assert.equal(calls[0].args[0],'--no-defaults');
 assert.ok(!calls[0].args.some(arg=>arg.startsWith('--basedir=')));assert.ok(calls[0].args.includes('--datadir='+path.join(c.DATA,'mysql')));
 await nativeDatabase({run:async()=>{fs.mkdirSync(path.join(c.DATA,'mysql/mysql'));return {ok:true};}});
 await nativeDatabase({run:async()=>{assert.fail('must preserve existing initialized database');}});
});
