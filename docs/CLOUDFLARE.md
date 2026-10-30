# Cloudflare trực tiếp — không Worker/DO

Chỉ tạo tài nguyên **MHS riêng**. Không dùng lại Tunnel/hostname của MHC hoặc sửa
DNS/Access production. Cấu hình này chưa được chạy trong tài khoản thật.

1. Trong Cloudflare Zero Trust, tạo một Cloudflare Tunnel loại cloudflared mới,
   ví dụ `mhs-my-phone`. Chọn connector để lấy Tunnel token. Đây là token chạy
   connector, không phải API token quản lý account. Không gửi token vào chat.
2. Tạo Access → Applications → Self-hosted cho **hostname Panel MHS mới** của bạn,
   ví dụ `mhs-panel.example.com`. Thêm Allow policy chỉ email của bạn; không dùng
   Everyone/Bypass. Lấy Team domain và Application Audience (AUD).
3. Trên điện thoại chạy `mhs cloudflare`. Nhập hostname, Team domain, AUD và dán
   connector token tại lời nhắc ẩn. Token nằm private0600 trên chính điện thoại,
   không truyền argv, không có API token hoặc Worker secret.
4. Trong Tunnel → Published application routes, thêm hostname Panel:
   service HTTP `127.0.0.1:9090`. Giữ HTTP Host header là hostname Panel đã khai báo,
   **không override thành localhost**. Bật Protect with Access / Access JWT
   validation, Team name và AUD đúng app. Origin Panel cũng kiểm JWT RS256.
5. Tạo site trong Panel, ví dụ `www.example.com`. Trong Tunnel, thêm hostname đó
   với service HTTP `127.0.0.1:8080`, giữ Host header theo hostname website.
   Mỗi website một exact hostname; không dùng wildcard mặc định. Không tạo route
   nếu DNS đã tồn tại/đang phục vụ ứng dụng khác. DNS CNAME tới Tunnel mới chỉ
   được tạo cho hostname MHS bạn đã chọn.
6. `mhs service mhs-tunnel up`. Vào Panel qua Access rồi đăng nhập admin bằng
   mật khẩu riêng của MHS. Kiểm website qua HTTPS. Chưa thấy HTTP đúng thì chưa
   gọi là đã publish. Lúc cài WordPress lần đầu hãy bảo vệ cả hostname site bằng
   Access đến khi hoàn tất `/wp-admin/install.php`.

Nhiều website dùng chung **một Tunnel của điện thoại**. Nginx chọn vhost theo Host.
Không mở SSH/MariaDB/Panel9090/Monitor9091 bằng public-hostname hoặc port forwarding.
Không thêm Worker routes vào hostname MHS. Khi Tunnel/Internet mất, Panel và site
vẫn chạy loopback; LAN Monitor9091 vẫn xem từ LAN. Panel qua PC dùng SSH forwarding.
Không cam kết 0 request toàn account; MHS không gọi MHC Worker/DO.

Thiếu quyền tạo Tunnel/Access/DNS: chủ account thao tác đúng các bước trên.
Hosting local không cần chờ quyền Cloudflare. Rollback publish: xóa đúng route/DNS
MHS vừa tạo, dừng mhs-tunnel; không xóa hay đổi tài nguyên MHC.

Tài liệu chính thức:
[Tunnel setup](https://developers.cloudflare.com/tunnel/get-started/),
[token-file](https://developers.cloudflare.com/tunnel/reference/run-parameters/),
[origin Access validation](https://developers.cloudflare.com/api/resources/zero_trust/subresources/tunnels/subresources/cloudflared/).
