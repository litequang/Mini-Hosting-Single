import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-env-packet-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const c=await import('../panel/src/config.mjs');c.initialize();const {parseNodeEnv,saveNodeEnv,readNodeEnv}=await import('../panel/src/node-env.mjs'),{withSqlPacketBudget}=await import('../panel/src/databases.mjs');after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('dotenv file remains private, supports quoted multiline values and refuses reserved process injection',()=>{
 const text='API_KEY="synthetic-private-key"\nMULTILINE="line one\nline two"\nPORT=7777\n';saveNodeEnv('fixture-node',text);const values=readNodeEnv('fixture-node');assert.equal(values.API_KEY,'synthetic-private-key');assert.equal(values.MULTILINE,'line one\nline two');assert.equal(values.PORT,'7777');assert.throws(()=>parseNodeEnv('NODE_OPTIONS=--import=untrusted'),/RESERVED/);assert.throws(()=>parseNodeEnv('A='+('x'.repeat(65536))),/LIMIT/);assert.deepEqual(saveNodeEnv('fixture-node','API_KEY=replaced'),{saved:true});assert.ok(fs.readdirSync(c.DATA).some(n=>n.startsWith('node-env-before-fixture-node-')));
});
test('large statement packet allowance is bounded, acquired before import and restored after failure',async()=>{
 let current=16*1024*1024;const calls=[];const query=async({input})=>{calls.push(input);if(input.startsWith('SELECT'))return String(current);current=+input.match(/=(\d+)/)[1];};
 await assert.rejects(()=>withSqlPacketBudget(async()=>{assert.equal(current,128*1024*1024);throw Error('fixture import failure');},{query}),/fixture/);assert.equal(current,16*1024*1024);assert.equal(calls.length,3);
 current=256*1024*1024;calls.length=0;assert.equal(await withSqlPacketBudget(async()=>true,{query}),true);assert.equal(current,256*1024*1024);assert.equal(calls.length,1);
});
