import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DATA,TERMUX,assertStandalone,atomicJson} from '../panel/src/config.mjs';
import {hostOK} from '../panel/src/security.mjs';
import {writeService,quote} from '../panel/src/system.mjs';
import {ask} from './input.mjs';
import {validApplication} from '../panel/src/remote-access.mjs';
export function configureAccess({hostname,teamDomain,audience,ownerEmail}){
 const panel={hostname,teamDomain,audience,ownerEmail};
 assertStandalone();if(!validApplication(panel))throw Error('INVALID_ACCESS_CONFIG');
 atomicJson(path.join(DATA,'remote-access.json'),{schema:2,panel});return {configured:true,hostname};
}
export function configureConnector(token){
 assertStandalone();if(typeof token!=='string'||token.length<100||token.length>4096||!/^[A-Za-z0-9_+/=-]+$/.test(token))throw Error('INVALID_CONNECTOR_TOKEN');
 const dir=path.join(DATA,'cloudflare');fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,'tunnel-token');fs.writeFileSync(file,token,{mode:0o600});fs.chmodSync(file,0o600);
 writeService('mhs-tunnel',`exec ${quote(path.join(TERMUX,'bin/cloudflared'))} tunnel --no-autoupdate run --token-file ${quote(file)}`);return {configured:true};
}
export async function wizard(){
 assertStandalone();console.log('Use a NEW MHS Tunnel and hostname. Do not reuse MHC resources. No API token is required.');
 if(await ask('Confirm separate MHS resources (type MHS): ')!=='MHS')throw Error('CANCELLED');
 const hostname=(await ask('New Panel hostname: ')).trim().toLowerCase(),teamDomain=(await ask('Team domain (...cloudflareaccess.com): ')).trim(),audience=(await ask('Application AUD: ')).trim();
 configureAccess({hostname,teamDomain,audience});
 const token=await ask('New Tunnel connector token (hidden): ',{secret:true});configureConnector(token);
 console.log('Private origin config and connector token saved. Follow docs/CLOUDFLARE.md for Access policy and exact routes. Run mhs service mhs-tunnel up.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)wizard().catch(()=>{console.error('MHS_CLOUDFLARE_SETUP_FAILED (no token printed)');process.exitCode=1;});
