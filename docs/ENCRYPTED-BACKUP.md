# Backup mã hóa và lịch tự động — V2.1

Backup & Restore giữ các bản nhỏ V2.0 (format không đổi:256MiB tổng/64MiB mỗi file,
không chứa private config). Phần **restic** dành cho snapshot mã hóa có code/data,
SQL và private config cần khôi phục. Không nhầm backup plaintext cũ với mã hóa.

1. Cấu hình repository **MHS riêng, mới**: local encrypted, SFTP hoặc S3-compatible
   HTTPS. Mật khẩu repository≥16 ký tự. Token S3/secret nhập trong form bảo vệ;
   không vào argv/log/response. SFTP dùng SSH key/known_hosts chủ máy đã chuẩn bị;
   không public SSH/MariaDB, không tự sao chép/đọc SSH private key.
2. Khởi tạo: nhập `MHS INIT NEW REPOSITORY`. Restic từ chối repo đã tồn tại; sau
   init MHS pin repository ID và owner tags. Không adopt repository lạ.
3. Xuất **recovery kit mã hóa**, đặt mật khẩu xuất riêng≥16 ký tự. Giữ kit và mật
   khẩu ngoài điện thoại, tách nhau. Kit gồm repo credentials/ID; không có SSH key.
   Local repository vẫn cần copy toàn repository encrypted ra thiết bị khác,
   hoặc chọn SFTP/S3: chỉ có kit mà mất local repository thì không cứu được dữ liệu.
4. Chọn site → Backup ngay. Job chạy nền trong `mhs-scheduler`, HTTP trả202 sớm.
   Làm mới tiến độ để xem DONE/FAILED. SQL dump phải thành công trước snapshot;
   checksum manifest + restic snapshot listing/check thành công mới ghi verified.
5. Lịch: chọn chu kỳ5..10080 phút **hoặc** cron5 trường/giờ cố định + múi giờ.
   Mặc định bỏ qua lượt đã lỡ; tùy chọn chạy bù một lần khi scheduler khởi động,
   cooldown1h. Lịch/journal lưu bền vững. Chỉ allowlisted backup jobs, không shell
   hoặc URL tùy ý. Operation lock/noOverlap ngăn chạy chồng; bận thì chờ/retry.

## Giới hạn và ảnh hưởng

Source/data mặc định≤2GiB/50000 mục, SQL≤512MiB; không tăng buffer toàn file.
SQL stream vào dump/restore, scan marker Cluster trước tác vụ phá dữ liệu.
Staging private cần đủ chỗ cho bản sao/safety/SQL và128MiB reserve. Restic dùng
GOMAXPROCS1, GOMEMLIMIT128MiB (soft limit), concurrency đọc1, upload≤4MiB/s.
Local repository cap4GiB; gần cap thì từ chối backup, giữ website đang chạy.
Backup online không dừng website, nhưng SQL transaction và files lấy riêng:
không cam kết snapshot app-consistent tuyệt đối trong lúc app đang ghi.

keepLast giới hạn snapshots của đúng site/owner tags, không quên snapshot lạ.
Forget không tự repack trong mỗi backup. **Prune repository** là job riêng có
xác nhận, chỉ blob không còn snapshot tham chiếu, repack≤64MiB/lượt. Chạy khi rảnh;
không tự prune các repository ngoài ID đã pin. Theo dõi dung lượng cả cache/staging.

## Restore / retry

Snapshots → chọn đúng ID → Safety backup rồi restore, nhập slug. MHS tải về private
staging bằng restic --verify, kiểm lại file/SQL/private manifest, safety snapshot và
SQL trước khi apply. Maintenance503/stop Node hoặc PHP trong lúc restore; PHP chung
có thể ảnh hưởng các site PHP khác. Lỗi sẽ rollback SQL/files, nếu recovery lỗi thì
giữ maintenance/journal và báo cần can thiệp. Không xóa journal để ép mở website.
Interrupted job cần xác nhận Retry; restore interrupted chuyển sang recovery.

Restore trên site hiện hữu giữ private Node env/credentials local. Nếu credentials
đã thay đổi từ snapshot, từ chối tự phục hồi SQL/config bằng thông tin cũ. Snapshot
vẫn chứa private.json mã hóa để chủ máy khôi phục có kiểm soát. Phục hồi sang máy
mới/đổi DB user/đổi domain cần mapping rõ ràng, không tự copy credentials giữa máy.

CLI offline:

```sh
mhs doctor
mhs service mhs-scheduler up
mhs recovery-kit export /path/mhs-recovery.encrypted.json
mhs recovery-kit import /path/mhs-recovery.encrypted.json
```

Import kit chỉ vào cấu hình backup MHS chưa initialized, cần mật khẩu ẩn và nhập
`MHS IMPORT ENCRYPTED RECOVERY`. Không reset data/sites/DB, không tự restore đè.
Nếu cần phục hồi sang máy mới, giữ snapshot/staging và nhờ người vận hành map cấu
hình; không đưa file private.json, kit passphrase, token hoặc dump vào chat/Git.

Fresh installer cài restic từ package Termux chính thức và thêm runit/Boot scheduler.
Source-only upgrade cũ nếu thiếu binary: `pkg install restic`, rồi doctor. Bootstrap
release mới tự cài thành phần thiếu. Rollback source về RC2 dừng scheduler riêng;
repository/snapshot/data không bị xóa.

Đã kiểm restic0.19.1 Windows thật: encrypted init/backup/check/read-data/restore,
retention/prune, SQL fault adapter rollback, encrypted recovery kit roundtrip PASS.
Windows metadata ACL cần test ngoài sandbox; không nới quyền Android. **Native SQL,
Android/reboot/SFTP/S3/Internet NOT RUN**. Không coi SQL fixture là MariaDB thật.

Tham khảo: [restic repo](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html),
[backup](https://restic.readthedocs.io/en/stable/040_backup.html),
[restore](https://restic.readthedocs.io/en/stable/050_restore.html),
[node-cron](https://www.nodecron.com/).
