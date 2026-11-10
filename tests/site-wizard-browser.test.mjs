import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
const exe=process.env.MHS_BROWSER_TEST_EXE,temp=fs.mkdtempSync(path.join(os.tmpdir(),'mhs-site-wizard-'));
process.env.MHS_HOME=path.join(temp,'home');process.env.MHS_DATA=path.join(temp,'data');process.env.PREFIX=path.join(temp,'prefix');
const socket=http.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));process.env.MHS_PORT=String(socket.address().port);await new Promise(r=>socket.close(r));
const c=await import('../panel/src/config.mjs');assert.equal(c.DATA,path.resolve(process.env.MHS_DATA),'fixture must resolve isolated DATA before initialization');c.initialize();
const {setPassword,HttpError}=await import('../panel/src/security.mjs'),{createPanelServer}=await import('../panel/src/server.mjs'),{configureDomainApi}=await import('../panel/src/domains.mjs');
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
test('Chrome PC: create site, scoped subdomain, explicit publish, retry and honest manual/conflict/recovery states',{skip:!exe?'Set MHS_BROWSER_TEST_EXE':false},async()=>{
 setPassword('synthetic-wizard-password-123456');
 let applies=0,previews=0,failPreview=false,failApply=false;
 const domainOps={
  preview:async slug=>{previews++;if(failPreview)throw new HttpError(409,'CF_DNS_RECORD_ALREADY_EXISTS');const site=c.registry().sites.find(s=>s.slug===slug);return {id:'fixture-plan',hostname:site.hostname,dnsTarget:'fixture.cfargotunnel.com'};},
  apply:async(id,confirm)=>{assert.equal(id,'fixture-plan');if(failApply)throw new HttpError(409,'CF_CONFIG_CHANGED_REPLAN');applies++;const site=c.registry().sites.find(s=>s.hostname===confirm);const states=c.readJson(path.join(c.DATA,'domain-state.json'),{});states[site.slug]={state:'DNS published',hostname:confirm};c.atomicJson(path.join(c.DATA,'domain-state.json'),states);return states[site.slug];},
  verifyHttps:async slug=>{const states=c.readJson(path.join(c.DATA,'domain-state.json'),{});states[slug].state='HTTPS verified';c.atomicJson(path.join(c.DATA,'domain-state.json'),states);return states[slug];}
 };
 const server=createPanelServer({domainOps});await new Promise(r=>server.listen(Number(process.env.MHS_PORT),'127.0.0.1',r));let browser;
 try{
  const {chromium}=await import('playwright-core');browser=await chromium.launch({executablePath:exe,headless:true,args:['--disable-background-networking','--disable-sync','--no-first-run']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+process.env.MHS_PORT);await page.locator('#password').fill('synthetic-wizard-password-123456');await page.locator('#loginForm button').click();await page.locator('#shell').waitFor({state:'visible'});
  await page.locator('[data-tab="sites"]').click();await page.locator('[data-action="create-site"]').click();
  assert.equal(await page.locator('[data-node-entry]').isVisible(),false);
  await page.locator('#siteForm input[name="hostname"]').fill('manual.example.com');await page.locator('#siteForm button').click();
  await page.locator('#sitePublish').getByText('website đã cấu hình thủ công có thể vẫn đang public.',{exact:false}).waitFor();assert.equal(previews,0);assert.equal(applies,0);
  await page.locator('#content').getByText('web-manual · Chưa ghi nhận DNS qua API',{exact:true}).waitFor();
  assert.equal(c.registry().sites.length,1);assert.equal(c.registry().sites[0].slug,'web-manual');
  await page.locator('#modalBody [data-action="site-cloudflare"]').click();await page.locator('#domainApiConfig').waitFor();
  // Private synthetic API scope only. The browser cannot reach the Internet;
  // publication operations are injected, not Cloudflare acceptance.
  const accountId='a'.repeat(32),zoneId='b'.repeat(32),tunnelId='11111111-2222-4333-8444-555555555555';
  fs.mkdirSync(path.join(c.DATA,'cloudflare'),{recursive:true});fs.writeFileSync(path.join(c.DATA,'cloudflare/tunnel-token'),Buffer.from(JSON.stringify({a:accountId,t:tunnelId,s:'fixture-secret'})).toString('base64'));
  configureDomainApi({accountId,zoneId,zone:'example.com',tunnelId,apiToken:'synthetic_token_1234567890',confirm:'MHS OWNS TUNNEL '+tunnelId});
  await page.locator('[data-tab="sites"]').click();await page.locator('[data-action="create-site"]').click();
  await page.locator('#siteForm select[name="type"]').selectOption('node');assert.equal(await page.locator('[data-node-entry]').isVisible(),true);await page.locator('#siteForm input[name="entry"]').fill('');await page.locator('#siteForm select[name="type"]').selectOption('static');
  await page.locator('#siteForm input[name="hostname"]').fill(' Shop ');await page.locator('#siteForm button').click();await page.locator('#sitePublishForm').waitFor();
  assert.equal(c.registry().sites.find(s=>s.slug==='web-shop').hostname,'shop.example.com');assert.equal(previews,1);assert.equal(applies,0);
  const box=await page.locator('.modal').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390,'wizard fits mobile viewport');
  if(process.env.MHS_WIZARD_SCREENSHOT)await page.screenshot({path:process.env.MHS_WIZARD_SCREENSHOT});
  await page.locator('#sitePublishForm input').fill('wrong.example.com');await page.locator('#sitePublishForm button').click();assert.equal(applies,0);assert.equal(await page.locator('#sitePublishForm').isVisible(),true);
  await page.locator('#sitePublishForm input').fill('shop.example.com');await page.locator('#sitePublishForm button').click();await page.locator('[data-action="site-verify:web-shop"]').waitFor();
  assert.equal(applies,1);assert.ok((await page.locator('#modalBody').innerText()).includes('HTTPS chưa được xác nhận'));assert.equal(await page.locator('#sitePublishForm').count(),0);
  await page.locator('[data-action="site-verify:web-shop"]').click();await page.locator('#modalBody').getByText('HTTPS đã kiểm tra',{exact:true}).waitFor();assert.equal(applies,1);
  // Reopening an already-published site offers verify, never another create/apply.
  await page.locator('#modalClose').click();await page.locator('[data-action="site-publish:web-shop"]').click();await page.locator('[data-action="site-verify:web-shop"]').waitFor();assert.equal(previews,1);
  await page.locator('#modalClose').click();failPreview=true;
  await page.locator('[data-action="create-site"]').click();await page.locator('#siteForm input[name="hostname"]').fill('conflict');await page.locator('#siteForm button').click();await page.locator('#sitePublish [role="alert"]').waitFor();
  assert.equal(c.registry().sites.length,3);assert.equal(await page.locator('#siteForm').count(),0);assert.equal(await page.locator('#sitePublishForm').count(),0);assert.equal(applies,1);
  assert.ok((await page.locator('#sitePublish [role="alert"]').innerText()).includes('Tên miền này đã có DNS'));
  const states=c.readJson(path.join(c.DATA,'domain-state.json'),{});states['web-conflict']={state:'RECOVERY REQUIRED'};c.atomicJson(path.join(c.DATA,'domain-state.json'),states);
  await page.locator('#modalClose').click();await page.locator('[data-action="site-publish:web-conflict"]').click();await page.locator('#sitePublish [role="alert"]').waitFor();assert.equal(await page.locator('[data-action="site-preview:web-conflict"]').count(),0);
  await page.locator('#modalClose').click();failPreview=false;failApply=true;
  await page.locator('[data-action="create-site"]').click();await page.locator('#siteForm input[name="hostname"]').fill('failed');await page.locator('#siteForm button').click();await page.locator('#sitePublishForm').waitFor();
  await page.locator('#sitePublishForm input').fill('failed.example.com');await page.locator('#sitePublishForm button').click();await page.locator('#sitePublish [role="alert"]').waitFor();
  assert.equal(applies,1);assert.equal(c.registry().sites.length,4);assert.equal(await page.locator('#siteForm').count(),0);assert.equal(await page.locator('#sitePublishForm').count(),0);
  // A lost HTTP response after a successful write must re-read published state,
  // not offer another apply or report that the site needs to be created again.
  failApply=false;await page.locator('[data-action="site-preview:web-failed"]').click();await page.locator('#sitePublishForm').waitFor();
  await page.route('**/api/domain-apply',async route=>{await route.fetch();await route.abort();});
  await page.locator('#sitePublishForm input').fill('failed.example.com');await page.locator('#sitePublishForm button').click();await page.locator('[data-action="site-verify:web-failed"]').waitFor();
  assert.equal(applies,2);assert.equal(await page.locator('#sitePublishForm').count(),0);assert.equal(await page.locator('[data-action="site-preview:web-failed"]').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
