import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {URL} from 'node:url';
import {authorizeLocal,authorizeRemote,config,publicStatus} from './remote-access.mjs';
import {pathToFileURL} from 'node:url';
import {PORT,ROOT,DATA,ADMIN,ensureDirs,registry,readJson,atomicJson} from './config.mjs';
import {checkPassword,configured,HttpError,safeText} from './security.mjs';
import {systemStats,shellStatus,serviceAction,getLog,nginxTest,integrateNginx,regenerateNginx,cmd} from './system.mjs';
import {listSites,addSite,updateSite,deleteSite,listFiles,readFileForSite,writeSiteFile,mkdirSite,deleteSiteFile,deployZip,rollbackDeploy,requireSite,siteRoot} from './sites.mjs';
import {siteHealth} from './hosting.mjs';
import {wordpressVersions,installWordPress} from './wordpress.mjs';
import {listDatabases,createDatabase,listTables,backupDatabase,restoreDatabase} from './databases.mjs';
import {listBackups,backupSiteArchive,restoreSiteArchive,recoverSiteRestore,backupFile,importBackup} from './backups.mjs';
import {createLanMonitor} from './lan-monitor.mjs';
import {withOperation} from './operation.mjs';
const PUBLIC=path.join(ROOT,'public');
export function createPanelServer({remote=false,port=PORT,fetcher=fetch,readConfig=config}={}){
const sessions=new Map(),attempts=new Map();let mutations=Promise.resolve();
const sessionName=remote?'__Host-mhs_sso':'mhs_session';
const revokedFile=path.join(DATA,'revoked-access.json');
function isRevoked(hash){const v=readJson(revokedFile,{});return (v[hash]||0)>Date.now();}
function revoke(access){const old=readJson(revokedFile,{}),v=Object.fromEntries(Object.entries(old).filter(([,exp])=>Number.isSafeInteger(exp)&&exp>Date.now()));if(Object.keys(v).length>=2000)throw new HttpError(503,'SSO logout capacity reached');v[access.tokenHash]=access.expires;atomicJson(revokedFile,v);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png'};
const token=()=>crypto.randomBytes(32).toString('base64url');
function send(res,status,data){const out=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','content-length':out.length,'x-content-type-options':'nosniff'});res.end(out);}
function jsonBody(buf){if(!buf.length)return {};try{return JSON.parse(buf.toString('utf8'));}catch{throw new HttpError(400,'Invalid JSON');}}
async function readBody(req,max=30*1024*1024){const parts=[];let size=0;for await(const ch of req){size+=ch.length;if(size>max)throw new HttpError(413,'Upload too large');parts.push(ch);}return Buffer.concat(parts);}
function cookie(req,name){const raw=req.headers.cookie||'';return raw.split(';').map(s=>s.trim()).find(p=>p.startsWith(name+'='))?.slice(name.length+1)||'';}
function auth(req){const id=cookie(req,sessionName),session=sessions.get(id);if(!session)return null;
 if(session.remote!==remote||session.host!==req.headers.host||session.expires<=Date.now()){sessions.delete(id);return null;}
 if(remote){const access=req.mhsAccess;if(session.identity!==access.identity||session.accessHash!==access.tokenHash)return null;}
 else if(session.passwordVersion!==crypto.createHash('sha256').update(fs.readFileSync(ADMIN)).digest('hex'))return null;
 return session;
}
function ssoSession(req,res){let session=auth(req);if(session)return session;if(sessions.size>=2000)throw new HttpError(503,'Session capacity reached');const access=req.mhsAccess,id=token();session={remote:true,host:req.headers.host,identity:access.identity,accessHash:access.tokenHash,csrf:token(),expires:Math.min(Date.now()+1800000,access.expires)};sessions.set(id,session);res.setHeader('set-cookie',sessionCookie(id,req));return session;}
function allowedHttpsHost(req){return req.mhsRemoteAccess===true;}
function sessionCookie(id,req){return `${sessionName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=21600${allowedHttpsHost(req)?'; Secure':''}`;}
function guardOrigin(req){const origin=req.headers.origin;if(remote&&!origin)throw new HttpError(403,'Origin required');if(origin){let u;try{u=new URL(origin);}catch{throw new HttpError(403,'Bad Origin');}const host=String(req.headers.host||'').toLowerCase();const localHttp=(u.protocol==='http:'&&(host===`127.0.0.1:${port}`||host===`localhost:${port}`));const accessHttps=(u.protocol==='https:'&&req.mhsRemoteAccess===true);if(u.host.toLowerCase()!==host||!(localHttp||accessHttps))throw new HttpError(403,'Origin denied');}}
function mutual(req,s){if(!s)throw new HttpError(401,'Please sign in');const given=Buffer.from(String(req.headers['x-csrf-token']||''),'utf8'),expected=Buffer.from(s.csrf,'utf8');if(given.length!==expected.length||!crypto.timingSafeEqual(given,expected))throw new HttpError(403,'Invalid CSRF token');}
function queueMutate(f){const task=mutations.then(()=>withOperation(f));mutations=task.catch(()=>{});return task;}
function prune(){const now=Date.now();for(const [k,s] of sessions)if(s.expires<now)sessions.delete(k);for(const [k,a] of attempts)if(a.until<now-30*60*1000)attempts.delete(k);}
const pruneTimer=setInterval(prune,60000);pruneTimer.unref();
async function api(req,res,url){
 const route=url.pathname,method=req.method;
 if(route==='/api/login'&&method==='POST'){
  if(remote)throw new HttpError(403,'Use Cloudflare Access on the remote Panel');
  guardOrigin(req);const ip=req.socket.remoteAddress||'local',old=attempts.get(ip)||{count:0,until:0};
  if(old.count>=8&&old.until>Date.now())throw new HttpError(429,'Too many attempts, try again later');
  const {username,password}=jsonBody(await readBody(req,8192));
  if(username!=='admin'||typeof password!=='string'||!checkPassword(password)){
   const n=old.until>Date.now()?old.count+1:1;attempts.set(ip,{count:n,until:Date.now()+15*60*1000});throw new HttpError(401,'Wrong username or password');
  }
  attempts.delete(ip);if(sessions.size>=2000)throw new HttpError(503,'Session capacity reached');const id=token();const session={remote:false,passwordVersion:crypto.createHash('sha256').update(fs.readFileSync(ADMIN)).digest('hex'),host:req.headers.host,accessHash:req.mhsRemoteAccess?crypto.createHash('sha256').update(String(req.headers['cf-access-jwt-assertion'])).digest('hex'):null,csrf:token(),expires:Date.now()+6*60*60*1000};sessions.set(id,session);res.setHeader('set-cookie',sessionCookie(id,req));return send(res,200,{user:'admin',csrf:session.csrf});
 }
 const s=remote&&route==='/api/session'&&method==='GET'?ssoSession(req,res):auth(req);
 if(route==='/api/session'&&method==='GET')return send(res,200,{project:'MHS',version:readJson(path.join(ROOT,'../release.json'),{}).version||'dev',loggedIn:!!s,user:s?'admin':null,authMode:remote?'access-sso':'local-password',csrf:s?.csrf||null});
 if(!s)throw new HttpError(401,'Sign in required');
 if(route==='/api/logout'&&method==='POST'){guardOrigin(req);mutual(req,s);if(remote)revoke(req.mhsAccess);sessions.delete(cookie(req,sessionName));res.setHeader('set-cookie',sessionName+'=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(allowedHttpsHost(req)?'; Secure':''));return send(res,200,{ok:true,...(remote?{logoutUrl:req.mhsAccess.logoutUrl}:{})});}
 if(method!=='GET'){guardOrigin(req);mutual(req,s);}
 if(route==='/api/remote-access'&&method==='GET')return send(res,200,publicStatus());
 if(route==='/api/wordpress/versions'&&method==='GET')return send(res,200,await wordpressVersions());
 if(route==='/api/overview'&&method==='GET')return send(res,200,await systemStats());
 if(route==='/api/sites'&&method==='GET')return send(res,200,{sites:listSites()});
 // Direct mutation routes are handled below to guarantee one request body per action.
 if(route==='/api/nginx'&&method==='GET')return send(res,200,{configured:registry().nginxIntegrated,test:await nginxTest()});
 if(route==='/api/nginx/integrate'&&method==='POST')return send(res,200,await queueMutate(()=>integrateNginx()));
 if(route==='/api/services'&&method==='GET'){const status=await systemStats();return send(res,200,{services:status.services});}
 if(route==='/api/databases'&&method==='GET')return send(res,200,{databases:await listDatabases()});
 if(route==='/api/backups'&&method==='GET')return send(res,200,{backups:listBackups()});
 if(route==='/api/backups/upload'&&method==='POST'){
  const file=path.join(DATA,'backup-upload-'+crypto.randomUUID());const out=fs.createWriteStream(file,{mode:0o600,flags:'wx'});let bytes=0;let writeError=null;out.on('error',e=>writeError=e);
  try{for await(const chunk of req){bytes+=chunk.length;if(bytes>256*1024*1024)throw new HttpError(413,'BACKUP_UPLOAD_LIMIT');if(writeError)throw writeError;if(!out.write(chunk))await once(out,'drain');}const done=once(out,'finish');out.end();await done;return send(res,201,await queueMutate(()=>importBackup(file,url.searchParams.get('sha256'))));}finally{out.destroy();fs.rmSync(file,{force:true});}
 }
 if(route==='/api/backups/download'&&method==='GET'){
  const file=backupFile(url.searchParams.get('name')||'');res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':`attachment; filename="${path.basename(file)}"`,'cache-control':'no-store'});fs.createReadStream(file).pipe(res);return;
 }
 if(route==='/api/domains'&&method==='GET')return send(res,200,{sites:listSites().map(x=>({hostname:x.hostname,serviceUrl:'http://127.0.0.1:8080'})),manual:true});
 const m=route.match(/^\/api\/(sites|files|services|databases)\/([a-zA-Z0-9_-]+)(?:\/(.*))?$/);
 if(m){const [,kind,name,action='']=m;
  if(kind==='sites'){
   if(!action&&method==='PATCH'){const b=jsonBody(await readBody(req,128*1024));return send(res,200,await queueMutate(()=>updateSite(name,b)));}
   if(action==='wordpress'&&method==='POST'){const b=jsonBody(await readBody(req,8192));return send(res,200,await queueMutate(()=>installWordPress(name,b)));}
   if(!action&&method==='DELETE'){const {confirm}=jsonBody(await readBody(req,4096));if(confirm!==name)throw new HttpError(400,'Confirmation mismatch');return send(res,200,await queueMutate(()=>deleteSite(name)));}
   if(action==='zip'&&method==='POST'){const buf=await readBody(req,64*1024*1024);return send(res,200,await queueMutate(()=>deployZip(name,buf,req.headers['x-content-sha256']||null)));}
   if(action==='rollback'&&method==='POST'){const b=jsonBody(await readBody(req,4096));if(b.confirm!==name)throw new HttpError(400,'Confirmation mismatch');return send(res,200,await queueMutate(()=>rollbackDeploy(name)));}
   if(action==='health'&&method==='GET')return send(res,200,await siteHealth(requireSite(name)));
   if(action==='backup'&&method==='POST')return send(res,200,await queueMutate(()=>backupSiteArchive(name)));
   if(action==='restore'&&method==='POST'){const b=jsonBody(await readBody(req,4096));return send(res,200,await queueMutate(()=>restoreSiteArchive(name,b.backup,b)));}
   if(action==='recover-restore'&&method==='POST'){const b=jsonBody(await readBody(req,4096));return send(res,200,await queueMutate(()=>recoverSiteRestore(name,b.confirm)));}
  }
  if(kind==='files'){
   const rel=url.searchParams.get('path')||'';
   if(action==='list'&&method==='GET')return send(res,200,{files:listFiles(name,rel)});
   if(action==='read'&&method==='GET')return send(res,200,{text:readFileForSite(name,rel)});
   if(action==='write'&&method==='PUT'){const buf=await readBody(req,20*1024*1024);return send(res,200,await queueMutate(()=>writeSiteFile(name,rel,buf)));}
   if(action==='mkdir'&&method==='POST'){const {path:dir}=jsonBody(await readBody(req,8192));return send(res,200,await queueMutate(()=>mkdirSite(name,dir)));}
   if(action==='delete'&&method==='POST'){const {path:dest,confirm}=jsonBody(await readBody(req,8192));if(confirm!==dest)throw new HttpError(400,'Confirmation mismatch');return send(res,200,await queueMutate(()=>deleteSiteFile(name,dest)));}
  }
  if(kind==='services'){
   if(action==='log'&&method==='GET')return send(res,200,{log:getLog(name)});
   if(action==='action'&&method==='POST'){const {action:op}=jsonBody(await readBody(req,8192));return send(res,200,await queueMutate(()=>serviceAction(name,op)));}
  }
  if(kind==='databases'){
   if(action==='tables'&&method==='GET')return send(res,200,{tables:await listTables(name)});
   if(action==='backup'&&method==='POST')return send(res,200,await queueMutate(()=>backupDatabase(name)));
   if(action==='restore'&&method==='POST'){
    const confirm=url.searchParams.get('confirm');if(confirm!==name)throw new HttpError(400,'Explicit database confirmation required');
    const buf=await readBody(req,64*1024*1024);const filepath=path.join(DATA,'restore-'+crypto.randomUUID()+'.sql');fs.writeFileSync(filepath,buf,{mode:0o600});
    try{return send(res,200,await queueMutate(async()=>{const backup=await backupDatabase(name);try{const result=await restoreDatabase(name,filepath);return {backup,result};}catch{try{await restoreDatabase(name,backupFile(backup.file));}catch{throw new HttpError(500,'DATABASE_RECOVERY_REQUIRED');}throw new HttpError(400,'SQL_IMPORT_FAILED_ROLLED_BACK');}}));}finally{fs.rmSync(filepath,{force:true});}
   }
  }
 }
 if(route==='/api/sites'&&method==='POST'){const body=jsonBody(await readBody(req,8192));return send(res,201,await queueMutate(()=>addSite(body)));}
 if(route==='/api/databases'&&method==='POST'){const {name}=jsonBody(await readBody(req,8192));return send(res,201,await queueMutate(()=>createDatabase(name)));}
 throw new HttpError(404,'API endpoint not found');
}
async function handle(req,res){try{
 const access=remote?await authorizeRemote(req,'panel',{fetcher,readConfig}):authorizeLocal(req,port);if(!access)throw new HttpError(403,'Remote Access verification required');req.mhsRemoteAccess=access.remote;req.mhsAccess=access;if(remote&&isRevoked(access.tokenHash))throw new HttpError(403,'Access session logged out');
 const url=new URL(req.url,'http://127.0.0.1:'+PORT);
 if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 if(req.method!=='GET')throw new HttpError(405,'Not allowed');
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!['index.html','style.css','app.js'].includes(file))throw new HttpError(404,'Not found');
 let content=fs.readFileSync(path.join(PUBLIC,file));if(file==='index.html')content=Buffer.from(content.toString('utf8').replace('<head>','<head><meta name="mhs-auth-mode" content="'+(remote?'access-sso':'local-password')+'">'));res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','content-length':content.length,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'x-frame-options':'DENY','referrer-policy':'no-referrer'});res.end(content);
 }catch(e){const status=e instanceof HttpError?e.status:500;console.error('MHS_REQUEST_FAILED',status);if(!res.headersSent)send(res,status,{error:status===500?'Operation failed':e.message});else res.destroy();}}
const server=http.createServer(handle);server.on('close',()=>clearInterval(pruneTimer));server.requestTimeout=120000;server.headersTimeout=15000;return server;
}
export function start(){
 ensureDirs();if(!configured())throw Error('MHS_PANEL_SETUP_REQUIRED');
 createPanelServer().listen(PORT,'127.0.0.1',()=>console.log('MHS local password Panel ready'));
 createPanelServer({remote:true,port:9093}).listen(Number(process.env.MHS_REMOTE_PANEL_PORT||9093),'127.0.0.1',()=>console.log('MHS remote SSO Panel ready'));
 if(readJson(path.join(DATA,'settings.json'),{}).lanMonitorEnabled===true)createLanMonitor().on('error',()=>console.error('MHS_LAN_MONITOR_UNAVAILABLE')).listen(Number(process.env.MHS_MONITOR_PORT||9091),'0.0.0.0');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)start();
