const $=s=>document.querySelector(s);
const bytes=v=>{if(!Number.isFinite(v))return '—';let n=v,i=0;while(n>=1024&&i<4){n/=1024;i++;}return n.toFixed(1)+' '+['B','KB','MB','GB','TB'][i];};
const unit=(v,u)=>Number.isFinite(v)?v.toFixed(1)+u:'—';
function card(label,value,detail='',className=''){const el=document.createElement('article');el.className='card';for(const [tag,text] of [['small',label],['strong',value],['span',detail]]){const c=document.createElement(tag);c.textContent=text;if(tag==='strong')c.className=className;el.append(c);}return el;}
let busy=false;
async function refresh(){if(busy||document.hidden)return;busy=true;const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4000);try{
 const r=await fetch('/api/metrics',{cache:'no-store',signal:abort.signal});if(!r.ok)throw Error();const d=await r.json();
 $('#device').textContent=d.device;$('#connection').textContent='Đang kết nối';$('#connection').className='running';
 $('#metrics').replaceChildren(...[
  ['CPU',unit(d.cpuPct,'%'),'Toàn thiết bị khi Android cho phép'],
  ['RAM đã dùng',bytes(d.mem.total-d.mem.available),'Tổng '+bytes(d.mem.total)],
  ['Dung lượng trống',bytes(d.disk?.available),'Tổng '+bytes(d.disk?.total)],
  ['Pin',unit(d.battery.percentage,'%'),'Nhiệt độ '+unit(d.battery.temperature,'°C')],
  ['Mạng nhận',Number.isFinite(d.network?.rxPerSecond)?bytes(d.network.rxPerSecond)+'/s':'—','Không gồm loopback'],
  ['Mạng gửi',Number.isFinite(d.network?.txPerSecond)?bytes(d.network.txPerSecond)+'/s':'—','Lần lấy mẫu thứ hai trở đi']
 ].map(v=>card(...v)));
 $('#services').replaceChildren(...d.services.map(s=>card(s.name,s.running?'Đang chạy':'Chưa chạy','',s.running?'running':'offline')));
 $('#updated').textContent='Cập nhật: '+new Date(d.time).toLocaleString('vi-VN');
 }catch{$('#connection').textContent='Mất kết nối';$('#connection').className='offline';}finally{clearTimeout(timer);busy=false;}}
setInterval(refresh,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});refresh();
