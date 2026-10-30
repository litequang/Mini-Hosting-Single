# Cài MHS V2.0 trên Termux sạch

RC2.0.0-rc.1: source/PC đã kiểm; Android thật **NOT RUN**. Dùng điện thoại riêng,
không dùng node MHC và không xem đây là converter từ V1/Cluster.

1. Cài Termux, Termux:Boot, Termux:API cùng nguồn/chữ ký tương thích; mở Boot/API
   ít nhất một lần. Android Settings: pin không hạn chế và cho chạy nền/autostart.
2. Copy lệnh ghim commit+SHA256 từ README/release vào Termux. Bootstrap kiểm
   footprints, cài missing packages chính thức, tải/check bundle và từng file.
3. Mất PC/SSH không có nghĩa script đã dừng. Nếu cần retry, chạy **đúng lệnh cũ**
   để resume, giữ journal và credentials; không xóa lock/data hoặc đổi release.
4. `mhs status`; mở http://127.0.0.1:9090 trên điện thoại, user admin. `mhs password`
   in mật khẩu vào terminal tương tác của chính máy. Không gửi lên chat/log.
   Đổi: `mhs reset-password`; các session cũ mất hiệu lực khi hash admin thay đổi.
5. Máy cùng LAN: `http://IP-điện-thoại:9091`, Monitor chỉ đọc không đăng nhập.
   IP xem trong chi tiết Wi-Fi Android. Tắt: `mhs lan-monitor off` rồi
   `sv restart "$PREFIX/var/service/mhs-panel"`.
6. Panel trên PC qua SSH nếu bạn đã cấu hình key/sshd của Termux:
   `ssh -N -L 9090:127.0.0.1:9090 -p 8022 USER@PHONE_LAN_IP`.
   MHS không thay khóa hoặc chiếm listener SSH có sẵn. Internet: CLOUDFLARE.md.

Không root, cần≥3GiB trống. Node≥22.16, nginx, php/php-fpm(mysqli), mariadb,
termux-services, termux-api, cloudflared, curl/coreutils/util-linux và openssh.
Hardware report: CPU/RAM/disk/model/Android/pin khi API cho phép. Máy<2GiB RAM
giới hạn PHP một child, máy lớn tối đa3. MariaDB buffer64MiB, chỉ Unix socket.

Source: ~/.local/share/mhs/releases/<version>-<commit>, symlink current.
Data: ~/.local/share/mhs/data (0700), private configs0600. Nginx8080/Panel9090
loopback;9091 LAN chỉ đọc. Runit restart mhs-db/php/nginx/panel khi crash; Boot
gọi entry riêng. Stop qua Services được giữ qua reboot; Panel giữ để khôi phục.
SSH không tự bật. Tunnel mới cấu hình bằng `mhs cloudflare`, không cần PC.
Android force-stop/Doze có thể dừng Termux; Boot/source marker không thay reboot
test. Các quyền Android cần người dùng cấp trên giao diện thiết bị.

## Upgrade / rollback

Chỉ dành MHS đã cài, không đổi website/DB/environment/credentials/Tunnel:

```sh
mhs upgrade /path/mhs-next-version.mhs.gz SHA256_FROM_RELEASE_MANIFEST
mhs rollback
```

Updater kiểm bundle/source manifest, giữ release cũ, ghi journal, đổi current,
restart riêng Panel và health. Lỗi tự quay pointer cũ/restart/verify. Gián đoạn:
retry cùng bundle+SHA. Local lock chặn update khi đang backup/restore/deploy.
Không rollback database hoặc downgrade platform packages của Termux. Backup site
và credentials riêng trước thay đổi lớn. Giữ release cũ bất biến.

## Kiểm tổng thể của người vận hành

Máy sạch: install/resume → login/CSRF → static/Node/PHP/WP thật → env/deploy →
backup/restore SQL+files → services/crash restart → reboot → LAN từ máy khác →
Tunnel/Access/HTTPS → upgrade/rollback. Hiện native/Internet đều NOT RUN.
