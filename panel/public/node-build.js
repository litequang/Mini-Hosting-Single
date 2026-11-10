const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function showNodeBuild({area,slug,archive,request,notify}){
 const api='/api/sites/'+slug,post=(action,body)=>request(api+'/'+action,{method:'POST',body});
 let plan=null,busy=false,error='';
 function paint(status){
  const j=status?.journal,recovery=j&&!['DONE','ROLLED_BACK'].includes(j.phase);
  area.innerHTML=`<h3>Cập nhật Node.js · /${esc(status?.target||plan?.target||'build')}</h3>
   <p class="help">Thay thư mục build chứa backend, tự restart và kiểm tra HTTP. Giữ package.json, node_modules, .env, storage, sheets và database bên ngoài thư mục build. ZIP chỉ chứa bản build; thay dependency cần cài thư viện riêng.</p>
   ${error?`<p class="info danger" role="alert">${esc(error)}</p>`:''}
   ${j?`<p data-node-build-phase>Trạng thái: <b>${esc(j.phase)}</b>${j.errorCode?' · '+esc(j.errorCode):''}</p>`:''}
   ${recovery?'<p class="info danger">Cập nhật bị gián đoạn. Khôi phục bản trước trước khi sửa file hoặc triển khai tiếp.</p>':''}
   ${plan?`<p>ZIP: <b>${esc(archive)}</b> → <b>/${esc(plan.target)}</b><br>Entry: ${esc(plan.entry)} · ${plan.files} file · ${(plan.bytes/1024/1024).toFixed(1)} MiB</p><form data-node-build-form="deploy"><label class="inputgroup">Nhập ${esc(slug)} để cập nhật<input name="confirm" required autocomplete="off" placeholder="${esc(slug)}"></label><button class="primary">Cập nhật và restart Node.js</button></form>`:''}
   ${j&&j.phase!=='ROLLED_BACK'?`<form data-node-build-form="rollback"><label class="inputgroup">Nhập ${esc(slug)} để khôi phục bản trước<input name="confirm" required autocomplete="off" placeholder="${esc(slug)}"></label><button class="warn">${recovery?'Khôi phục cập nhật gián đoạn':'Rollback bản Node.js trước'}</button></form>`:''}
   <p><button data-node-build-refresh>Đọc lại trạng thái</button>${archive&&!plan&&!recovery?' <button data-node-build-preview>Preview ZIP lại</button>':''}</p>`;
  area.scrollIntoView({block:'nearest'});
 }
 async function status(){return request(api+'/node-build-status');}
 async function preview(){plan=null;error='';paint(await status());plan=await post('node-build-preview',{archive});paint(await status());}
 async function run(fn){if(busy)return;busy=true;for(const b of area.querySelectorAll('button'))b.disabled=true;try{await fn();}catch(e){error=e.message;plan=null;try{paint(await status());}catch{area.innerHTML=`<p class="info danger" role="alert">${esc(error)}. Không gửi lại deploy khi chưa đọc được trạng thái. Mở lại mục cập nhật để kiểm tra.</p>`;}notify(error,true);}finally{busy=false;for(const b of area.querySelectorAll('button'))b.disabled=false;}}
 area.onclick=e=>{e.stopPropagation();if(e.target.closest('[data-node-build-refresh]'))void run(async()=>{plan=null;error='';paint(await status());});if(e.target.closest('[data-node-build-preview]'))void run(preview);};
 area.onsubmit=e=>{e.preventDefault();e.stopPropagation();const form=e.target,confirm=new FormData(form).get('confirm');if(confirm!==slug){notify('Nhập đúng tên site '+slug,true);return;}
  void run(async()=>{const action=form.dataset.nodeBuildForm;if(action==='deploy'){if(!plan)return;const id=plan.id;plan=null;await post('node-build-deploy',{id,confirm});notify('Đã cập nhật Node.js và kiểm tra HTTP.');}else{plan=null;await post('node-build-rollback',{confirm});notify('Đã khôi phục bản Node.js trước và kiểm tra HTTP.');}error='';paint(await status());});
 };
 await run(archive?preview:async()=>paint(await status()));
}
