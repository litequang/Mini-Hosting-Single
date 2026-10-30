import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {URL} from 'node:url';
import {authorizeRequest,publicStatus} from './remote-access.mjs';
import {PORT,ROOT,DATA,ensureDirs,registry,readJson} from './config.mjs';
import {checkPassword,configured,HttpError,safeText} from './security.mjs';
import {systemStats,shellStatus,serviceAction,getLog,nginxTest,integrateNginx,regenerateNginx,cmd} from './system.mjs';
import {listSites,addSite,deleteSite,listFiles,readFileForSite,writeSiteFile,mkdirSite,deleteSiteFile,deployZip,siteRoot} from './sites.mjs';
import {listDatabases,createDatabase,listTables,backupDatabase,restoreDatabase} from './databases.mjs';
import {listBackups,backupSiteArchive,backupFile} from './backups.mjs';
import {createLanMonitor} from './lan-monitor.mjs';
const PUBLIC=path.join(ROOT,'public');
const sessions=new Map(),attempts=new Map();let mutations=Promise.resolve();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png'};
const token=()=>crypto.randomBytes(32).toString('base64url');
function send(res,status,data){const out=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','content-length':out.length,'x-content-type-options':'nosniff'});res.end(out);}
function jsonBody(buf){if(!buf.length)return {};try{return JSON.parse(buf.toString('utf8'));}catch{throw new HttpError(400,'Invalid JSON');}}
async function readBody(req,max=30*1024*1024){const parts=[];let size=0;for await(const ch of req){size+=ch.length;if(size>max)throw new HttpError(413,'Upload too large');parts.push(ch);}return Buffer.concat(parts);}
function cookie(req,name){const raw=req.headers.cookie||'';return raw.split(';').map(s=>s.trim()).find(p=>p.startsWith(name+'='))?.slice(name.length+1)||'';}
function auth(req){const id=cookie(req,'mhs_session');const session=sessions.get(id);if(!session)return null;if(session.host!==req.headers.host||session.accessHash!==(req.mhsRemoteAccess?crypto.createHash('sha256').update(String(req.headers['cf-access-jwt-assertion'])).digest('hex'):null))return null;if(session.expires<Date.now()){sessions.delete(id);return null;}session.expires=Date.now()+6*60*60*1000;return session;}
function allowedHttpsHost(req){return req.mhsRemoteAccess===true;}
function sessionCookie(id,req){return `mhs_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=21600${allowedHttpsHost(req)?'; Secure':''}`;}
function guardOrigin(req){const origin=req.headers.origin;if(origin){let u;try{u=new URL(origin);}catch{throw new HttpError(403,'Bad Origin');}const host=String(req.headers.host||'').toLowerCase();const localHttp=(u.protocol==='http:'&&(host===`127.0.0.1:${PORT}`||host===`localhost:${PORT}`));const accessHttps=(u.protocol==='https:'&&req.mhsRemoteAccess===true);if(u.host.toLowerCase()!==host||!(localHttp||accessHttps))throw new HttpError(403,'Origin denied');}}
function mutual(req,s){if(!s)throw new HttpError(401,'Please sign in');const given=Buffer.from(String(req.headers['x-csrf-token']||''),'utf8'),expected=Buffer.from(s.csrf,'utf8');if(given.length!==expected.length||!crypto.timingSafeEqual(given,expected))throw new HttpError(403,'Invalid CSRF token');}
function queueMutate(f){const task=mutations.then(f);mutations=task.catch(()=>{});return task;}
function prune(){const now=Date.now();for(const [k,s] of sessions)if(s.expires<now)sessions.delete(k);for(const [k,a] of attempts)if(a.until<now-30*60*1000)attempts.delete(k);}
setInterval(prune,15*60*1000).unref();
async function api(req,res,url){
 const route=url.pathname,method=req.method;
 if(route==='/api/login'&&method==='POST'){
  guardOrigin(req);const ip=req.socket.remoteAddress||'local',old=attempts.get(ip)||{count:0,until:0};
  if(old.count>=8&&old.until>Date.now())throw new HttpError(429,'Too many attempts, try again later');
  const {username,password}=jsonBody(await readBody(req,8192));
  if(username!=='admin'||typeof password!=='string'||!checkPassword(password)){
   const n=old.until>Date.now()?old.count+1:1;attempts.set(ip,{count:n,until:Date.now()+15*60*1000});throw new HttpError(401,'Wrong username or password');
  }
  attempts.delete(ip);const id=token();const session={host:req.headers.host,accessHash:req.mhsRemoteAccess?crypto.createHash('sha256').update(String(req.headers['cf-access-jwt-assertion'])).digest('hex'):null,csrf:token(),expires:Date.now()+6*60*60*1000};sessions.set(id,session);res.setHeader('set-cookie',sessionCookie(id,req));return send(res,200,{user:'admin',csrf:session.csrf});
 }
 const s=auth(req);
 if(route==='/api/session'&&method==='GET')return send(res,200,{loggedIn:!!s,user:s?'admin':null,csrf:s?.csrf||null});
 if(!s)throw new HttpError(401,'Sign in required');
 if(route==='/api/logout'&&method==='POST'){guardOrigin(req);mutual(req,s);sessions.delete(cookie(req,'mhs_session'));res.setHeader('set-cookie','mhs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(allowedHttpsHost(req)?'; Secure':''));return send(res,200,{ok:true});}
 if(method!=='GET'){guardOrigin(req);mutual(req,s);}
 if(route==='/api/remote-access'&&method==='GET')return send(res,200,publicStatus());
 if(route==='/api/overview'&&method==='GET')return send(res,200,await systemStats());
 if(route==='/api/sites'&&method==='GET')return send(res,200,{sites:listSites()});
 // Direct mutation routes are handled below to guarantee one request body per action.
 if(route==='/api/nginx'&&method==='GET')return send(res,200,{configured:registry().nginxIntegrated,test:await nginxTest()});
 if(route==='/api/nginx/integrate'&&method==='POST')return send(res,200,await queueMutate(()=>integrateNginx()));
 if(route==='/api/services'&&method==='GET'){const status=await systemStats();return send(res,200,{services:status.services});}
 if(route==='/api/databases'&&method==='GET')return send(res,200,{databases:await listDatabases()});
 if(route==='/api/backups'&&method==='GET')return send(res,200,{backups:listBackups()});
 if(route==='/api/backups/download'&&method==='GET'){
  const file=backupFile(url.searchParams.get('name')||'');res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':`attachment; filename="${path.basename(file)}"`,'cache-control':'no-store'});fs.createReadStream(file).pipe(res);return;
 }
 if(route==='/api/domains'&&method==='GET')return send(res,200,{sites:listSites().map(x=>({hostname:x.hostname,serviceUrl:'http://127.0.0.1:8080'})),manual:true});
 const m=route.match(/^\/api\/(sites|files|services|databases)\/([a-zA-Z0-9_-]+)(?:\/(.*))?$/);
 if(m){const [,kind,name,action='']=m;
  if(kind==='sites'){
   if(!action&&method==='DELETE'){const {confirm}=jsonBody(await readBody(req,4096));if(confirm!==name)throw new HttpError(400,'Confirmation mismatch');return send(res,200,await queueMutate(()=>deleteSite(name)));}
   if(action==='zip'&&method==='POST'){const buf=await readBody(req);return send(res,200,await queueMutate(()=>deployZip(name,buf)));}
   if(action==='backup'&&method==='POST')return send(res,200,await queueMutate(()=>backupSiteArchive(name)));
  }
  if(kind==='files'){
   const rel=url.searchParams.get('path')||'';
   if(action==='list'&&method==='GET')return send(res,200,{files:listFiles(name,rel)});
   if(action==='read'&&method==='GET')return send(res,200,{text:readFileForSite(name,rel)});
   if(action==='write'&&method==='PUT'){const buf=await readBody(req,20*1024*1024);return send(res,200,writeSiteFile(name,rel,buf));}
   if(action==='mkdir'&&method==='POST'){const {path:dir}=jsonBody(await readBody(req,8192));return send(res,200,mkdirSite(name,dir));}
   if(action==='delete'&&method==='POST'){const {path:dest,confirm}=jsonBody(await readBody(req,8192));if(confirm!==dest)throw new HttpError(400,'Confirmation mismatch');return send(res,200,deleteSiteFile(name,dest));}
  }
  if(kind==='services'){
   if(action==='log'&&method==='GET')return send(res,200,{log:getLog(name)});
   if(action==='action'&&method==='POST'){const {action:op}=jsonBody(await readBody(req,8192));return send(res,200,await serviceAction(name,op));}
  }
  if(kind==='databases'){
   if(action==='tables'&&method==='GET')return send(res,200,{tables:await listTables(name)});
   if(action==='backup'&&method==='POST')return send(res,200,await backupDatabase(name));
   if(action==='restore'&&method==='POST'){
    const confirm=url.searchParams.get('confirm');if(confirm!==name)throw new HttpError(400,'Explicit database confirmation required');
    const buf=await readBody(req,10*1024*1024);const filepath=path.join(DATA,'restore-'+crypto.randomUUID()+'.sql');fs.writeFileSync(filepath,buf,{mode:0o600});
    try{const backup=await backupDatabase(name);const result=await restoreDatabase(name,filepath);return send(res,200,{backup,result});}finally{fs.rmSync(filepath,{force:true});}
   }
  }
 }
 if(route==='/api/sites'&&method==='POST'){const body=jsonBody(await readBody(req,8192));return send(res,201,await queueMutate(()=>addSite(body)));}
 if(route==='/api/databases'&&method==='POST'){const {name}=jsonBody(await readBody(req,8192));return send(res,201,await queueMutate(()=>createDatabase(name)));}
 throw new HttpError(404,'API endpoint not found');
}
async function handle(req,res){try{
 const access=await authorizeRequest(req,PORT);if(!access)throw new HttpError(403,'Remote Access verification required');req.mhsRemoteAccess=access.remote;
 const url=new URL(req.url,'http://127.0.0.1:'+PORT);
 if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 if(req.method!=='GET')throw new HttpError(405,'Not allowed');
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!['index.html','style.css','app.js'].includes(file))throw new HttpError(404,'Not found');
 const content=fs.readFileSync(path.join(PUBLIC,file));res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','content-length':content.length,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'x-frame-options':'DENY','referrer-policy':'no-referrer'});res.end(content);
 }catch(e){const status=e instanceof HttpError?e.status:500;console.error('MHS_REQUEST_FAILED',status);if(!res.headersSent)send(res,status,{error:status===500?'Operation failed':e.message});else res.destroy();}}
ensureDirs();if(!configured()){console.error('Panel not configured: run npm run setup');process.exit(1);}
http.createServer(handle).listen(PORT,'127.0.0.1',()=>console.log(`Mini Hosting Single Panel listening at 127.0.0.1:${PORT} (SSH only)`));
if(readJson(path.join(DATA,'settings.json'),{}).lanMonitorEnabled===true){
 createLanMonitor().listen(Number(process.env.MHS_MONITOR_PORT||9091),'0.0.0.0',()=>console.log('MHS read-only LAN Monitor ready'));
}
