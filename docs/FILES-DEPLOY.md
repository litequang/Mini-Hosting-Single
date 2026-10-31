# Files và Deploy V2.1

Trong original Panel → Files: chọn website, breadcrumb để đổi thư mục. Lọc tên
trong thư mục hoặc tìm toàn site (giới hạn10000 mục quét/300 kết quả). File/folder
không vượt root của site, không hiện `.env*`, wp-config, token/authority/credentials.
Editor CodeMirror local, tối đa2MiB; ảnh PNG/JPEG/GIF/WebP preview tối đa10MiB.
Tạo file/folder, copy/move/rename chỉ trong site; xóa chuyển thùng rác riêng và có
khôi phục nếu đích chưa tồn tại. Download folder tạo ZIP streaming, không nhận glob.

## Upload

Chọn nhiều file, thư mục (nếu browser hỗ trợ) hoặc kéo thả. Uppy/Tus chạy một file
mỗi lần, chunk8MiB (<100MB/request), tối đa512MiB/file. Kiểm SHA256 incremental
ở browser, checksum từng chunk và toàn file ở server; không buffer cả file.
Mỗi request cần JWT/session/CSRF; HEAD cần CSRF và same-origin/AJAX boundary, do
browser không luôn gửi Origin với HEAD. Không có endpoint upload anonymous.
Quota staging1GiB/8 bản đang upload, giữ128MiB disk reserve và dự trù staging.
settings uploadMaxMiB có thể1..2048 nhưng UI mặc định512; không tăng RAM limit.

Mất mạng: retry tự động; có Tạm dừng/Tiếp tục/Thử lại/Hủy. Sau refresh phải chọn
lại cùng file từ cùng website/thư mục; browser không được tự đọc lại file trên PC.
Tus offset/journal nằm trên điện thoại và fingerprint ở browser. Chunk chưa đủ
hoặc sai SHA không được commit. Bản dở quá24h được thu hồi khi tạo upload mới.
Nếu file đích có sẵn phải xác nhận thay; bản trước giữ trong journal riêng24h.
Journal PREPARED do mất điện cần kiểm tra/recovery, không được xóa để ép ghi đè.

## Ba thao tác khác nhau

1. **Upload ZIP**: chỉ lưu ZIP vào thư mục đang chọn. Không giải nén/deploy/restart.
2. **Giải nén**: chọn ZIP → Giải nén → nhập thư mục đích (thư mục hiện tại mặc định).
   Có preview số file/thay thế; chọn skip/overwrite/cancel. Kiểm size/ratio/count,
   path/symlink/case collision/CRC trước apply; staging + journal, rollback khi lỗi.
   Expanded tối đa2GiB khi đủ disk; không xóa file ngoài archive, không restart.
   Nút Khôi phục unzip rollback transaction bị gián đoạn, cần nhập slug.
3. **Cập nhật Frontend**: chỉ Node site, khai báo thư mục riêng một lần, ví dụ
   `dist` hoặc `public/dist`. ZIP flat index.html hoặc dist/index.html đều được.
   Preview backend entry/target, thay nguyên thư mục frontend, giữ bản trước.
   Không chạm entry backend, package/node_modules/env/storage/uploads/sheets/SQL.
   Nếu backend là dist/server.cjs thì không cho target dist; tách frontend riêng.
   Restart mặc định OFF. Khi Nginx đã tích hợp, kiểm HTTP; lỗi chỉ rollback frontend.
   Nút Rollback frontend độc lập rollback code toàn ứng dụng và database.

**Deploy toàn app** là thao tác khác, có typed slug/warning; dùng cho backend release
đã có kế hoạch, không chạy npm install/build hoặc SQL migration tự động. Code rollback
không rollback SQL. Chức năng WordPress core/backup cũ vẫn giữ nguyên.

Node/ứng dụng trong Termux dùng cùng UID: đây là hosting ứng dụng tin cậy của một
chủ máy. Path/no-follow/hardlink checks không tạo OS sandbox cho code không tin cậy.
PC HTTP streaming/fixtures đã kiểm; browser thực/Android/Internet vẫn NOT RUN.
