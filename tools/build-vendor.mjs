import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..');
for(const [entry,outfile,platform] of [['tools/vendor-runtime.mjs','panel/vendor/runtime.mjs','node'],['tools/vendor-browser.mjs','panel/public/vendor/browser.mjs','browser'],['tools/vendor-cron.mjs','panel/vendor/cron.mjs','node'],['tools/vendor-cloudflare.mjs','panel/vendor/cloudflare.mjs','node'],['tools/vendor-adminer.mjs','panel/vendor/adminer.mjs','node']]){
 const result=await build({absWorkingDir:root,entryPoints:[entry],outfile,bundle:true,platform,format:'esm',target:platform==='node'?'node22':'es2022',minify:true,legalComments:'eof',metafile:true,...(platform==='node'?{banner:{js:"import {createRequire as mhsCreateRequire} from 'node:module';const require=mhsCreateRequire(import.meta.url);"}}:{})});
 fs.mkdirSync(path.join(root,'docs/vendor'),{recursive:true});
 fs.writeFileSync(path.join(root,'docs/vendor',path.basename(outfile)+'-inputs.json'),JSON.stringify(Object.keys(result.metafile.inputs).sort(),null,2)+'\n');
}
const notices=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const p=path.join(dir,e.name);if(e.isDirectory()){if(e.name.startsWith('@')||!fs.existsSync(path.join(p,'package.json'))){walk(p);continue;}const pkg=JSON.parse(fs.readFileSync(path.join(p,'package.json'),'utf8'));const license=fs.readdirSync(p).find(n=>/^licen[sc]e(?:\..*)?$/i.test(n));notices.push(`\n----- ${pkg.name}@${pkg.version} (${pkg.license||'see upstream'}) -----\n`+(license?fs.readFileSync(path.join(p,license),'utf8'):'See package metadata/upstream license.'));if(fs.existsSync(path.join(p,'node_modules')))walk(path.join(p,'node_modules'));}}}
walk(path.join(root,'node_modules'));fs.writeFileSync(path.join(root,'docs/vendor/THIRD-PARTY-NOTICES.txt'),notices.sort().join('\n'));
console.log('Vendor bundles + third-party notices built (no native runtime binaries).');
