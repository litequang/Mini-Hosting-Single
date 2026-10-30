# Mini Hosting Single

Hosting độc lập trên một Android/Termux, phát triển từ original Hosting Panel
9090 của MHC. Đây là repo riêng; không nâng cấp hay chuyển đổi node Cluster.

Internet → Cloudflare Tunnel → Nginx → website. Panel chạy trên chính điện thoại.
Không Authority, Worker/DO, heartbeat, Primary/Standby hoặc replication.
Hoạt động thông thường phát sinh **0 request đến MHC Worker/DO**; không nói thay
cho ứng dụng khác trong tài khoản Cloudflare.

Source và kiểm thử PC đang phát triển theo S1 → S2 → S3.
Nghiệm thu Android/Internet: **NOT RUN**, cần thiết bị sạch được phép riêng.
Xem [tiến độ](docs/LIVE-PROGRESS.md), [nguồn tái sử dụng](docs/PROVENANCE.md).

Dev trên PC (Node ≥22.16, không cần npm dependencies):

```powershell
npm run check
npm test
```

Để mở Panel thử, đặt MHS_HOME và MHS_DATA vào thư mục cách ly ngoài source,
chạy `npm run setup`, đọc private `initial-password` tại đó rồi `npm start`.
Mở http://127.0.0.1:9090, user admin. Hosting services cần Termux/Linux;
PC không có Nginx/PHP/MariaDB không phải nghiệm thu hosting Android.

Monitor LAN không đăng nhập: `http://IP-điện-thoại:9091`, chỉ số liệu tài nguyên
và trạng thái dịch vụ, tự làm mới 5 giây. Không có thao tác quản trị hoặc logs.
Bộ cài mới bật Monitor LAN; tắt bằng settings.json / CLI (hướng dẫn vận hành).
Không publish port9091 qua Tunnel hoặc port forwarding.
