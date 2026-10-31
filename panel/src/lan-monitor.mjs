import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './config.mjs';
import {systemStats} from './system.mjs';
import {authorizeRemote} from './remote-access.mjs';

// Separate read-only surface. Never forward requests into the management router.
export function privateAddress(address=''){
 const ip=address.toLowerCase().replace(/^::ffff:/,'').split('%')[0];
 if(net.isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return a===10||a===127||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===169&&b===254);}
 return ip==='::1'||(net.isIP(ip)===6&&(/^(fc|fd)/.test(ip)||/^fe[89ab]/.test(ip)));
}
export function publicMetrics(s){
 const number=v=>Number.isFinite(v)?v:null;
 return {time:s.time,device:s.device,uptime:number(s.uptime),cpuPct:number(s.cpuPct),
  mem:{total:number(s.mem?.total),available:number(s.mem?.available)},
  disk:s.disk?{total:number(s.disk.total),available:number(s.disk.available)}:null,
  battery:{available:s.battery?.available===true,percentage:number(s.battery?.percentage),temperature:number(s.battery?.temperature)},
  network:s.network?{rxPerSecond:number(s.network.rxPerSecond),txPerSecond:number(s.network.txPerSecond)}:null,
  services:Object.entries(s.services||{}).map(([name,v])=>({name,running:!!(v.ok&&/^run:/.test(v.out||''))}))};
}
export function monitorHandler({collect=systemStats,authorize,remote=false}){
 return async(req,res)=>{
  const headers={'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
  const end=(code,type,body)=>{res.writeHead(code,{...headers,'content-type':type});res.end(body);};
  try{
   if(!await authorize(req))return end(403,'text/plain','Monitor access denied');
   if(req.headers.origin&&req.headers.origin!==(remote?'https://':'http://')+req.headers.host)return end(403,'text/plain','Origin denied');
   if(req.method!=='GET')return end(405,'text/plain','Read only');
   if(req.url==='/api/metrics')return end(200,'application/json; charset=utf-8',JSON.stringify(publicMetrics(await collect())));
   const files={'/':['monitor.html','text/html'],'/monitor.js':['monitor.js','text/javascript'],'/monitor.css':['monitor.css','text/css']};
   const item=Object.hasOwn(files,req.url)?files[req.url]:null;if(!item)return end(404,'text/plain','Not found');
   let content=fs.readFileSync(path.join(ROOT,'public',item[0]));if(remote&&req.url==='/')content=Buffer.from(content.toString('utf8').replace('cùng mạng LAN • không cần đăng nhập','Cloudflare Access • độc lập với Hosting Panel').replace('LAN Monitor','Remote Monitor'));
   end(200,item[1]+'; charset=utf-8',content);
  }catch{end(503,'application/json','{"error":"METRICS_UNAVAILABLE"}');}
 };
}
export function createLanMonitor(collect=systemStats){
 return http.createServer(monitorHandler({collect,authorize:req=>{
  let host;try{host=new URL('http://'+req.headers.host).hostname.replace(/^\[|\]$/g,'');}catch{return false;}
  if(Object.keys(req.headers).some(k=>/^(cf-|x-forwarded-|forwarded$|x-real-ip$)/i.test(k)))return false;
  return privateAddress(req.socket.remoteAddress)&&(privateAddress(host)||(host==='localhost'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)));
 }}));
}
export function createRemoteMonitor({collect=systemStats,fetcher=fetch,readConfig}={}){
 return http.createServer(monitorHandler({collect,remote:true,authorize:req=>authorizeRemote(req,'monitor',{fetcher,...(readConfig?{readConfig}:{})})}));
}
