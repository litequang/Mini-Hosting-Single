// Site creation and publishing reuse the existing authenticated Panel APIs.
import {siteHostname,siteSlug,siteInputMessage} from './site-input.js';
const labels={'local only':'Chưa ghi nhận DNS qua API',planned:'Chưa áp dụng DNS qua API','DNS published':'Đã tạo DNS · chờ kiểm tra HTTPS','HTTPS verified':'HTTPS đã kiểm tra','RECOVERY REQUIRED':'Cần kiểm tra cấu hình Cloudflare'};
export const domainStateLabel=value=>labels[value]||labels['local only'];
export function siteWizardUi({req,modal,esc,input,btn,toast,loadSites,onCreated=async()=>{}}){
 const post=(url,body={})=>req(url,{method:'POST',body});
 const next=site=>`<div class="btnrow">${btn('Upload mã web / dist','site-files:'+site.slug)}${site.type==='node'?btn('Cài thư viện và khởi động Node.js','node-setup:'+site.slug):''}${site.type==='wordpress'?btn('Cài WordPress','wp-install:'+site.slug):''}${btn('Quản lý website','manage-site:'+site.slug)}</div><p class="help">Site mới có trang mẫu. Upload ứng dụng và kiểm tra chức năng riêng; kiểm tra HTTPS chưa xác nhận ứng dụng hoạt động đầy đủ.</p>`;
 function problem(error){const code=error.message;const messages={
  CF_DNS_RECORD_ALREADY_EXISTS:'Tên miền này đã có DNS. Chọn tên mới hoặc kiểm tra bản ghi trong Cloudflare.',
  CF_INGRESS_CONFLICT:'Tên miền trùng route Tunnel hoặc wildcard hiện có. Kiểm tra Cloudflare trước khi thử lại.',
  CF_FOREIGN_WILDCARD_DNS_CONFLICT:'Wildcard DNS đang phục vụ tên miền này. Cần kiểm tra trước khi thêm site.',
  CF_SCOPE_OR_MHS_TUNNEL_OWNERSHIP_FAILED:'Tunnel chưa đáp ứng điều kiện MHS riêng (tên mhs-, remotely managed). Kiểm tra thiết lập Cloudflare.',
  CF_CONNECTOR_TUNNEL_MISMATCH:'Connector trên máy không khớp Tunnel đã cấu hình cho API.',
  CF_API_PERMISSION_DENIED_CHECK_SCOPES:'API token chưa có đủ quyền DNS/Zone/Tunnel. Kiểm tra quyền trong thiết lập Cloudflare.',
  CF_CONFIG_CHANGED_REPLAN:'Cấu hình Tunnel vừa thay đổi. Xem lại cấu hình xuất bản để lấy bản mới.',
  CF_RECOVERY_INSPECTION_REQUIRED:'Thao tác chưa hoàn tất và cần kiểm tra Cloudflare. Giữ dữ liệu khôi phục, không tạo lại website hoặc ghi đè route.',
  CF_SITE_HOSTNAME_OUTSIDE_ZONE:'Tên miền nằm ngoài domain đã cấp quyền API. Chọn subdomain trong domain đó hoặc dùng cấu hình thủ công.'
 };return `<div class="info danger" role="alert">${esc(messages[code]||'Chưa hoàn tất thao tác: '+code)}</div><p class="help">Website đã tạo vẫn được giữ trên máy. Có thể tiếp tục từ nút Xuất bản trong Websites.</p>`;}
 async function open(){
  const status=await req('/api/domain-status');
  modal('Thêm website',`<form id="siteForm" novalidate data-zone="${esc(status.zone||'')}">${input('hostname',status.zone?'Subdomain hoặc tên miền đầy đủ':'Tên miền đầy đủ',status.zone?'shop → shop.'+status.zone:'shop.example.com')}<p class="help">${status.configured?'Domain đã kết nối: '+esc(status.zone)+'. Panel sẽ chuẩn bị DNS và route Tunnel sau khi tạo site.':'Chưa kết nối API Cloudflare. Bạn vẫn tạo được site trên máy; kết nối một lần để xuất bản tự động.'}</p><div class="inputgroup"><label>Loại website</label><select name="type"><option value="static">Static / React dist</option><option value="node">Node.js</option><option value="php">PHP</option><option value="wordpress">WordPress</option></select></div><div class="inputgroup hide" data-node-entry>${input('entry','Node entrypoint','server.mjs','server.mjs')}</div><details><summary>Tùy chọn nâng cao</summary><div class="inputgroup"><label>Mã thư mục website (để trống để tự tạo)</label><input name="slug" placeholder="shop-web" pattern="[a-z][a-z0-9-]{1,30}"></div></details><p class="help">Tự cấp thư mục riêng và port Node.js. Bạn sẽ xem và xác nhận tên miền trước khi Panel ghi Cloudflare.</p><button class="primary wide">${status.configured?'Tạo website và xem cấu hình xuất bản':'Tạo website trên máy'}</button></form><div class="btnrow">${btn('Kết nối Cloudflare một lần','site-cloudflare')}</div>`);
  const form=document.querySelector('#siteForm');form.elements.hostname.autocapitalize='none';form.elements.hostname.spellcheck=false;form.elements.slug.autocapitalize='none';form.elements.type.onchange=()=>{const node=form.elements.type.value==='node';form.querySelector('[data-node-entry]').classList.toggle('hide',!node);form.elements.entry.disabled=!node;};form.elements.type.onchange();
 }
 async function create(form,data){
  if(form.dataset.submitting==='true')return;form.dataset.submitting='true';form.setAttribute('aria-busy','true');
  let status=form.querySelector('[data-create-status]');if(!status){status=document.createElement('div');status.dataset.createStatus='';form.prepend(status);}status.className='info';status.setAttribute('role','status');status.textContent='Đang kiểm tra và tạo website…';
  let site,existing=false;
  try{
   const hostname=siteHostname(data.hostname,form.dataset.zone),custom=siteSlug(data.slug,{optional:true});form.elements.hostname.value=hostname;if(custom)form.elements.slug.value=custom;
   const sites=await loadSites();site=sites.find(s=>s.hostname===hostname);
   if(site)existing=true;
   else{
    const used=new Set(sites.map(s=>s.slug));if(custom&&used.has(custom))throw Error('SITE_SLUG_ALREADY_USED');
    let slug=custom||form.dataset.pendingHost===hostname&&form.dataset.pendingSlug;
    if(!slug){const base=('web-'+hostname.split('.')[0]).replace(/[^a-z0-9-]/g,'-').slice(0,26);slug=base;let n=2;while(used.has(slug))slug=base+'-'+n++;}
    form.dataset.pendingHost=hostname;form.dataset.pendingSlug=slug;
    try{site=await post('/api/sites',{hostname,slug,type:data.type,entry:data.type==='node'?(data.entry||'').trim():'server.mjs'});}
    catch(error){try{site=(await loadSites()).find(s=>s.slug===slug&&s.hostname===hostname&&s.type===data.type);}catch{}if(!site)throw error;}
   }
  }catch(error){status.className='info danger';status.setAttribute('role','alert');status.textContent=siteInputMessage(error);status.scrollIntoView({block:'nearest'});throw error;}
  finally{delete form.dataset.submitting;form.removeAttribute('aria-busy');}
  // Remove the create form immediately: a later network failure must not offer
  // another POST /api/sites for the site that has already been created.
  modal((existing?'Website đã có · ':'Đã tạo · ')+site.hostname,`<div class="info">${existing?'Website này đã có trên máy. Mở lại để tiếp tục; không tạo trùng.':'Website đã tạo trên máy.'}</div>${next(site)}${btn('Tiếp tục xuất bản','site-publish:'+site.slug)}`);
  toast(existing?'Đã mở website có sẵn':'Đã tạo website trên máy');
  await onCreated(site);
  try{await publish(site.slug,{preview:true});}catch(error){toast('Đã tạo site; chưa tải được trạng thái xuất bản: '+error.message,true);}
 }
 async function publish(slug,{preview=false}={}){
  const site=(await loadSites()).find(s=>s.slug===slug);if(!site)throw Error('Không tìm thấy website');
  const status=await req('/api/domain-status'),domain=status.sites.find(s=>s.slug===slug),published=['DNS published','HTTPS verified'].includes(domain?.state),recovery=domain?.state==='RECOVERY REQUIRED';
  modal('Xuất bản · '+site.hostname,`<div class="info">${esc(domainStateLabel(domain?.state))}</div><p>Website: <b>${esc(site.hostname)}</b></p>${next(site)}<section id="sitePublish"><p>Đang chuẩn bị cấu hình xuất bản...</p></section>`);
  const section=document.querySelector('#sitePublish');
  if(recovery){section.innerHTML=problem(Error('CF_RECOVERY_INSPECTION_REQUIRED'))+btn('Kiểm tra Cloudflare','site-cloudflare');return;}
  if(published){section.innerHTML=`<p>${domain.state==='HTTPS verified'?'Lần kiểm tra gần nhất nhận được phản hồi HTTPS.':'DNS và route đã tạo. HTTPS chưa được xác nhận; kiểm tra Tunnel, Nginx và ứng dụng rồi thử lại.'}</p><div class="btnrow"><a href="https://${esc(site.hostname)}/" target="_blank" rel="noopener noreferrer">Mở website ↗</a>${btn('Kiểm tra lại HTTPS','site-verify:'+slug)}</div>`;return;}
  if(!status.configured){section.innerHTML=`<div class="info">Chưa kết nối API Cloudflare. Panel chưa ghi nhận DNS/route do API tạo cho site này; website đã cấu hình thủ công có thể vẫn đang public.</div><p class="help">Site mới cần được xuất bản riêng. Kết nối API một lần rồi mở lại Xuất bản. Cần token riêng với quyền DNS Edit, Zone Read và Tunnel Edit cho đúng domain/account. Connector token chạy Tunnel không có quyền tạo DNS. Nhập token tại Panel, không gửi vào chat.</p><div class="btnrow">${btn('Kết nối Cloudflare','site-cloudflare')}${btn('Tiếp tục sau','site-done')}</div>`;return;}
  // Creating a site may prepare a read-only plan, but never applies it.
  if(!preview){section.innerHTML=btn('Xem cấu hình xuất bản','site-preview:'+slug,'primary');return;}
  try{const plan=await post('/api/sites/'+slug+'/domain-preview');
   if(!plan.id){section.innerHTML='<div class="info">Chưa có API Cloudflare. Chưa tạo DNS/route.</div>'+btn('Kết nối Cloudflare','site-cloudflare');return;}
   section.innerHTML=`<h3>Cấu hình sẽ tạo</h3><p>Địa chỉ: <b>${esc(plan.hostname)}</b><br>DNS: CNAME → ${esc(plan.dnsTarget)}<br>Tunnel → Nginx trên máy</p><p class="help">Chỉ thêm tên miền này. Bản xem trước có hiệu lực 10 phút. Bấm Xuất bản sẽ thay đổi Cloudflare thật.</p><form id="sitePublishForm" data-plan="${esc(plan.id)}" data-site="${esc(slug)}" data-hostname="${esc(plan.hostname)}">${input('confirm','Nhập lại '+plan.hostname+' để xác nhận',plan.hostname)}<button class="primary wide">Xuất bản website</button></form>`;
  }catch(error){section.innerHTML=problem(error)+`<div class="btnrow">${btn('Xem lại cấu hình xuất bản','site-preview:'+slug)}${btn('Thiết lập Cloudflare','site-cloudflare')}</div>`;}
 }
 async function apply(form,data){
  if(data.confirm!==form.dataset.hostname)throw Error('Nhập đúng tên miền đã hiển thị để xác nhận');
  const slug=form.dataset.site;
  const plan=form.dataset.plan;
  modal('Đang xuất bản', '<p>Đang tạo DNS và route. Vui lòng chờ kết quả.</p>');
  let failure;
  try{await post('/api/domain-apply',{id:plan,confirm:data.confirm});}catch(error){failure=error;}
  try{await publish(slug);if(failure)document.querySelector('#sitePublish').insertAdjacentHTML('afterbegin',problem(failure));else toast('Đã tạo DNS/route. Xem kết quả kiểm tra HTTPS.');}
  catch(error){modal('Cần kiểm tra trạng thái xuất bản',`<div class="info">Chưa đọc được kết quả. Không gửi lại thao tác xuất bản trước khi kiểm tra trạng thái.</div><p>${esc(error.message)}</p>${btn('Đọc lại trạng thái','site-publish:'+slug)}`);}
 }
 async function verify(slug){try{await post('/api/sites/'+slug+'/domain-verify');await publish(slug);}catch(error){toast(error.message,true);}}
 return {open,create,publish,apply,verify};
}
