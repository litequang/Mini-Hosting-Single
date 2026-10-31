import crypto from 'node:crypto';
import http from 'node:http';
export function accessFixture(){
 const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const panel={hostname:'panel.example.com',teamDomain:'test.cloudflareaccess.com',audience:'a'.repeat(64),ownerEmail:'owner@example.com'};
 const monitor={...panel,hostname:'monitor.example.com',audience:'b'.repeat(64)};
 const key={...publicKey.export({format:'jwk'}),alg:'RS256',kid:'fixture',use:'sig'};
 const fetcher=async()=>new Response(JSON.stringify({keys:[key]}));
 const sign=(app=panel,extra={},head={})=>{const now=Math.floor(Date.now()/1000),claims={iss:'https://'+app.teamDomain,aud:[app.audience],exp:now+300,iat:now,sub:'signed-owner-subject',email:'owner@example.com',...extra},h=Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture',...head})).toString('base64url'),b=Buffer.from(JSON.stringify(claims)).toString('base64url');return h+'.'+b+'.'+crypto.sign('RSA-SHA256',Buffer.from(h+'.'+b),privateKey).toString('base64url');};
 return {panel,monitor,fetcher,sign};
}
export async function listen(server){await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 return (route='/',{method='GET',headers={},body}={})=>new Promise((resolve,reject)=>{const data=body===undefined?null:Buffer.from(JSON.stringify(body));const q=http.request({hostname:'127.0.0.1',port,path:route,method,headers:{...headers,...(data?{'content-type':'application/json','content-length':data.length}:{})}},r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>{let data;try{data=JSON.parse(b);}catch{data=b;}resolve({status:r.statusCode,headers:r.headers,data});});});q.on('error',reject);q.end(data);});
}
export async function close(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
