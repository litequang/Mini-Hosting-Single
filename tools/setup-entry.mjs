import path from 'node:path';
import {DATA,readJson,assertStandalone} from '../panel/src/config.mjs';
import {installSource,preflight} from './install.mjs';
import {verifyRelease} from './release.mjs';
import {upgrade} from './upgrade.mjs';
const source=path.resolve(import.meta.dirname,'..');
try{
 preflight();const release=verifyRelease(source),old=readJson(path.join(DATA,'install.json'),null);
 if(old?.phase==='INSTALLED'&&old.commit!==release.commit){assertStandalone();console.log(JSON.stringify(await upgrade(process.argv[2],process.argv[3])));}
 else console.log(JSON.stringify(await installSource(source)));
}catch(e){console.error(/^MHS_[A-Z0-9_]+$/.test(e.message)?e.message:'MHS_SETUP_FAILED_RETRY_SAME_RELEASE');process.exitCode=1;}
