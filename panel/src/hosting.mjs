import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import {SITES,DATA,NGINX,NGINX_CONFIG,TERMUX,SOCKET,registry,atomicJson,readJson} from './config.mjs';
import {databaseCredentials} from './databases.mjs';
const php=s=>"'"+s.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";
export function wpConfig(site){const c=databaseCredentials(site.database);return `<?php\n// Independent MHS site. Local credentials never imported from another node.\n`+Object.entries({DB_NAME:site.database,DB_USER:c.user,DB_PASSWORD:c.password,DB_HOST:'localhost:'+SOCKET,DB_CHARSET:'utf8mb4',DB_COLLATE:'',...Object.fromEntries(['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'].map(k=>[k,crypto.randomBytes(48).toString('hex')]))}).map(([k,v])=>`define('${k}',${php(v)});`).join('\n')+`\n$table_prefix='wp_';\ndefine('DISALLOW_FILE_EDIT',true);\nif (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO']==='https') $_SERVER['HTTPS']='on';\nif (!defined('ABSPATH')) define('ABSPATH',__DIR__.'/');\nrequire_once ABSPATH.'wp-settings.php';\n`;}
export function assertIndependentTree(dir){
 const walk=(p)=>{for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isSymbolicLink())throw Error('IMPORT_SYMLINK_REFUSED');if(/^(\.git|\.env|\.config|\.ssh|mhc-full|authority.*\.json|node-identity\.json|wp-config\.php)$/i.test(e.name))throw Error('MHS_PRIVATE_OR_CLUSTER_IMPORT_REFUSED');if(e.isDirectory())walk(f);else if(/\.(php|mjs|js|json|sql|sh)$/.test(e.name)&&fs.statSync(f).size<=1024*1024&&/MHC_MANAGED_WORDPRESS_LAB|MHC_P4_LEASE_REQUIRED|mhc-p33|cluster-authority\.mjs/.test(fs.readFileSync(f,'utf8')))throw Error('MHS_CLUSTER_SITE_REFUSED');}};walk(dir);
}
export function hostingConfigs(){
 fs.mkdirSync(path.dirname(NGINX_CONFIG),{recursive:true});fs.mkdirSync(NGINX,{recursive:true});fs.mkdirSync(path.join(DATA,'run'),{recursive:true});
 const slash=s=>s.replaceAll('\\','/');
 fs.writeFileSync(NGINX_CONFIG,`worker_processes 1;\npid "${slash(path.join(DATA,'run/nginx.pid'))}";\nerror_log stderr warn;\nevents { worker_connections 256; }\nhttp {\ninclude "${slash(path.join(TERMUX,'etc/nginx/mime.types'))}";\ndefault_type application/octet-stream;\naccess_log off;\nclient_body_temp_path "${slash(path.join(DATA,'run/client-body'))}";\nproxy_temp_path "${slash(path.join(DATA,'run/proxy'))}";\nfastcgi_temp_path "${slash(path.join(DATA,'run/fastcgi'))}";\nserver { listen 127.0.0.1:8080 default_server; server_name _; return 404; }\ninclude "${slash(NGINX)}/*.conf";\n}\n`,{mode:0o600});
 fs.writeFileSync(path.join(DATA,'php-fpm.conf'),`[global]\ndaemonize = no\nerror_log = /proc/self/fd/2\n[www]\nlisten = ${slash(path.join(DATA,'run/php.sock'))}\npm = ondemand\npm.max_children = 3\npm.process_idle_timeout = 20s\ncatch_workers_output = yes\nclear_env = yes\nphp_admin_value[upload_max_filesize] = 64M\nphp_admin_value[post_max_size] = 64M\n`,{mode:0o600});
}
export async function siteHealth(site){
 const started=Date.now();const r=await new Promise(resolve=>{const q=http.get({hostname:'127.0.0.1',port:8080,path:'/',headers:{host:site.hostname},timeout:4000},r=>{r.resume();resolve({httpStatus:r.statusCode});});q.on('error',()=>resolve({httpStatus:null}));q.on('timeout',()=>{q.destroy();resolve({httpStatus:null});});});return {...r,ok:r.httpStatus>=200&&r.httpStatus<400,checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started};
}
