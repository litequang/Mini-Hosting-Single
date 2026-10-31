# Hosting trên original Panel

Tạo website: Websites → Website mới → slug/hostname → Static, Node.js, PHP hoặc
WordPress. Mỗi site có thư mục riêng, Node có port/service riêng. Database chỉ
socket trong điện thoại, không public3306. Nginx chọn site bằng hostname.

- Static/React: build trên PC, ZIP chứa index.html ở root hoặc dist/index.html.
- Node: ZIP chứa entrypoint đã chọn (server.mjs/server.cjs/server.js). Dùng PORT
  do service cung cấp, bind127.0.0.1. Không tự npm build/install trong Panel;
  native node_modules từ Windows không chạy trên Android. Chuẩn bị dependencies
  phù hợp Android trên thiết bị cho app tin cậy nếu cần.
- PHP: ZIP chứa index.php. PHP-FPM dùng Unix socket riêng.
- WordPress: tạo site để cấp schema/user/salts riêng, bấm **Cài WordPress** trong
  Panel, chọn phiên bản và nhập quản trị/email/tên site. MHS tải core trực tiếp
  từ WordPress.org, kiểm file map MD5 chính thức qua HTTPS rồi cài bằng PHP,
  credentials đi stdin, không vào argv/log. Trỏ hostname theo docs/CLOUDFLARE.md,
  bảo vệ site bằng Access lúc chưa cài. Không nhập website/DB managed Cluster.
  Có thể upload core ZIP thủ công rồi hoàn tất /wp-admin/install.php nếu muốn.

Nút **Sửa cấu hình** đổi hostname; Node còn đổi entrypoint tương đối trong thư mục
app (ví dụ dist/server.cjs), port và environment JSON. Để trống environment để giữ
nguyên, `{}` để xóa biến. Các biến điều khiển runtime/PORT/PATH bị từ chối. Biến
riêng nằm ngoài website/source, không trả trong API danh sách. Đổi hostname không
tự ghi đè DNS/Tunnel; chỉnh exact route của chính site theo hướng dẫn Cloudflare.

Deploy ZIP giữ code trước và kiểm HTTP khi Nginx đã tích hợp; HTTP lỗi sẽ khôi phục.
Nút Rollback code không quay ngược database. Không gọi deploy fixture là web đã
public. Trước cập nhật app có migration SQL, tạo backup đầy đủ và kế hoạch dữ liệu.
WP code update giữ uploads cũ, từ chối ZIP uploads gây ghi đè không rõ ràng.

Files V2.1: chọn site/thư mục, Tus upload512MiB/chunk8MiB, ZIP giải nén riêng,
frontend-only deploy/rollback, CodeMirror, copy/move/thùng rác/restore. Các file
private như .env/wp-config/credentials không được đọc qua File Manager.
Chi tiết: [Files và Deploy](FILES-DEPLOY.md). Chỉ chủ thiết bị tin cậy sử dụng.
Không dùng thiết bị cho các tenant không tin cậy vì Termux cùng UID.

Tham khảo chính thức:
[WordPress installation](https://developer.wordpress.org/advanced-administration/before-install/howto-install/),
[wp-config and socket DB_HOST](https://developer.wordpress.org/apis/wp-config-php/).
