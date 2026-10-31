import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {DATA,ROOT,SOCKET,registry,saveRegistry} from './config.mjs';
import {databaseCredentials,createDatabase} from './databases.mjs';
import {requireSite} from './sites.mjs';
import {requireSpace,MiB} from './file-policy.mjs';
import {HttpError} from './security.mjs';
import {fastcgi,Busboy} from '../vendor/runtime.mjs';
export function siteDatabase(slug){const site=requireSite(slug);if(!site.database)throw new HttpError(409,'SITE_DATABASE_NOT_CONFIGURED');const credentials=databaseCredentials(site.database);if(!/^mhs_[a-f0-9]{12}$/.test(credentials.user)||!credentials.password)throw new HttpError(403,'SITE_DATABASE_USER_REQUIRED');return {site,credentials};}
export async function attachDatabase(slug,{name,confirm},{create=createDatabase}={}){if(confirm!==slug)throw new HttpError(400,'SITE_DATABASE_CONFIRM_REQUIRED');const site=requireSite(slug);if(site.database)throw new HttpError(409,'SITE_DATABASE_ALREADY_BOUND');if(registry().sites.some(s=>s.database===name))throw new HttpError(409,'DATABASE_ALREADY_BOUND');const result=await create(name);const r=registry();r.sites=r.sites.map(s=>s.slug===slug?{...s,database:name}:s);saveRegistry(r);return {...result,site:slug};}
export async function stageAdminerBody(req){
 const file=path.join(DATA,'adminer-body-'+crypto.randomUUID()),type=String(req.headers['content-type']||'');requireSpace(DATA,65*MiB);let bytes=0,csrf='';
 try{await pipeline(req,new Transform({transform(part,_,cb){bytes+=part.length;if(bytes>65*MiB)return cb(new HttpError(413,'ADMINER_IMPORT_LIMIT_64MIB'));cb(null,part);}}),fs.createWriteStream(file,{flags:'wx',mode:0o600}));
  if(type.startsWith('application/x-www-form-urlencoded')){if(bytes>2*MiB)throw new HttpError(413,'ADMINER_FORM_LIMIT_2MIB');csrf=new URLSearchParams(fs.readFileSync(file,'utf8')).get('_mhs_csrf')||'';}
  else if(type.startsWith('multipart/form-data')){const parser=Busboy({headers:{'content-type':type},limits:{files:1,fileSize:64*MiB,fields:1000,fieldSize:2*MiB,parts:1100}});let invalid=false;parser.on('field',(name,value,info)=>{if(info.valueTruncated)invalid=true;if(name==='_mhs_csrf')csrf=value;});parser.on('file',(_,stream)=>{stream.on('limit',()=>invalid=true);stream.resume();});for(const event of ['filesLimit','fieldsLimit','partsLimit'])parser.on(event,()=>invalid=true);await pipeline(fs.createReadStream(file),parser);if(invalid)throw new HttpError(413,'ADMINER_FORM_LIMIT');}
  else throw new HttpError(400,'ADMINER_FORM_TYPE_REQUIRED');
  return {file,bytes,csrf,type};
 }catch(e){fs.rmSync(file,{force:true});throw e;}
}
export function adminerParams(req,slug,{csrf,principal,body=null}){
 const {site,credentials}=siteDatabase(slug),query=new URL(req.url,'http://local').searchParams;for(const [key,value] of [['db',site.database],['username',credentials.user],['server','localhost']])if(query.has(key)&&query.get(key)!==value)throw new HttpError(403,'SITE_DATABASE_SCOPE_DENIED');
 const keyFile=path.join(DATA,'adminer-key');if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,crypto.randomBytes(32),{flag:'wx',mode:0o600});const key=fs.readFileSync(keyFile),expiry=String(Math.floor(Date.now()/1000)+60),prefix='/api/sites/'+slug+'/database-admin';
 return {GATEWAY_INTERFACE:'CGI/1.1',SERVER_PROTOCOL:'HTTP/1.1',REQUEST_METHOD:req.method,SCRIPT_FILENAME:path.join(ROOT,'tools/adminer.php'),SCRIPT_NAME:prefix,PHP_SELF:prefix,REQUEST_URI:req.url,QUERY_STRING:new URL(req.url,'http://local').search.slice(1),SERVER_NAME:req.headers.host,HTTP_HOST:req.headers.host,HTTPS:req.mhsRemoteAccess?'on':'off',REMOTE_ADDR:'127.0.0.1',REDIRECT_STATUS:'200',CONTENT_TYPE:body?.type||'',CONTENT_LENGTH:String(body?.bytes||0),HTTP_COOKIE:String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>/^(mhsdb_[a-f0-9]{16}|adminer_[a-z_]+)=/.test(v)).join('; '),MHS_DATA:DATA,MHS_SITE:slug,MHS_CSRF:csrf,MHS_PRINCIPAL:principal,MHS_AUTH_EXPIRY:expiry,MHS_AUTH_PROOF:crypto.createHmac('sha256',key).update(slug+':'+expiry+':'+principal).digest('hex'),PHP_VALUE:'display_errors=0\nlog_errors=0\nmemory_limit=64M\npost_max_size=65M\nupload_max_filesize=64M\nmax_execution_time=30'};
}
export async function proxyAdminer(req,res,slug,{csrf,principal,body=null,socket=path.join(DATA,'run/php.sock')}={}){
 const params=adminerParams(req,slug,{csrf,principal,body}),client=fastcgi({sockFile:socket,skipCheckServer:true,maxConns:1,maxReqs:1,mpxsConns:false});await once(client,'ready');
 const upstream=await new Promise((resolve,reject)=>client.request(params,(e,r)=>e?reject(new HttpError(503,'PHP_FPM_UNAVAILABLE')):resolve(r)));upstream.stderr.resume();
 const timer=setTimeout(()=>{upstream.abort();upstream.stdout.destroy(new HttpError(504,'ADMINER_TIMEOUT'));},60000);timer.unref();
 try{if(body)fs.createReadStream(body.file).pipe(upstream.stdin);else upstream.stdin.end();const pieces=[];let bytes=0;for await(const b of upstream.stdout){bytes+=b.length;if(bytes>8*MiB){upstream.abort();throw new HttpError(413,'ADMINER_RESPONSE_LIMIT_USE_BACKUP_EXPORT');}pieces.push(b);}if(upstream.getExitStatus()!==0)throw new HttpError(502,'ADMINER_EXECUTION_FAILED');
  const all=Buffer.concat(pieces),split=all.indexOf('\r\n\r\n');if(split<0||split>65536)throw new HttpError(502,'ADMINER_RESPONSE_INVALID');const lines=all.subarray(0,split).toString('utf8').split('\r\n'),headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'SAMEORIGIN'},prefix='/api/sites/'+slug+'/database-admin';let status=200;
  for(const line of lines){const at=line.indexOf(':');if(at<1)continue;const name=line.slice(0,at).toLowerCase(),value=line.slice(at+1).trim();if(name==='status'){status=Number(value.slice(0,3));continue;}if(name==='location'){if(!value.startsWith('?')&&(!value.startsWith(prefix)||value.startsWith('//')))throw new HttpError(502,'ADMINER_REDIRECT_REFUSED');headers.location=value;status=302;}else if(name==='set-cookie'){const pair=value.split(';')[0];if(!/^(mhsdb_[a-f0-9]{16}|adminer_[a-z_]+)=/.test(pair))continue;(headers['set-cookie']||=[]).push(pair+'; Path='+prefix+'; HttpOnly; SameSite=Strict'+(req.mhsRemoteAccess?'; Secure':''));}else if(['content-type','content-disposition','content-security-policy'].includes(name))headers[name]=value;}
  let content=all.subarray(split+4);if(String(headers['content-type']).includes('text/html')){const token=String(csrf).replace(/[^A-Za-z0-9_-]/g,'');content=Buffer.from(content.toString('utf8').replace(/<form\b[^>]*>/gi,form=>/\bmethod\s*=\s*['"]?post(?:['"\s>])/i.test(form)?form+'<input type="hidden" name="_mhs_csrf" value="'+token+'">':form));}
  headers['content-length']=content.length;res.writeHead(status,headers);res.end(content);
 }finally{clearTimeout(timer);}
}
