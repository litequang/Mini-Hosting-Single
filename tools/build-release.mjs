import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {writeArchive,digest} from '../panel/src/archive.mjs';
const root=path.resolve(import.meta.dirname,'..'),ref=process.argv[2]||'HEAD';
const git=args=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{maxBuffer:8*1024*1024});
const commit=git(['rev-parse',ref+'^{commit}']).toString().trim(),stage=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-release-'));
try{
 const names=git(['ls-tree','-r','--name-only',commit]).toString().trim().split('\n').filter(p=>/^(panel|tools|scripts|docs)\//.test(p)||['package.json','README.md','AGENTS.md'].includes(p)),files=[];
 for(const name of names){const bytes=git(['show',commit+':'+name]),dest=path.join(stage,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);files.push({path:name,sha256:digest(bytes),mode:name.endsWith('.sh')?0o700:0o600});}
 const version=JSON.parse(fs.readFileSync(path.join(stage,'package.json'),'utf8')).version;
 const manifest={project:'MHS',schema:1,version,commit,files};fs.writeFileSync(path.join(stage,'release.json'),JSON.stringify(manifest,null,2)+'\n');
 const entries=[...files.map(f=>f.path),'release.json'].map(p=>{const file=path.join(stage,p),b=fs.readFileSync(file);return {path:'files/'+p,file,size:b.length,sha256:digest(b)};});
 const out=path.join(root,'releases');fs.mkdirSync(out,{recursive:true});const name='mhs-'+version+'.mhs.gz',archive=path.join(out,name);
 if(fs.existsSync(archive))throw Error('MHS_IMMUTABLE_RELEASE_ALREADY_EXISTS_BUMP_VERSION');
 const info=await writeArchive(archive,{project:'MHS',format:'MHS_SOURCE_RELEASE',version,commit},entries);
 const extractor=fs.readFileSync(path.join(stage,'tools/extract-release.mjs'),'utf8');
 const bootstrap=fs.readFileSync(path.join(stage,'scripts/bootstrap.sh.in'),'utf8').replaceAll('@@VERSION@@',version).replaceAll('@@ARCHIVE@@',name).replaceAll('@@SHA256@@',info.sha256).replace('@@EXTRACTOR@@',extractor);
 const bootName='install-'+version+'.sh';fs.writeFileSync(path.join(out,bootName),bootstrap.replaceAll('\r\n','\n'));const bootSha=digest(fs.readFileSync(path.join(out,bootName)));
 fs.writeFileSync(path.join(out,version+'.json'),JSON.stringify({project:'MHS',version,sourceCommit:commit,archive:name,archiveSha256:info.sha256,bootstrap:bootName,bootstrapSha256:bootSha,physicalAcceptance:'NOT_RUN'},null,2)+'\n');
 console.log(JSON.stringify({version,sourceCommit:commit,archive:name,archiveSha256:info.sha256,bootstrap:bootName,bootstrapSha256:bootSha,files:entries.length},null,2));
}finally{fs.rmSync(stage,{recursive:true,force:true});}
