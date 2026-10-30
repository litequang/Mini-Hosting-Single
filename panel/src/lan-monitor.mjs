import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './config.mjs';
import {systemStats} from './system.mjs';

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
export function createLanMonitor(collect=systemStats){
 return http.createServer(async(req,res)=>{
  const headers={'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
  const end=(code,type,body)=>{res.writeHead(code,{...headers,'content-type':type});res.end(body);};
  let host;try{host=new URL('http://'+req.headers.host).hostname.replace(/^\[|\]$/g,'');}catch{return end(403,'text/plain','LAN only');}
  if(!privateAddress(req.socket.remoteAddress)||!(privateAddress(host)||(host==='localhost'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))))return end(403,'text/plain','LAN only');
  if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return end(403,'text/plain','Origin denied');
  if(req.method!=='GET')return end(405,'text/plain','Read only');
  try{
   if(req.url==='/api/metrics')return end(200,'application/json; charset=utf-8',JSON.stringify(publicMetrics(await collect())));
   const files={'/':['monitor.html','text/html'],'/monitor.js':['monitor.js','text/javascript'],'/monitor.css':['monitor.css','text/css']};
   const item=files[req.url];if(!item)return end(404,'text/plain','Not found');
   end(200,item[1]+'; charset=utf-8',fs.readFileSync(path.join(ROOT,'public',item[0])));
  }catch{end(503,'application/json','{"error":"METRICS_UNAVAILABLE"}');}
 });
}
