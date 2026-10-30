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
- WordPress: tạo site để cấp schema/user/salts riêng. Tải core ZIP từ wordpress.org,
  upload nguyên wordpress.zip tại site. Không mang wp-config.php từ máy khác.
  Trỏ hostname theo docs/CLOUDFLARE.md, bảo vệ site bằng Access lúc chưa cài,
  mở /wp-admin/install.php để tạo quản trị WordPress riêng. Credentials không
  được sao chép từ MHC. Đây chưa là import website/DB Cluster.

Deploy ZIP giữ code trước và kiểm HTTP khi Nginx đã tích hợp; HTTP lỗi sẽ khôi phục.
Nút Rollback code không quay ngược database. Không gọi deploy fixture là web đã
public. Trước cập nhật app có migration SQL, tạo backup đầy đủ và kế hoạch dữ liệu.
WP code update giữ uploads cũ, từ chối ZIP uploads gây ghi đè không rõ ràng.

Files: chọn site/thư mục, upload, đọc/sửa text, tạo thư mục, xóa có xác nhận.
Chỉ chủ thiết bị tin cậy sử dụng; file manager có thể đọc credentials của chính site.
Không dùng thiết bị cho các tenant không tin cậy vì Termux cùng UID.

Tham khảo chính thức:
[WordPress installation](https://developer.wordpress.org/advanced-administration/before-install/howto-install/),
[wp-config and socket DB_HOST](https://developer.wordpress.org/apis/wp-config-php/).
