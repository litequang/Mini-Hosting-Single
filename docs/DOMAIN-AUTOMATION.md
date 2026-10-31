# Auto Publish Domain — V2.1

Website tạo Nginx/local trước. Trong Cloudflare → Auto Publish chọn site, **Preview**
để xem hostname/zone/Tunnel/origin/CNAME; chưa ghi gì. Apply cần nhập lại đúng domain
và là lệnh thay đổi Cloudflare thật của chủ tài khoản. Không cần Codex SSH từng máy.
Domain là exact FQDN của site đã khai báo; sửa ở Settings trước khi publish.

## Hai chế độ

- Không API token: preview trả MANUAL/applied:false, dùng `mhs cloudflare` và hướng
  dẫn tạo hostname trong Tunnel riêng. Không báo DNS published khi chỉ có plan.
- Có token giới hạn: DNS CNAME proxied → UUID.cfargotunnel.com, Tunnel ingress →
  `http://127.0.0.1:8080`. Trạng thái `local only` → `planned` → `DNS published` →
  `HTTPS verified` khi HEAD HTTPS thực trả2xx/3xx, không follow redirect khác.

Wildcard không tự bật hoặc thay thế wildcard cũ. Bản này ưu tiên exact hostnames;
gặp wildcard DNS/ingress đã phục vụ sẽ từ chối vì thêm exact record có thể shadow
ứng dụng khác. Thiết lập wildcard nâng cao chỉ làm riêng sau xác nhận/tương thích.

## Cấp quyền một lần, không gửi token vào chat

1. Dùng Tunnel **MHS riêng**, tên bắt đầu `mhs-`/`mhs_`, remotely managed. Không
   dùng Tunnel MHC/production. Token connector trong `mhs cloudflare` phải đúng
   account/Tunnel; MHS đối chiếu local token binding trước mọi thao tác API.
2. Cloudflare → profile hoặc Manage Account → API Tokens → Create Custom Token.
   Chọn **Zone / DNS / Edit**, **Zone / Zone / Read**, giới hạn Specific zone của
   bạn. Thêm account permission **Cloudflare One Connector: cloudflared / Edit**
   (có thể tên cũ Cloudflare Tunnel / Edit), Read nếu giao diện tách riêng; giới
   hạn đúng account. Không chọn Full account access/Workers/Access policy edit.
3. Lấy Account ID/Zone ID tại Zone Overview → API IDs; UUID tại Zero Trust →
   Networks/Connectors → Tunnel MHS. Không nhầm ID với AUD/connector token.
4. Trong Panel → Cloudflare → Cấp API token riêng: nhập IDs, zone, Tunnel UUID và
   API token ở ô password; xác nhận `MHS OWNS TUNNEL UUID`. Hoặc terminal:

   ```sh
   mhs domain setup
   mhs domain plan SITE_SLUG
   mhs domain apply PLAN_UUID
   ```

   Token lưu0600 trên thiết bị, không argv/log/response. Token này khác connector
   token: connector chỉ chạy Tunnel, account API token mới có quyền DNS/config.

## Giữ nguyên tài nguyên khác

Preview đọc toàn config/version và DNS exact; giữ cả ingress/originRequest/unknown
config fields. Plan private10phút, không trả các origin secrets/AUD khác ra UI.
Apply re-read/hash/version trước PUT, kiểm lại config sau PUT. API Tunnel update
là **replacement**, không có CAS/revision precondition được công bố trong endpoint:
MHS dùng optimistic checks, không hứa giao dịch nguyên tử với Dashboard/actor khác.
Không chỉnh cùng Tunnel bằng Dashboard lúc apply. Phát hiện cạnh tranh thì dừng,
giữ journal và báo recovery; không force ghi config cũ đè thay đổi mới.

DNS đã tồn tại bị từ chối kể cả trỏ cùng Tunnel; không tự adopt record thủ công.
Panel/Monitor hostnames bị reserve, routes9093/9092/Access giữ nguyên. Không tạo
Worker/DO, không publish9090/9091/3306/8022. Mỗi site có record ID/comment/hash riêng;
gỡ chỉ khi còn đúng record/rule MHS đã tạo. Đổi hostname/xóa site đã publish cần
gỡ owned domain trước. Lỗi giữa chừng rollback chỉ record/rule của thao tác đó khi
remote config còn đúng expected hash; nếu actor khác đổi thì yêu cầu kiểm tra.

SDK7.3.0 được bundle local≈673KB/lazy load, retry1/timeout5s; không poll API/Worker
định kỳ để website chạy. Quyền API/rate limit tách biệt Worker quota. Cloudflare
Free giới hạn body mỗi request, không phải tổng file; upload MHS dùng Tus8MiB.
Live API/HTTPS từ điện thoại thật **NOT RUN**; PC dùng official SDK với fetch mock.

Tài liệu chính thức đã đối chiếu31/10/2026:
[Tunnel config replacement/permissions](https://developers.cloudflare.com/api/typescript/resources/zero_trust/subresources/tunnels/subresources/cloudflared/subresources/configurations/methods/update/),
[DNS create/permissions](https://developers.cloudflare.com/api/typescript/resources/dns/subresources/records/methods/create/),
[API rate limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/),
[upload413 limits](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/).
