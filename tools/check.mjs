import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const roots=['panel','tools','tests'];let count=0;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else if(/\.(mjs|js)$/.test(p)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr);process.exit(1);}count++;}}}
for(const r of roots)if(fs.existsSync(r))scan(r);console.log(`Syntax PASS: ${count} JavaScript files`);
