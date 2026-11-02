const $=s=>document.querySelector(s);
const bytes=v=>{if(!Number.isFinite(v))return '—';let n=v,i=0;while(n>=1024&&i<4){n/=1024;i++;}return n.toFixed(1)+' '+['B','KB','MB','GB','TB'][i];};
const unit=(v,u)=>Number.isFinite(v)?v.toFixed(1)+u:'—';
function card(label,value,detail='',className=''){const el=document.createElement('article');el.className='card';for(const [tag,text] of [['small',label],['strong',value],['span',detail]]){const c=document.createElement(tag);c.textContent=text;if(tag==='strong')c.className=className;el.append(c);}return el;}
function metricCards(d){
 const values=[],finite=Number.isFinite;
 if(finite(d.cpuPct))values.push(['CPU',unit(d.cpuPct,'%')]);
 if(finite(d.mem?.total)&&finite(d.mem?.available))values.push(['RAM đã dùng',bytes(d.mem.total-d.mem.available),'Tổng '+bytes(d.mem.total)]);
 if(finite(d.disk?.available))values.push(['Dung lượng trống',bytes(d.disk.available),finite(d.disk.total)?'Tổng '+bytes(d.disk.total):'']);
 if(finite(d.battery?.percentage))values.push(['Pin',unit(d.battery.percentage,'%'),finite(d.battery.temperature)?'Nhiệt độ '+unit(d.battery.temperature,'°C'):'']);
 else if(finite(d.battery?.temperature))values.push(['Nhiệt độ pin',unit(d.battery.temperature,'°C')]);
 if(finite(d.network?.rxPerSecond))values.push(['Mạng nhận',bytes(d.network.rxPerSecond)+'/s','Không gồm loopback']);
 if(finite(d.network?.txPerSecond))values.push(['Mạng gửi',bytes(d.network.txPerSecond)+'/s','Không gồm loopback']);
 return values.map(v=>card(...v));
}
let busy=false;
async function refresh(){if(busy||document.hidden)return;busy=true;const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4000);try{
 const r=await fetch('/api/metrics',{cache:'no-store',headers:{'x-requested-with':'XMLHttpRequest'},signal:abort.signal});if(!r.ok)throw Error();const d=await r.json();
 $('#device').textContent=d.device||'';$('#device').hidden=!d.device;$('#connection').textContent='Đang kết nối';$('#connection').className='running';
 $('#metrics').replaceChildren(...metricCards(d));
 $('#services').replaceChildren(...d.services.map(s=>card(s.name,s.running?'Đang chạy':'Chưa chạy','',s.running?'running':'offline')));
 $('#updated').hidden=!Number.isFinite(Date.parse(d.time));$('#updated').textContent=$('#updated').hidden?'':'Cập nhật: '+new Date(d.time).toLocaleString('vi-VN');
 }catch{$('#connection').textContent='Mất kết nối';$('#connection').className='offline';}finally{clearTimeout(timer);busy=false;}}
setInterval(refresh,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});refresh();
