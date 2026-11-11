const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=j=>j&&!['DONE','ROLLED_BACK'].includes(j.phase);
const phases={PREPARING:'Đang kiểm tra ZIP',APPLYING:'Đang ghi file',DONE:'Đã hoàn tất',ROLLED_BACK:'Đã khôi phục bản trước',RECOVERY_REQUIRED:'Cần khôi phục'};
export async function showUnzip({area,slug,archive,dir='',request,refresh}){
 const api='/api/files/'+slug,post=(action,body)=>request(api+'/'+action,{method:'POST',body});
 const owner=crypto.randomUUID();area.dataset.unzipId=owner;
 let dest=dir,plan=null,journal=null,busy=false,error='',message='',operationId=null,pending=null,uncertain=false,finished=false;
 const status=()=>request(api+'/unzip-status'+(operationId?'?id='+operationId:''));
 function paint(){
  if(!area.isConnected||area.dataset.unzipId!==owner)return;
  area.setAttribute('aria-busy',String(busy));
  area.innerHTML=`<h3>Giải nén ZIP · ${esc(archive||slug)}</h3>
   <p class="help">Để trống đích để giải nén vào gốc website. ZIP phải chứa index.html ở gốc nếu muốn mở trang chủ ngay; nếu ZIP chứa dist/, các file sẽ nằm trong dist/. File ngoài ZIP được giữ nguyên. Giải nén không restart Node.js.</p>
   ${error?`<p class="info danger" role="alert">${esc(error)}</p>`:''}
   <p role="status" data-unzip-status>${esc(message)}${journal?` · ${esc(phases[journal.phase]||journal.phase)}${journal.total!==undefined?' · '+journal.files+'/'+journal.total+' file':''}${journal.archive?' · '+esc(journal.archive):''}`:''}</p>
   ${archive&&!finished?`<form data-unzip-preview><label class="inputgroup">Thư mục đích (từ gốc website)<input name="dest" value="${esc(dest)}" placeholder="Để trống = gốc website" autocomplete="off" autocapitalize="none" ${busy||uncertain||pending?'disabled':''}></label><button ${busy||uncertain||active(journal)?'disabled':''}>Xem trước ZIP</button></form>`:''}
   ${plan&&!finished?`<form data-unzip-apply><p><b>${plan.files} mục</b> · ${(plan.bytes/1048576).toFixed(1)} MiB → <b>/${esc(plan.dest)}</b><br>${plan.conflicts} file đã có tại đích.</p>${plan.conflicts?'<label class="inputgroup">Khi file đã có<select name="mode"><option value="skip">Giữ file cũ, bỏ qua file trùng</option><option value="overwrite">Ghi đè bằng file trong ZIP</option></select></label>':'<input type="hidden" name="mode" value="cancel">'}<button class="primary" ${busy||uncertain||active(journal)?'disabled':''}>Giải nén vào /${esc(plan.dest)}</button></form>`:''}
   ${finished?'<p class="info">Giải nén thành công. Có thể mở website để kiểm tra.</p><button data-unzip-files>Xem danh sách file mới</button>':''}
   <p><button data-unzip-check ${busy?'disabled':''}>Đọc lại trạng thái</button></p>
   ${active(journal)&&!busy?`<p class="help">Nếu thao tác bị gián đoạn, khôi phục trước khi giải nén lại. Khôi phục sẽ hoàn tác những file của lần giải nén này.</p><form data-unzip-recover><label>Nhập ${esc(slug)} để khôi phục<input name="confirm" required autocomplete="off"></label><button class="warn">Khôi phục lần giải nén gián đoạn</button></form>`:''}`;
  for(const field of area.querySelectorAll('button,select'))if(busy)field.disabled=true;
  const mode=area.querySelector('select[name="mode"]');if(mode&&pending){mode.value=pending.mode;mode.disabled=true;}
 }
 function accept(data){journal=data.journal;if(operationId&&journal?.id===operationId){if(journal.phase==='DONE'){finished=true;plan=null;uncertain=false;error='';message=`Đã giải nén ${journal.result?.files??journal.files} file.`;}else if(journal.phase==='ROLLED_BACK'){plan=null;uncertain=false;operationId=null;pending=null;message='Lần giải nén đã được hoàn tác. Xem trước ZIP để thử lại.';}else uncertain=true;}}
 async function run(fn){if(busy)return;busy=true;error='';paint();try{await fn();}catch(e){error=e.message;}finally{busy=false;paint();}}
 area.onclick=e=>{e.stopPropagation();if(e.target.closest('[data-unzip-files]'))void refresh();if(e.target.closest('[data-unzip-check]'))void run(async()=>{const data=await status();uncertain=false;accept(data);message=finished?message:journal?'Đã đọc trạng thái trên máy.':'Chưa ghi nhận thao tác; có thể gửi lại cùng yêu cầu an toàn.';});};
 area.oninput=e=>{e.stopPropagation();if(e.target.name==='dest'){dest=e.target.value;plan=null;operationId=null;pending=null;area.querySelector('[data-unzip-apply]')?.remove();}};
 area.onsubmit=e=>{e.preventDefault();e.stopPropagation();const form=e.target,data=new FormData(form);
  if(form.hasAttribute('data-unzip-preview'))void run(async()=>{dest=String(data.get('dest')||'');plan=null;operationId=null;pending=null;finished=false;message='Đang đọc và kiểm tra ZIP, vui lòng chờ…';paint();const p=await post('unzip-preview',{archive,dest,mode:'cancel'});dest=p.dest;plan=p;message='Đã kiểm tra ZIP. Chọn cách xử lý file trùng rồi bấm Giải nén.';});
  if(form.hasAttribute('data-unzip-apply')&&plan&&!uncertain)void run(async()=>{
   const mode=String(data.get('mode'));operationId||=crypto.randomUUID();pending||={archive,dest:plan.dest,sha256:plan.sha256,mode,confirm:slug,operationId};message='Đang giải nén, vui lòng chờ. Không cần bấm lại.';paint();
   let polling=false,stopped=false;const timer=setInterval(async()=>{if(polling||!area.isConnected||area.dataset.unzipId!==owner)return;polling=true;try{const data=await status();if(stopped)return;journal=data.journal;const text=area.querySelector('[data-unzip-status]');if(text&&journal&&area.dataset.unzipId===owner)text.textContent=(phases[journal.phase]||journal.phase)+(journal.total!==undefined?` · ${journal.files}/${journal.total} file`:'');}catch{}finally{polling=false;}},2000);
   try{const result=await post('unzip',pending);finished=true;plan=null;message=`Đã giải nén ${result.files} file.`;journal={id:result.id,phase:'DONE',files:result.files};}
   catch(e){uncertain=true;try{accept(await status());if(!journal&&/^[A-Z][A-Z0-9_]+$/.test(e.message)){plan=null;operationId=null;pending=null;uncertain=false;}}catch{}if(!finished){error=e.message;message='Kiểm tra trạng thái trước khi thao tác tiếp. Yêu cầu có mã riêng để tránh giải nén trùng khi gửi lại.';}}
   finally{stopped=true;clearInterval(timer);}
  });
  if(form.hasAttribute('data-unzip-recover'))void run(async()=>{if(data.get('confirm')!==slug)throw Error('Nhập đúng mã website '+slug);await post('unzip-recover',{confirm:slug});operationId=null;pending=null;uncertain=false;plan=null;journal=(await status()).journal;message='Đã khôi phục. Xem trước ZIP để giải nén lại.';});
 };
 paint();area.scrollIntoView({block:'nearest'});await run(async()=>{journal=(await status()).journal;message=active(journal)?'Cần kiểm tra lần giải nén trước.':'Chọn thư mục đích rồi Xem trước ZIP.';});
}
