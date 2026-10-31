# Panel SSO và Remote Monitor — Issue #1

V2.1 thêm [Auto Publish Domain](DOMAIN-AUTOMATION.md) bằng official SDK/API token
giới hạn. Đây là quyền riêng tùy chọn cho website; wizard Panel/Monitor bên dưới
vẫn dùng connector token và thao tác Access thủ công, không tự đổi policy.

Chỉ sử dụng Tunnel/hostname MHS riêng. Không sửa DNS/Access/Tunnel production hoặc
của MHC. Không cần Worker, Durable Object, API token hay Codex SSH để cài từng máy.

| Bề mặt | Origin trong Tunnel | Đăng nhập |
|---|---|---|
| panel.example.com | HTTP `127.0.0.1:9093` | Cloudflare Access → vào thẳng Panel |
| monitor.example.com | HTTP `127.0.0.1:9092` | Cloudflare Access; độc lập với Panel |
| www.example.com | HTTP `127.0.0.1:8080` | Theo ứng dụng website |
| Panel local/SSH | `127.0.0.1:9090` | Mật khẩu Admin, dùng cả khi mất Internet |
| Monitor LAN | `PHONE_PRIVATE_IP:9091` | Không đăng nhập, chỉ đọc |

**Không publish9090/9091/3306/8022** qua Tunnel hoặc port forwarding.9092/9093 chỉ
bind loopback. Mỗi remote request kiểm JWT RS256, issuer, AUD, thời gian, exact
hostname và email chủ máy trong claims đã ký. Monitor không có API điều khiển,
không cần cookie/session Panel. LAN9091 vẫn chỉ đọc và chặn proxy/Cloudflare headers.

## Những bước bạn thao tác một lần trong Cloudflare

1. Đăng nhập Cloudflare Zero Trust, chọn **Networks / Connectors / Cloudflare
   Tunnels** (tên mục có thể là Networking → Tunnels). Dùng một named Tunnel
   **MHS riêng đang có**, hoặc Create a tunnel → Cloudflared → tên như mhs-phone.
   Chọn connector để lấy token trong lệnh cài connector. Chỉ lấy phần token;
   không chạy lệnh daemon thứ hai khi MHS đã quản lý cloudflared bằng runit.
2. Vào **Access → Applications → Add an application → Self-hosted**. Tạo app
   Panel cho exact hostname mới, ví dụ panel.example.com. Tạo Allow policy với
   **Emails → đúng email chủ thiết bị**. Không chọn Everyone/Bypass hoặc nguyên
   email domain. Dùng thời gian session≤24h. Lấy **Application Audience (AUD) Tag**
   của app ở phần Overview/Settings; AUD không phải connector token.
3. Tạo **app Access thứ hai** cho monitor.example.com, Allow cùng email chủ máy.
   Copy AUD riêng của Monitor, không dùng lại AUD Panel. Vào Settings → Custom
   Pages/Team domain (tùy giao diện) để xem full domain `TEAM.cloudflareaccess.com`.
4. Trên Termux chạy `mhs cloudflare` hoặc `mhs setup remote`. Nhập email chủ máy,
   Team domain, hai hostname, hai AUD và connector token tại lời nhắc ẩn. Token
   lưu0600 trên điện thoại, không vào argv/log/Git. Chạy lại có thể để trống token
   để giữ token cũ. Wizard không yêu cầu account API token.
5. Wizard hiện bảng route. Trong **Tunnel MHS → Published application routes**
   (hoặc Public hostnames) → Add route, thêm đúng hai hostname/origin theo bảng.
   Với từng route Panel/Monitor, bật **Protect with Access / Access JWT validation**,
   Team name (phần trước .cloudflareaccess.com) và AUD đúng app đó.
   Giữ HTTP Host header theo **hostname public**, không override thành localhost.
   DNS được Cloudflare tạo khi thêm hostname mới; nếu đã tồn tại hoặc phục vụ
   ứng dụng khác thì dừng, không ghi đè. Không thêm Worker route hoặc wildcard.
6. Website khác của MHS đi8080 và giữ Host đúng website. Không đổi site cũ của
   MHC. Site WordPress chưa cài nên tạm bảo vệ bằng Access cho đến khi cài xong.
7. `mhs service mhs-tunnel up`, rồi `mhs doctor`. Wizard chỉ lưu cấu hình/plan
   local; **không tự tạo DNS, app, policy hoặc route**. Doctor kiểm local và chặn
   anonymous, còn live Cloudflare/Internet báo NOT RUN cho tới khi bạn kiểm thật.

## Cách dùng và đăng xuất

Mở https://panel.example.com, xác thực Cloudflare Access rồi vào Panel ngay,
không nhập mật khẩu Admin. Mở Monitor bằng hostname riêng hoặc link trong Tổng
quan; chỉ hiển thị CPU/RAM/disk/pin/nhiệt/mạng/trạng thái dịch vụ, không logs/DB/files.
Phiên Access hiện có có thể giúp SSO giữa apps; không cam kết app thứ hai không
bao giờ hỏi xác thực lại. Tab ẩn dừng refresh Monitor.

Đăng xuất Panel sẽ hủy session MHS, chặn token đó ở origin tới hết hạn và chuyển
tới `https://PANEL_HOST/cdn-cgi/access/logout`. Cloudflare có thể đăng xuất các app
Access khác; không hứa logout chỉ một app. Owner đổi/loại bỏ khỏi config bị chặn
ngay ở request tiếp theo. Access edge xử lý account/session revocation; origin
offline kiểm JWT không tự biết revocation toàn account ngay lập tức. JWKS được
cache5phút; hết cache mà lấy khóa lỗi thì remote fail-closed, local9090 vẫn dùng được.

## Nâng từ RC1 / rollback

RC1 từng route Panel9090 và còn hỏi mật khẩu. Sau nâng source, **đổi đúng route
Panel MHS sang9093**, thêm Monitor9092, chạy lại wizard để đặt owner/schema2.
Config schema1 thiếu owner sẽ bị từ chối; không tự đoán email. Không chuyển route
production hoặc MHC. Rollback về RC1 chỉ dùng local/SSH9090; giữ route remote ở
trạng thái không phục vụ, không public9090 để khôi phục cơ chế cũ.

Tài liệu chính thức:
[Tunnel setup](https://developers.cloudflare.com/tunnel/get-started/),
[JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
[Access sessions/logout](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
