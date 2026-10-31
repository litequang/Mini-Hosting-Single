# Cài Mini Hosting Single V2.0 — RC2

Chỉ điện thoại riêng/Termux sạch; không cài lên các node MHC/AMH V1 hoặc hosting
cũ. Bản2.0.0-rc.2 có source và PC tests PASS; Android/Internet thật **NOT RUN**.
Không root, cần3GiB trống, Node≥22.16; bộ cài tự cài các thành phần còn thiếu.

## Ba bước dùng trên điện thoại

1. Cài **Termux, Termux:Boot, Termux:API** cùng nguồn/chữ ký tương thích. Mở Boot
   và API một lần. Android Settings: cho autostart/chạy nền, pin không hạn chế cho
   cả ba ứng dụng. Không force-stop Termux. Doze/OS có thể dừng dịch vụ; điện thoại
   tắt hoặc mất mạng thì website Internet không phục vụ, không có failover.
2. Copy **một lệnh cài ghim commit+SHA256 ở README / cuối tài liệu bản GitHub hiện
   hành**, chạy trực tiếp trên Termux. Không curl main | bash. Bootstrap cài missing
   packages, kiểm bundle và từng source file, tạo identity/config/admin riêng.
   Nếu PC/SSH mất kết nối, script trên điện thoại có thể vẫn chạy. Khi cần retry,
   dùng đúng lệnh release đã bắt đầu; không xóa lock/journal/data hoặc cài đè.
3. Sau cài: `mhs doctor`. Local Panel: http://127.0.0.1:9090, user admin;
   `mhs password` chỉ hiện mật khẩu trên terminal tương tác của chính thiết bị.
   Internet: `mhs cloudflare` rồi theo [hướng dẫn Cloudflare](CLOUDFLARE.md).

## Cách truy cập

| Giao diện | Địa chỉ / origin | Xác thực |
|---|---|---|
| Panel trên điện thoại/SSH | http://127.0.0.1:9090 | Admin password, cứu hộ offline |
| Panel Internet | hostname riêng → 127.0.0.1:9093 | Access SSO, không hỏi Admin lần2 |
| Monitor cùng LAN | http://IP-điện-thoại:9091 | Không đăng nhập, chỉ đọc |
| Monitor Internet | hostname riêng → 127.0.0.1:9092 | Access app/AUD riêng, không cần phiên Panel |
| Website | hostname của site → 127.0.0.1:8080 | Theo ứng dụng |

Không publish9090/9091/3306/8022. Cấu hình cần làm trên Cloudflare: một Tunnel
MHS riêng, hai app Access Allow exact email chủ máy, hai route Panel/Monitor đúng
port/AUD/hostname. Wizard lưu private config/token và in plan; **không giả vờ đã
tạo DNS/Access/route** khi không có account API token. Không cần Codex SSH cài máy.

Trên PC cùng LAN, nếu bạn đã cấu hình SSH key/sshd:
`ssh -N -L 9090:127.0.0.1:9090 -p 8022 USER@PHONE_LAN_IP`. MHS không chiếm listener
hoặc thay khóa SSH có sẵn. IP xem trong chi tiết Wi-Fi Android.

## Lệnh thường dùng

```sh
mhs doctor
mhs cloudflare
mhs setup remote
mhs service mhs-tunnel up
mhs service mhs-monitor restart
mhs lan-monitor off
mhs reset-password
```

`doctor` xuất JSON đã lọc: PASS/FAIL/NOT RUN và bước khắc phục, không secrets.
FAIL trả exit1. Kiểm local anonymous403 không chứng minh Access Internet PASS.
`lan-monitor off|on` cần restart **mhs-monitor**, không phải Panel.
Đổi admin password chỉ áp dụng local; Internet sử dụng danh tính owner Access.

## Dữ liệu và resume

Source bất biến: ~/.local/share/mhs/releases/<version>-<commit>, current symlink.
Data/site/SQL/credentials riêng: ~/.local/share/mhs/data (0700), files private0600.
MariaDB Unix socket, Nginx8080/Panel9090/SSO9093/Remote Monitor9092 loopback.
Runit quản lý mhs-db/php/nginx/panel/monitor/tunnel và Node site. Boot giữ local
recovery; marker/invocation receipt không chứng nhận đã test Android reboot.

Bootstrap từ chối footprint hosting cũ/schema SQL riêng/Cluster. Không bỏ guard,
xóa thư mục hoặc chỉnh marker để ép cài. Packages lấy repo chính thức Termux.
Máy<2GiB RAM giới hạn PHP một child; default3. SQL buffer64MiB.

## Nâng từ RC1 và rollback

**Từ RC1 lên RC2:** dùng chính lệnh bootstrap RC2 đã kiểm SHA. Nó nhận MHS đã
INSTALLED và gọi updater mới, không fresh-install đè dữ liệu. Updater tạo dịch vụ
Monitor riêng và restart management; web/DB/Tunnel không thuộc scope restart.
Sau đó `mhs cloudflare`: khai báo owner +2 AUD. Đổi **route Panel MHS** từ9090
sang9093, thêm Monitor9092. Config schema1 cũ fail-closed, không đoán danh tính.
Không đổi route MHC/production. Native upgrade này vẫn cần user nghiệm thu.

Từ RC2 trở đi, hoặc dùng updater mới được ghim:

```sh
mhs upgrade /path/mhs-next-version.mhs.gz SHA256_FROM_RELEASE_MANIFEST
mhs rollback
```

Updater kiểm SHA/manifest, lưu journal, giữ source trước, đổi current, restart và
health; lỗi tự rollback. Gián đoạn: retry cùng bundle+SHA. Local operation lock
chặn upgrade trong lúc backup/restore/deploy. Rollback source không restore SQL,
không đổi website/admin/Tunnel và không downgrade packages Termux.

Rollback về RC1 dừng Monitor service riêng trước khi Panel cũ nhận lại LAN9091.
**Chỉ local/SSH9090 để cứu hộ**, không public9090; route SSO9093/Monitor9092 nên
không phục vụ cho đến khi quay lại RC2. Config schema2 vẫn giữ, không hạ bảo mật.
Các release cũ giữ bất biến. Tạo backup website và credentials riêng trước update.

## Nghiệm thu của người vận hành

Fresh install/resume → doctor → local login → Panel Access SSO → Monitor qua
hostname riêng không có cookie Panel → LAN9091 → sai email/AUD bị chặn → logout/
login lại → Website/WordPress/Node/DB/backup → reboot/crash restart → upgrade/
rollback. Hiện Android/reboot/Internet đều NOT RUN; xem [ACCEPTANCE](ACCEPTANCE.md).

RC1 lịch sử vẫn có tại releases/2.0.0-rc.1.json; dùng RC2 cho Issue #1.
