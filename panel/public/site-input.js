// Shared by the original Panel form and API; accepts hostnames and root URLs.
export function siteHostname(value,zone=''){
 if(typeof value!=='string'||!value.trim())throw Error('SITE_HOSTNAME_REQUIRED');
 let name=value.trim();
 if(name.includes('://')){let url;try{url=new URL(name);}catch{throw Error('SITE_HOSTNAME_INVALID');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error('SITE_HOSTNAME_ROOT_URL_ONLY');name=url.hostname;}
 else if(name.endsWith('/'))name=name.slice(0,-1);
 name=name.toLowerCase().replace(/\.$/,'');if(!name.includes('.')&&zone)name+='.'+zone.toLowerCase();
 if(name.length>253||name.length<4||! /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(name))throw Error('SITE_HOSTNAME_INVALID');
 return name;
}
export function siteSlug(value,{optional=false}={}){
 const slug=typeof value==='string'?value.trim().toLowerCase():'';if(!slug&&optional)return '';
 if(!/^[a-z][a-z0-9-]{1,30}$/.test(slug)||['panel','admin','api','default','pro'].includes(slug))throw Error('SITE_SLUG_INVALID');return slug;
}
export function siteInputMessage(error){const messages={
 SITE_HOSTNAME_REQUIRED:'Nhập subdomain hoặc tên miền của website.',
 SITE_HOSTNAME_INVALID:'Tên miền chưa hợp lệ. Ví dụ: gplx.thophuong.com hoặc subdomain gplx khi đã kết nối domain.',
 SITE_HOSTNAME_ROOT_URL_ONLY:'Chỉ nhập tên miền hoặc URL gốc, ví dụ https://gplx.thophuong.com/. Bỏ đường dẫn, cổng, tài khoản và tham số.',
 SITE_SLUG_INVALID:'Mã thư mục cần 2–31 ký tự: bắt đầu bằng chữ, chỉ gồm chữ, số và dấu gạch ngang.',
 SITE_SLUG_ALREADY_USED:'Mã thư mục này đã được dùng cho website khác. Để trống để Panel tự cấp mã mới.',
 'Invalid site config':'Thông tin website chưa hợp lệ. Kiểm tra tên miền, loại web và mã thư mục.',
 'Invalid Node entrypoint':'Nhập entry Node.js, ví dụ server.mjs hoặc dist/server.cjs.',
 'Site slug or hostname already exists':'Website hoặc mã thư mục đã có. Kiểm tra danh sách trước khi tạo lại.',
 SITE_DIRECTORY_EXISTS:'Thư mục này đã tồn tại trên máy. Chọn mã thư mục khác; dữ liệu cũ được giữ nguyên.'
 };return messages[error.message]||'Chưa tạo được website: '+error.message;
}
