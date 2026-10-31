# Cài lại MHS có kiểm chứng

Nâng phiên bản bình thường dùng bootstrap/updater, không dùng reset. Reset dành
cho chủ máy chủ động cài mới MHS trên chính điện thoại MHS độc lập. Không có chức
năng xóa Termux, hosting cũ, MHC hay database tùy ý.

1. Dừng thay đổi website. Trong Backups, cấu hình repository restic SFTP/S3 riêng
   ngoài điện thoại, backup mới cho **từng site**, chạy verify và export recovery
   kit. Giữ file kit/passphrase ở nơi an toàn ngoài máy; kit không chứa repository.
2. Trong Termux: `mhs reset --plan`. Lệnh yêu cầu MHS marker, vị trí data chuẩn,
   không footprint hosting khác, repo ngoài máy đã init, có receipt export kit và
   snapshot mỗi site không quá1 giờ. Nó kiểm repository rồi in UUID/kế hoạch10 phút.
3. Chỉ khi muốn ngừng MHS hiện tại: `mhs reset --apply UUID`. Nhập chính xác
   `QUARANTINE MHS UUID` tại lời nhắc. Lệnh kiểm lại proof, dừng các service
   **mhs-owned**, DB sau cùng, rồi đổi tên `data` thành `data-quarantine-UUID`.
   Không xóa file/SQL/source. Kế hoạch/journal ở `~/.local/share/mhs/reset-plans`.
4. Chạy bootstrap đã ghim để cài MHS mới. Credentials mới riêng. Khôi phục dữ liệu
   theo hướng dẫn backup; không tự chép file credentials cũ vào cài đặt mới.

Nếu chưa cài mới và muốn hoàn tác: `mhs reset --undo UUID`, nhập `RESTORE MHS UUID`.
Chỉ chạy khi `data` hiện tại chưa tồn tại; không ghi đè một cài đặt mới. Dữ liệu
cách ly được đổi tên lại, service còn dừng. Kiểm `mhs doctor`, sau đó bật lần lượt
`mhs service mhs-db up`, `mhs-php`, `mhs-nginx`, `mhs-panel`, `mhs-monitor`,
`mhs-scheduler`; bật service Node/Tunnel của chính cài đặt nếu đã có cấu hình.

Nếu dừng service lỗi, giữ journal/data và điều tra; không xóa lock/marker để ép.
Reset không tự xóa quarantine khi cài xong. Kiểm lại backup/website trước khi tự
quyết định quản lý dữ liệu cũ. Fixture PC đã kiểm guard/quarantine/undo; reset,
SFTP/S3 và service thật trên Android **NOT RUN**.
