import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-create-'));process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const socket=http.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));process.env.MHS_PORT=String(socket.address().port);await new Promise(r=>socket.close(r));
const c=await import('../panel/src/config.mjs');assert.equal(c.DATA,path.resolve(process.env.MHS_DATA));c.initialize();const {addSite}=await import('../panel/src/sites.mjs'),{siteHostname,siteSlug}=await import('../panel/public/site-input.js');
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('site input accepts pasted root URL, case, trailing slash/dot and scoped label; rejects ambiguous addresses',()=>{
 for(const value of [' GPLX.thophuong.com ','https://GPLX.thophuong.com/','gplx.thophuong.com/','gplx.thophuong.com.'])assert.equal(siteHostname(value),'gplx.thophuong.com');assert.equal(siteHostname('GPLX','thophuong.com'),'gplx.thophuong.com');assert.equal(siteSlug(' GPLX-WEB '),'gplx-web');
 for(const value of ['', 'https://user:pass@example.com/', 'https://example.com/app', 'https://example.com/?token=x', 'ftp://example.com', 'example.com:8022', 'example.com/#x','a b.example.com'])assert.throws(()=>siteHostname(value));
 for(const value of ['a','../site','panel','has.dot','two words'])assert.throws(()=>siteSlug(value));
});
test('API canonicalizes host/slug and ignores an irrelevant empty Node entry for a static site; guards remain',async()=>{
 const s=await addSite({hostname:'https://GPLX.example.com/',slug:' GPLX ',type:'static',entry:''});assert.equal(s.hostname,'gplx.example.com');assert.equal(s.slug,'gplx');assert.equal(s.entry,null);
 await assert.rejects(()=>addSite({hostname:'gplx.example.com',slug:'another'}),/already exists/);await assert.rejects(()=>addSite({hostname:'node.example.com',slug:'node-web',type:'node',entry:''}),/Node entrypoint/);
 await assert.rejects(()=>addSite({hostname:'https://bad.example.com/private',slug:'bad-web'}),/ROOT_URL_ONLY/);assert.equal(c.registry().sites.length,1);
});
test('Chrome create form: feedback, hidden advanced field, root URL, immediate list, lost response and no duplicate',{skip:!process.env.MHS_BROWSER_TEST_EXE?'Set MHS_BROWSER_TEST_EXE':false},async()=>{
 const {setPassword}=await import('../panel/src/security.mjs'),{createPanelServer}=await import('../panel/src/server.mjs');setPassword('synthetic-create-password-123456');const server=createPanelServer();await new Promise(r=>server.listen(Number(process.env.MHS_PORT),'127.0.0.1',r));let browser;
 try{const {chromium}=await import('playwright-core');browser=await chromium.launch({executablePath:process.env.MHS_BROWSER_TEST_EXE,headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());await page.goto('http://127.0.0.1:'+process.env.MHS_PORT);await page.locator('#password').fill('synthetic-create-password-123456');await page.locator('#loginForm button').click();await page.locator('#shell').waitFor({state:'visible'});await page.locator('[data-tab="sites"]').click();await page.locator('[data-action="create-site"]').click();
  await page.locator('#siteForm button').click();await page.locator('#siteForm [role="alert"]').getByText('Nhập subdomain hoặc tên miền của website.').waitFor();assert.equal(c.registry().sites.length,1);
  await page.locator('#siteForm input[name="hostname"]').fill('https://new.example.com/private');await page.locator('#siteForm button').click();await page.locator('#siteForm [role="alert"]').getByText('Chỉ nhập tên miền hoặc URL gốc',{exact:false}).waitFor();
  await page.locator('#siteForm input[name="hostname"]').fill('https://NEW.example.com/');await page.locator('#siteForm summary').click();await page.locator('#siteForm input[name="slug"]').fill('NEW-WEB');await page.locator('#siteForm summary').click();
  let release;const gate=new Promise(r=>release=r);let posts=0;
  await page.route('**/api/sites',async route=>{if(route.request().method()!=='POST')return route.continue();posts++;const response=await route.fetch();await gate;await route.abort();});
  await page.locator('#siteForm button').click();await page.locator('#siteForm [role="status"]').getByText('Đang kiểm tra và tạo website…').waitFor();assert.equal(await page.locator('#siteForm button').isDisabled(),true);
  await page.waitForFunction(()=>true);release();await page.locator('#sitePublish').waitFor();assert.equal(posts,1);assert.equal(c.registry().sites.length,2);assert.equal(c.registry().sites[1].hostname,'new.example.com');assert.equal(c.registry().sites[1].slug,'new-web');await page.locator('#content [data-action="manage-site:new-web"]').waitFor();
  await page.unroute('**/api/sites');await page.locator('#modalClose').click();await page.locator('[data-action="create-site"]').click();await page.locator('#siteForm input[name="hostname"]').fill('NEW.example.com');await page.locator('#siteForm button').click();await page.locator('#sitePublish').waitFor();assert.equal(c.registry().sites.length,2);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
