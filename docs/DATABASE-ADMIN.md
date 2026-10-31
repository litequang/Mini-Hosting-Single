# Database trong Website Workspace

Websites → **Site** → Database · Adminer. Dùng original Panel/session/Access SSO,
không có Panel mới và không publish Adminer/PHP-FPM/MariaDB riêng. Static/PHP/Node
chưa có DB: chọn **Tạo database cho site**, nhập tên/slug xác nhận. Credentials riêng
hiện một lần qua phiên đã xác thực/no-store; giữ riêng để khôi phục. WordPress giữ
luồng tự tạo database/wp-config và installer hiện có, không cần tạo lại DB.

Adminer6.2.0 MySQL-only English được tải từ upstream release chính thức; SHA256
đối chiếu digest asset GitHub. Chọn license Apache-2.0; notices/hash nằm docs/vendor.
CodeMirror6 editor đã nằm trong Files, assets local và giới hạn text2MiB.

MHS kiểm JWT/owner/session trên mọi request trước FastCGI. POST cần đúng Origin
và MHS CSRF (form hidden hoặc header), ngoài CSRF riêng của Adminer. PHP wrapper
kiểm proof ngắn hạn từ adapter, marker MHS và DB binding; chỉ nhận user `mhs_*`
của site qua Unix socket. Không nhận server/user/database khác hoặc root login.
Không chuyển cookie Panel/Access cho PHP; PHP session có cookie/path riêng theo
site+owner. Đăng xuất MHS ngăn mọi request Adminer tiếp theo, dù PHP cookie còn.

Có tables/search/edit/query/import/export trong module upstream. SQL thay đổi dữ
liệu thật: backup trước khi chạy, không tự đảo migration. Form SQL tối đa2MiB,
multipart import64MiB stream vào private staging rồi mới xác minh/forward. Interactive
Adminer response giới hạn8MiB/60s để tránh RAM tăng không giới hạn; export lớn dùng
Backup SQL/backup site thay vì tăng cap. Không hiển thị stderr/SQL credentials lỗi.
fastcgi-client0.2.0 MIT là adapter nhỏ/không dependency nhưng upstream ít bảo trì;
MHS giới hạn concurrency1/request, response cap/timeout, không dùng làm endpoint public.

Trang Site gom Files/Deploy, Database, Domain, Backup/Restore, Logs, HTTP/Monitor,
Settings và Restart Node. Không tự npm install/build/run script upload. Env Node vẫn
ở private configuration; nhập cấu hình DB theo adapter của ứng dụng, không đưa
mật khẩu vào frontend/dist hoặc log.

PC tests: private FastCGI protocol fixture + HTTP Access/session/form-CSRF/scope/
cookie/header gate PASS. **PHP syntax/native Adminer/MariaDB/browser iframe/Android
và Internet NOT RUN** vì không có runtime/thiết bị MHS sạch được cấp phép. Không
coi HTML fixture là đã nghiệm thu Adminer thật; kiểm theo ACCEPTANCE trên thiết bị.
