import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {DATA,TERMUX,atomicJson} from './config.mjs';
import {inside} from './security.mjs';
import {extractZip} from './zip.mjs';
import {requireSite,siteRoot,deployZip} from './sites.mjs';
import {listTables} from './databases.mjs';
const versionOK=v=>typeof v==='string'&&/^\d{1,2}\.\d{1,2}(?:\.\d{1,2})?$/.test(v);
async function official(url,max,fetcher=fetch){
 const u=new URL(url);if(u.protocol!=='https:'||!['api.wordpress.org','downloads.wordpress.org'].includes(u.hostname))throw Error('WORDPRESS_URL_REFUSED');
 const r=await fetcher(url,{signal:AbortSignal.timeout(120000),redirect:'error'});if(!r.ok)throw Error('WORDPRESS_DOWNLOAD_FAILED');
 const chunks=[];let n=0;for await(const d of r.body){n+=d.length;if(n>max)throw Error('WORDPRESS_DOWNLOAD_LIMIT');chunks.push(d);}return Buffer.concat(chunks);
}
export async function wordpressVersions(fetcher=fetch){const v=JSON.parse(await official('https://api.wordpress.org/core/version-check/1.7/?locale=en_US',1024*1024,fetcher));return {versions:[...new Set((v.offers||[]).map(o=>o.version||o.current).filter(versionOK))]};}
export async function verifiedCore(version,fetcher=fetch){
 if(!versionOK(version))throw Error('WORDPRESS_VERSION_INVALID');
 const checks=JSON.parse(await official(`https://api.wordpress.org/core/checksums/1.0/?version=${version}&locale=en_US`,2*1024*1024,fetcher)).checksums;
 if(!checks||typeof checks!=='object'||!checks['wp-settings.php']||!checks['wp-includes/version.php'])throw Error('WORDPRESS_CHECKSUMS_UNAVAILABLE');
 const data=await official(`https://downloads.wordpress.org/release/wordpress-${version}.zip`,64*1024*1024,fetcher),stage=path.join(DATA,'wp-verify-'+crypto.randomUUID());
 try{extractZip(data,stage,{maxFiles:12000,maxTotal:256*1024*1024});const root=path.join(stage,'wordpress');
  for(const [file,hash] of Object.entries(checks)){if(!/^[a-f0-9]{32}$/.test(hash))throw Error('WORDPRESS_CHECKSUM_INVALID');const p=inside(root,file);if(!fs.existsSync(p)||crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex')!==hash)throw Error('WORDPRESS_CORE_CHECKSUM_MISMATCH');}
  return data;
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
}
export async function installWordPress(slug,{version,username,password,email,title,confirm}){
 const site=requireSite(slug);if(site.type!=='wordpress'||confirm!==slug)throw Error('WORDPRESS_CONFIRM_REQUIRED');
 if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username||'')||typeof password!=='string'||password.length<16||password.length>256||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof title!=='string'||title.length<1||title.length>100)throw Error('WORDPRESS_ADMIN_INVALID');
 if((await listTables(site.database)).length)throw Error('WORDPRESS_NONEMPTY_DATABASE_REFUSED');
 if(fs.existsSync(path.join(siteRoot(site),'wp-settings.php')))throw Error('WORDPRESS_EXISTING_CORE_REFUSED');
 const data=await verifiedCore(version);await deployZip(slug,data);
 const file=path.join(import.meta.dirname,'wordpress-install.php');
 await new Promise((resolve,reject)=>{
  const child=spawn(path.join(TERMUX,'bin/php'),[file],{stdio:['pipe','pipe','pipe']});let out='';const timer=setTimeout(()=>{child.kill();reject(Error('WORDPRESS_INSTALL_TIMEOUT'));},60000);
  child.on('error',()=>{clearTimeout(timer);reject(Error('PHP_UNAVAILABLE'));});child.stderr.resume();child.stdout.on('data',d=>{if(out.length<4096)out+=d;});child.stdin.on('error',()=>{});
  child.stdin.end(JSON.stringify({root:siteRoot(site),url:'https://'+site.hostname,username,password,email,title}));
  child.on('close',code=>{clearTimeout(timer);code===0&&out.includes('MHS_WORDPRESS_INSTALLED')?resolve():reject(Error('WORDPRESS_INSTALL_FAILED_REVIEW_PRIVATE_SITE'));});
 });
 atomicJson(path.join(DATA,'wordpress-'+slug+'.json'),{version,installedAt:new Date().toISOString(),checksumSource:'WordPress.org HTTPS core/checksums MD5'});
 return {installed:true,version,url:'https://'+site.hostname,login:'https://'+site.hostname+'/wp-admin/'};
}
