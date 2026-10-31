export function nodeSetupUi({req,modal,esc,input,toast}){
 const labels={QUEUED:'Đang chờ tác vụ trước',INSTALLING:'Đang cài thư viện từ package-lock.json',APPLYING:'Đang đưa thư viện vào ứng dụng',READY:'Đã cài thư viện.',FAILED:'Cài thư viện chưa thành công. Kiểm tra package.json và package-lock.json.',RECOVERY_REQUIRED:'Cần kiểm tra phục hồi thư viện trước khi thử lại.'};
 const url=(slug,action='node-setup')=>'/api/sites/'+encodeURIComponent(slug)+'/'+action;
 const pending=s=>['QUEUED','INSTALLING','APPLYING','RECOVERY_REQUIRED'].includes(s.job?.phase);
 function show(form,s){
  form.querySelector('[data-node-status]').textContent=s.job?(labels[s.job.phase]||s.job.phase):'Chưa chạy cài thư viện.';
  form.querySelector('[data-node-missing]').textContent=String(s.missingDependencies.length);
  for(const button of form.querySelectorAll('button'))button.disabled=pending(s)||(button.value==='install'&&(!s.entryExists||!s.package||!s.lock))||(button.value==='start'&&(!s.entryExists||s.missingDependencies.length>0));
 }
 async function watch(form,slug,s){for(let i=0;i<1200&&form.isConnected;i++){show(form,s);if(!['QUEUED','INSTALLING','APPLYING'].includes(s.job?.phase))return;await new Promise(r=>setTimeout(r,1000));s=await req(url(slug));}}
 async function open(slug){
  const s=await req(url(slug,'node-config'));
  modal('Triển khai Node.js',`<form id="nodeSetupForm" data-slug="${esc(slug)}"><p><b>${esc(s.hostname)}</b> · File chạy: <code>${esc(s.entry)}</code> (${s.entryExists?'đã có':'chưa có'}).</p><p class="help">Upload bản build có backend cùng package.json và package-lock.json vào thư mục gốc ứng dụng. Chỉ có dist của frontend thì chưa chạy được backend.</p><h3>1. Cài thư viện</h3><p>${s.dependencies} thư viện; còn thiếu <span data-node-missing>${s.missingDependencies.length}</span>. package.json: ${s.package?'đã có':'chưa có'}; package-lock.json: ${s.lock?'đã có':'chưa có'}.</p><p class="help">Cài bản production theo lockfile. Thư viện cũ được giữ để phục hồi. Các gói cần build native hoặc script cài riêng cần được chuẩn bị tương thích Android.</p>${input('confirm','Nhập '+slug+' để xác nhận các bước dưới')}<button name="step" value="install">Cài / cập nhật thư viện</button><p role="status" data-node-status></p><h3>2. Gắn database và cấu hình</h3><div class="inputgroup"><label>Database MySQL của ứng dụng</label><select name="database"><option value="">${s.database?'Giữ database hiện tại':'Không dùng / giữ cấu hình riêng'}</option>${s.databases.map(name=>`<option value="${esc(name)}" ${name===s.database?'selected':''}>${esc(name)}</option>`).join('')}</select></div><p class="help">MHS tự lưu tài khoản, mật khẩu và socket MariaDB vào cấu hình riêng; đặt URL HTTPS và chế độ production. Restore SQL tại mục Databases nếu ứng dụng cần dữ liệu. Khóa API hoặc OAuth riêng có thể thêm ở Settings của website.</p><button name="step" value="configure">Lưu cấu hình</button><h3>3. Khởi động và kiểm tra</h3><button class="primary" name="step" value="start">Khởi động bản mới / kiểm tra HTTP</button><p role="status" data-node-health></p><p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Mở website ↗</a></p><p class="help">Hostname cần được trỏ trong Cloudflare Tunnel tới Nginx cổng 8080. Cài thư viện không tự build mã nguồn hoặc chạy migration database.</p></form>`);
  const form=document.querySelector('#nodeSetupForm');show(form,s);if(['QUEUED','INSTALLING','APPLYING'].includes(s.job?.phase))void watch(form,slug,s).catch(e=>toast(e.message,true));
 }
 async function submit(form,data,step){
  const slug=form.dataset.slug,body={confirm:data.confirm};
  if(step==='install'){const s=await req(url(slug),{method:'POST',body});await watch(form,slug,s);return;}
  if(step==='configure'){await req(url(slug,'node-config'),{method:'POST',body:{...body,database:data.database}});toast('Đã lưu cấu hình riêng cho ứng dụng.');return;}
  if(step==='start'){const out=form.querySelector('[data-node-health]');out.textContent='Đang khởi động và kiểm tra HTTP…';const result=await req(url(slug,'node-start'),{method:'POST',body});out.textContent=result.started?'Ứng dụng đã phản hồi HTTP '+result.health.status+'.':result.error==='NODE_PLACEHOLDER_NOT_DEPLOYED'?'Cổng vẫn đang trả trang mẫu. Kiểm tra entrypoint và tiến trình cũ.':'Ứng dụng chưa phản hồi HTTP. Kiểm tra Logs, cấu hình và dữ liệu SQL.';return;}
 }
 return {open,submit};
}
