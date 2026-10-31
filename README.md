# Mini Hosting Single V2.1

**Latest source: 2.1.0-rc.6** with guided Node deployment and large SQL restore.
Use the [current installer](docs/INSTALL.md) and [Node deployment guide](docs/NODE-DEPLOY.md).
Earlier pinned commands keep installing their historical releases. Fresh Android
installation/reboot acceptance remains separate from targeted deployment checks.

Hosting độc lập trên một Android/Termux, phát triển từ original Hosting Panel
9090 của MHC. Đây là repo riêng; không nâng cấp hay chuyển đổi node Cluster.

Internet → Cloudflare Tunnel → Nginx → website. Panel chạy trên chính điện thoại.
Không Authority, Worker/DO, heartbeat, Primary/Standby hoặc replication.
Hoạt động thông thường phát sinh **0 request đến MHC Worker/DO**; không nói thay
cho ứng dụng khác trong tài khoản Cloudflare.

Release candidate **2.1.0-rc.6**: tiếp tục original Panel, có kiểm thử PC theo
checkpoint. Targeted11T upgrade/Node/SQL/public HTTPS PASS; full fresh install
and reboot acceptance remain pending.
Xem [tiến độ](docs/LIVE-PROGRESS.md), [nguồn tái sử dụng](docs/PROVENANCE.md).

- Website Manager: tạo/sửa/xóa static, Node, PHP, WordPress; hostname/entry/port/env.
- Cài WordPress từ Panel với core/checksum chính thức và credentials riêng.
- ZIP/prebuilt dist, code rollback, Files và Database Manager.
- Backup/restore site files+SQL/SHA256, safety backup và recovery journal.
- Services/runit/Boot, Monitor và màn hình LAN9091 không đăng nhập.
- Panel Internet Access SSO: không nhập Admin lần2; local9090 vẫn có password.
- Remote Monitor riêng qua Access9092, độc lập Panel; wizard tiếng Việt + doctor.
- Installer có checksum/resume, source upgrade/rollback giữ data.
- V2.1: Uppy/Tus upload512MiB, resume/checksum; ZIP streaming, thùng rác,
  CodeMirror và deploy riêng frontend giữ backend/database.
- Adminer MySQL theo từng site, qua phiên Panel; không có cổng Adminer public.
- Restic mã hóa, recovery kit, lịch cron/chu kỳ và restore có kiểm chứng.
- Cloudflare SDK: preview/apply exact hostname, giữ ingress khác, kiểm ownership
  và rollback có điều kiện; API token tùy chọn, wizard thủ công vẫn dùng được.
- First-site wizard; reset chỉ cách ly dữ liệu MHS sau backup ngoài máy đã kiểm.

[Cài / nâng cấp](docs/INSTALL.md) · [Hosting](docs/HOSTING.md) ·
[Cloudflare](docs/CLOUDFLARE.md) · [Backup](docs/BACKUP-RESTORE.md) ·
[PASS / NOT RUN](docs/ACCEPTANCE.md) · [Thay đổi V2.1](docs/CHANGELOG.md).

[**Lệnh cài / nâng cấp V2.1 ghim commit + SHA256**](docs/INSTALL.md#install-21-rc2),
[Cloudflare Panel/Monitor](docs/CLOUDFLARE.md),
[domain automation](docs/DOMAIN-AUTOMATION.md),
[backup mã hóa](docs/ENCRYPTED-BACKUP.md). Các gói RC1/RC2 cũ giữ bất biến.
Không dùng curl main | bash hoặc cài lên node MHC.

Dev trên PC (Node ≥22.16): runtime đã vendor trong repo; `npm ci --ignore-scripts`
cài dependency khóa phiên bản để rebuild/test browser. Không cần npm trên Android.

```powershell
npm run check
npm test
# Chỉ khi đổi dependency/vendor entry:
npm run vendor
```

Để mở Panel thử, đặt MHS_HOME và MHS_DATA vào thư mục cách ly ngoài source,
chạy `npm run setup`, đọc private `initial-password` tại đó rồi `npm start`.
Monitor độc lập: `node panel/src/monitor-server.mjs` trong cùng môi trường cách ly.
Mở http://127.0.0.1:9090, user admin. Hosting services cần Termux/Linux;
PC không có Nginx/PHP/MariaDB không phải nghiệm thu hosting Android.

Monitor LAN không đăng nhập: `http://IP-điện-thoại:9091`, chỉ số liệu tài nguyên
và trạng thái dịch vụ, tự làm mới 5 giây. Không có thao tác quản trị hoặc logs.
Bộ cài mới bật Monitor LAN; tắt bằng settings.json / CLI (hướng dẫn vận hành).
Không publish port9091 qua Tunnel hoặc port forwarding.
