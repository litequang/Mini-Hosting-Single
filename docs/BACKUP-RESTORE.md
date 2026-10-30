# Backup / Restore theo website

Websites → Backup tạo `.mhs.gz` gồm files + SQL của database gắn site (nếu có).
Từng file và cả archive có SHA256; đọc lại toàn bộ archive trước khi báo verified.
Backup & Restore cho phép download, upload có SHA256 rồi restore với tên site
xác nhận. Đích phải cùng slug/type và là site MHS độc lập đã tạo.

Không chứa wp-config.php, .env, Node environment hoặc credentials Panel/Tunnel.
Restore giữ credentials và WordPress salts của chính site đích. Dùng Settings/
file private riêng để bảo quản credentials ngoài backup website. Không import
backup MHC hoặc SQL có managed-writer state; không chuyển guard thành Solo.

Giới hạn hiện tại: 12000 files, 64MiB/file, 256MiB tổng dữ liệu, tối đa256MiB
compressed upload. Archive riêng có path/checksum/bounds validation, không giải
nén tar tùy ý. Backup online dùng SQL single-transaction, files lấy riêng nên
không cam kết ảnh chụp nguyên tử của giao dịch giữa file và DB. Nếu cần tuyệt đối,
tạm dừng ghi website/jobs rồi backup; không có replication.

Restore: kiểm archive/SHA/site → safety backup → maintenance503 → tạm dừng Node
hoặc PHP-FPM → import SQL bằng user riêng (chỉ schema MHS) → swap files → start →
HTTP check nếu Nginx integrated. PHP-FPM dùng chung nên các site PHP khác có thể
tạm gián đoạn. Lỗi thông thường khôi phục SQL/files cũ; lỗi rollback giữ503 cùng
journal/private backups để cứu hộ, không xóa state. Mọi job/shell riêng do người
vận hành tạo ngoài MHS cần tự tạm dừng khi restore.

Database Manager vẫn export/import SQL riêng, backup trước import và thử khôi
phục nếu import thất bại. Chỉ nhập SQL tin cậy, đúng schema/charset. Bản đầu hỗ trợ
tables thông thường; views/procedures/privileged SQL cần xử lý riêng. File + SQL
độc lập: tạo site WordPress/PHP mới, deploy ZIP độc lập rồi import SQL của site
bằng Database; cập nhật URL ứng dụng nếu đổi hostname. Không nhập wp-config cũ.

PC: file roundtrip/Unicode/SHA/upload + injected SQL failure/rollback PASS.
MariaDB thật, PHP thật, mất điện Android và public HTTP: **NOT RUN**.
