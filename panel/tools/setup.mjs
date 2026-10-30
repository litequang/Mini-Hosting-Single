import fs from 'node:fs';
import path from 'node:path';
import {makePassword,setPassword,configured} from '../src/security.mjs';
import {initialize,DATA} from '../src/config.mjs';
initialize();
if(!fs.existsSync(path.join(DATA,'settings.json')))fs.writeFileSync(path.join(DATA,'settings.json'),JSON.stringify({lanMonitorEnabled:true}),{mode:0o600});
if(!configured()){const password=makePassword();setPassword(password);fs.writeFileSync(path.join(DATA,'initial-password'),password+'\n',{mode:0o600,flag:'wx'});}
console.log('MHS setup ready. Local login: admin. Read your private initial-password file on this device; never paste it into chat.');
