// SQL transfer stays below per-request gateway limits; database work runs in background.
export function sqlImportUi({req,modal,esc,input,toast}){
 const labels={UPLOADING:'Đang tải SQL',QUEUED:'Đang chờ tác vụ trước',VALIDATING:'Đang kiểm tra SQL',BACKING_UP:'Đang backup dữ liệu hiện tại',IMPORTING:'Đang nhập SQL',ROLLING_BACK:'Đang khôi phục backup',DONE:'Nhập SQL hoàn tất',FAILED:'Chưa nhập được SQL; dữ liệu hiện tại được giữ nguyên',ROLLED_BACK:'Nhập lỗi; đã khôi phục dữ liệu từ backup',RECOVERY_REQUIRED:'Cần kiểm tra phục hồi database trước khi nhập tiếp',CANCELLED:'Đã hủy lượt tải'};
 const running=new Set(['QUEUED','VALIDATING','BACKING_UP','IMPORTING','ROLLING_BACK']);
 const url=(name,id='')=>'/api/databases/'+encodeURIComponent(name)+'/imports'+(id?'/'+id:'');
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 function status(form,job){const text=form.querySelector('[data-sql-status]'),bar=form.querySelector('progress');if(!text)return;text.textContent=labels[job.phase]||job.phase;
  if(job.phase==='UPLOADING'){bar.value=job.size?job.offset/job.size*100:0;text.textContent+=' — '+Math.floor(job.offset/job.size*100)+'%';}else bar.removeAttribute('value');
  if(job.backup)text.textContent+=' · Backup: '+job.backup;
 }
 async function watch(form,name,job){for(let i=0;i<1200;i++){
  if(!form.isConnected)return job;status(form,job);if(!running.has(job.phase)){if(job.phase==='DONE')toast(labels.DONE);return job;}
  await pause(1000);job=(await req(url(name,job.id))).job;
 }throw Error('Tác vụ vẫn chạy nền. Mở lại Restore SQL để xem trạng thái.');}
 async function open(name){const {jobs}=await req(url(name));const pending=jobs.find(j=>j.phase==='UPLOADING'||running.has(j.phase)||j.phase==='RECOVERY_REQUIRED');
  modal('Restore SQL',`<form id="restoreForm" data-name="${esc(name)}"><div class="info danger">SQL tin cậy có thể thay dữ liệu. Backup tự tạo trước import; lỗi nhập sẽ khôi phục backup. Không nhập DB của MHC Cluster.</div><p class="help">SQL tối đa 512 MiB. Có tiến độ tải và trạng thái backup/import; tác vụ đã bắt đầu vẫn tiếp tục khi đóng cửa sổ.</p><input name="file" type="file" accept=".sql" required>${input('confirm','Nhập '+name+' để xác nhận')}<progress max="100" value="0" style="width:100%"></progress><p role="status" data-sql-status>Chọn tệp SQL và xác nhận database.</p><button class="primary" ${pending?'disabled':''}>Backup rồi restore</button>${pending?.phase==='UPLOADING'?'<button type="button" data-sql-cancel>Hủy lượt tải dở trước đó</button>':''}</form>`);
  const form=document.querySelector('#restoreForm');if(pending){status(form,pending);form.querySelector('[data-sql-cancel]')?.addEventListener('click',async()=>{try{await req(url(name,pending.id),{method:'DELETE'});await open(name);}catch(e){toast(e.message,true);}});if(running.has(pending.phase))void watch(form,name,pending).catch(e=>toast(e.message,true));}
 }
 async function submit(form,file,confirm){
  const name=form.dataset.name;if(confirm!==name)throw Error('Nhập đúng tên database để xác nhận.');if(!file||!file.size||file.size>512*1024*1024)throw Error('Chọn tệp SQL không quá 512 MiB.');
  if(!file.name.toLowerCase().endsWith('.sql'))throw Error('Cần tệp .sql chưa nén.');
  let job=(await req(url(name),{method:'POST',body:{confirm,size:file.size}})).job;
  while(job.offset<file.size){
   status(form,job);const offset=job.offset,end=Math.min(file.size,offset+job.chunkSize),blob=file.slice(offset,end);
   const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());const sha=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
   for(let attempt=0;;attempt++){try{job=(await req(url(name,job.id),{method:'PATCH',raw:true,body:blob,headers:{'x-upload-offset':String(offset),'x-chunk-sha256':sha}})).job;break;}
    catch(e){if(attempt>=2)throw e;const latest=(await req(url(name,job.id))).job;if(latest.offset===end){job=latest;break;}if(latest.offset!==offset)throw e;await pause(500);}}
  }
  status(form,job);try{job=(await req(url(name,job.id)+'/start',{method:'POST',body:{confirm}})).job;}catch(e){job=(await req(url(name,job.id))).job;if(job.phase==='UPLOADING')throw e;}
  await watch(form,name,job);
 }
 return {open,submit};
}
