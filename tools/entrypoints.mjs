import fs from 'node:fs';
import path from 'node:path';
import {HOME,TERMUX} from '../panel/src/config.mjs';
import {quote} from '../panel/src/system.mjs';
// CLI has no import-main guard; Boot is a shell script. Both must follow the
// current release, while supervised Node entrypoints use resolved release paths.
export function configureEntrypoints(){
 const current=path.join(HOME,'.local/share/mhs/current');
 const files=[
  {file:path.join(TERMUX,'bin/mhs'),marker:'# MHS-owned launcher',shell:'sh',command:`exec ${quote(process.execPath)} ${quote(path.join(current,'tools/cli.mjs'))} "$@"`,error:'MHS_FOREIGN_LAUNCHER_REFUSED'},
  {file:path.join(HOME,'.termux/boot/20-mhs-start'),marker:'# MHS-owned boot',shell:'bash',command:`exec ${quote(path.join(TERMUX,'bin/bash'))} ${quote(path.join(current,'scripts/boot.sh'))}`,error:'MHS_FOREIGN_BOOT_REFUSED'}
 ];
 for(const f of files)if(fs.existsSync(f.file)&&!fs.readFileSync(f.file,'utf8').includes(f.marker))throw Error(f.error);
 for(const f of files){fs.mkdirSync(path.dirname(f.file),{recursive:true,mode:0o700});fs.writeFileSync(f.file,`#!${TERMUX}/bin/${f.shell}\n${f.marker}\n${f.command}\n`,{mode:0o700});fs.chmodSync(f.file,0o700);}
}
