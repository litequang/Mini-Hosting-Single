# Install Mini Hosting Single 2.1 RC7

Current release **2.1.0-rc.7** includes guided Node deployment, direct private
`.env` file upload/loading, locked production dependencies, database binding,
case-sensitive ZIP media paths, HTTP verification and512MiB SQL restore with128MiB statement packet support.
Files also provides a private .env editor and Node restart/HTTP check.
It also fixes management service paths during upgrade/rollback and fresh install.
See [Node deployment](NODE-DEPLOY.md).

## Install 2.1 RC7

Run this complete block in standard Termux on an independent MHS phone. It
supports fresh install, resume of the same RC7, or source upgrade of installed
MHS. Earlier pinned installers remain immutable and install older code. Use this
new installer to upgrade RC1-RC4, so that the new upgrade code is used.

```sh
(
  set -eu
  test "${PREFIX:-}" = /data/data/com.termux/files/usr || { echo MHS_STANDARD_TERMUX_REQUIRED; exit 1; }
  for p in .config/mhc-full-installer .local/share/mhc-full-installer android-hosting-panel .config/mini-hosting-cluster apps .nginx .cloudflared; do
    test ! -e "$HOME/$p" || { echo MHS_EXISTING_HOSTING_REFUSED; exit 1; }
  done
  command -v curl >/dev/null || pkg install -y curl
  command -v sha256sum >/dev/null || pkg install -y coreutils
  curl --fail --location --proto '=https' --proto-redir '=https' --silent --show-error 'https://raw.githubusercontent.com/litequang/Mini-Hosting-Single/1b65870fb2a48904a414f50955f3283b008df558/releases/install-2.1.0-rc.7.sh' -o "$HOME/mhs-install-2.1.0-rc.7.sh"
  printf '%s  %s\n' 'b9ecdd0aa9a6d99d0e0b26bcf669924a67770a81c31d8ee71eaff715e19e5940' "$HOME/mhs-install-2.1.0-rc.7.sh" | sha256sum -c -
  bash "$HOME/mhs-install-2.1.0-rc.7.sh"
)
```

Source `dbfefb0da97f62de25d4bbd5f7027cb15d3b7cb5`; artifact
`1b65870fb2a48904a414f50955f3283b008df558`; tag `v2.1.0-rc.7`.
Bundle SHA256 `bca00e5e05e1140ad415945e132b3c3be7bd3c707808c1b85ba65f57e8385a18`.
PC tests, Chrome workflow, package smoke and public pinned checksums PASS.
Authorized11T source upgrade, npm install, .env upload,86.4MB/93-table SQL import,
Node/Nginx/public HTTPS and /api/health PASS. Fresh RC7 install and reboot have
not been performed. Existing independent WordPress remains available over HTTPS.

---

# C?i Mini Hosting Single V2.1 ? RC2

Chỉ điện thoại riêng/Termux sạch; không cài lên các node MHC/AMH V1 hoặc hosting
cũ. Bản2.1.0-rc.1 có source và PC tests PASS; Android/Internet thật **NOT RUN**.
Không root, cần3GiB trống, Node≥22.16; bộ cài tự cài các thành phần còn thiếu.


## Install 2.1 RC2

**L?nh hi?n h?nh cho m?y m?i**, s?a c?c l?i ?? g?p tr?n Xiaomi 11T: thi?u php-gd,
nh?n nh?m th? m?c m? ngu?n SecretStream, thi?u LOGDIR khi ch?y kh?ng qua login,
v? d?ch v? stock ch?a th?c s? d?ng khi ?? t?o marker down. Kh?a SSH c? s?n ???c
gi? nguy?n; n?u mu?n SSH, ch? m?y t? b?t `sv-enable sshd` v? c?p public key.

C?i Termux/Boot/API t??ng th?ch v? c?p quy?n ch?y n?n nh? h??ng d?n b?n d??i.
D?n nguy?n kh?i n?y v?o **Termux c?a m?y MHS ri?ng**. H? tr? c?i m?i, resume c?ng
RC2 v? n?ng MHS ?? INSTALLED; kh?ng d?ng cho node Cluster/hosting kh?c.

```sh
(
  set -eu
  test "${PREFIX:-}" = /data/data/com.termux/files/usr || { echo MHS_STANDARD_TERMUX_REQUIRED; exit 1; }
  for p in .config/mhc-full-installer .local/share/mhc-full-installer android-hosting-panel .config/mini-hosting-cluster apps .nginx .cloudflared; do
    test ! -e "$HOME/$p" || { echo MHS_EXISTING_HOSTING_REFUSED; exit 1; }
  done
  command -v curl >/dev/null || pkg install -y curl
  command -v sha256sum >/dev/null || pkg install -y coreutils
  curl --fail --location --proto '=https' --proto-redir '=https' --silent --show-error 'https://raw.githubusercontent.com/litequang/Mini-Hosting-Single/8a18a185c4fe3349c7adaea25d82f501010363ad/releases/install-2.1.0-rc.2.sh' -o "$HOME/mhs-install-2.1.0-rc.2.sh"
  printf '%s  %s\n' 'a9c9aeac130053c85cc92c2af08d55ca3bbbe3ab993c90d0461590f932e77c15' "$HOME/mhs-install-2.1.0-rc.2.sh" | sha256sum -c -
  bash "$HOME/mhs-install-2.1.0-rc.2.sh"
)
```

Source `3ada7928ae2802faf8049edfd10f451e4f602013`; artifact
`8a18a185c4fe3349c7adaea25d82f501010363ad`; tag `v2.1.0-rc.2`.
Manifest: [2.1.0-rc.2.json](../releases/2.1.0-rc.2.json).
Bundle SHA256 `0477f13b57ccd7ed0f130fc659ff6c1de83217f6f18085ddb3ca294f8857f0b6`.
Sau c?i: `mhs doctor`, r?i `mhs cloudflare`. M?i m?y d?ng Tunnel/token/Access owner
ri?ng; b? c?i kh?ng ??a c?u h?nh ri?ng hay th?ng tin t?i kho?n 11T v?o GitHub.

12 ki?m th? li?n quan, 78 ki?m tra c? ph?p JS, shell syntax, g?i th?c t?/fixture
c?i m?i v? anonymous remote denial PASS. ZIP WordPress 7.1.4 ch?nh th?c ?? gi?i
n?n 4.250 m?c v? ??i chi?u 3.338 checksum core. ??y kh?ng ph?i ch?ng nh?n c?i m?i
RC2 tr?n Android hay reboot th?t. C?c l?nh RC1/V2.0 ph?a d??i l? l?ch s?.


## Ba bước dùng trên điện thoại

1. Cài **Termux, Termux:Boot, Termux:API** cùng nguồn/chữ ký tương thích. Mở Boot
   và API một lần. Android Settings: cho autostart/chạy nền, pin không hạn chế cho
   cả ba ứng dụng. Không force-stop Termux. Doze/OS có thể dừng dịch vụ; điện thoại
   tắt hoặc mất mạng thì website Internet không phục vụ, không có failover.
2. Copy **một lệnh cài ghim commit+SHA256 ở cuối tài liệu này**, chạy trực tiếp
   trên Termux. Không curl main | bash. Bootstrap cài missing
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
mhs setup first-site
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
Runit quản lý mhs-db/php/nginx/panel/monitor/scheduler/tunnel và Node site. Boot giữ local
recovery; marker/invocation receipt không chứng nhận đã test Android reboot.

Bootstrap từ chối footprint hosting cũ/schema SQL riêng/Cluster. Không bỏ guard,
xóa thư mục hoặc chỉnh marker để ép cài. Packages lấy repo chính thức Termux.
Máy<2GiB RAM giới hạn PHP một child; default3. SQL buffer64MiB.

## Nâng từ V2.0 và rollback

**Từ MHS2.0 lên2.1:** dùng bootstrap2.1 ghim commit/checksum ở cuối tài liệu.
Nó nhận MHS đã INSTALLED và gọi updater mới, không fresh-install đè dữ liệu.
Updater bổ sung scheduler/Monitor nếu thiếu và restart management; DB/Tunnel
không bị restart. Riêng cấu hình Nginx của site MHS được bổ sung rule chặn tải
`.zip/.sql/.bak/.mhs.gz`, có backup cấu hình, nginx test/reload và rollback lỗi.
Các rule tùy chỉnh được giữ; mẫu không nhận diện sẽ từ chối thay vì ghi đè.
Rule bảo vệ này được giữ khi rollback source. Web có thể chịu reload Nginx ngắn.
Nếu từ RC1: `mhs cloudflare`, khai báo owner +2 AUD. Đổi **route Panel MHS** từ9090
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

## Bắt đầu với V2.1

`mhs setup first-site` hướng dẫn tạo static/Node/PHP/WordPress; cũng có thể tạo
trong Websites. Vào site → Files để upload, rồi chọn rõ giải nén, deploy frontend
hay deploy app. Upload ZIP không tự cài app. WordPress dùng nút Cài WordPress;
database dùng site user, không dùng root trong Adminer.

Backups → cấu hình repository restic và mật khẩu riêng → init → backup/verify →
export recovery kit. Lịch chọn cron/timezone hoặc chu kỳ; mặc định chưa bật.
Giữ kit/passphrase ngoài điện thoại. Repository local không thay thế backup ngoài
máy. Xem [backup mã hóa](ENCRYPTED-BACKUP.md) và [cài lại an toàn](REINSTALL.md).

Cloudflare Panel/Monitor vẫn dùng `mhs cloudflare` + hai app Access do chủ tài khoản
tạo. Nếu muốn tự publish website: Cloudflare → cấu hình scoped API token hoặc
`mhs domain setup`, sau đó preview và xác nhận đúng hostname của site. Chỉ dùng
Tunnel MHS riêng; không chọn Tunnel MHC/production. Xem [DOMAIN-AUTOMATION](DOMAIN-AUTOMATION.md).

WP-CLI chưa được bật/phát hành do chưa kiểm thử PHP/Termux thật. Cài WordPress
vẫn dùng trình cài Panel hiện có. Chuyển WordPress độc lập cần mapping config/URL
thủ công theo [HOSTING](HOSTING.md); không import site managed Cluster.

## Nghiệm thu của người vận hành

Fresh install/resume → doctor → local login → Panel Access SSO → Monitor qua
hostname riêng không có cookie Panel → LAN9091 → sai email/AUD bị chặn → logout/
login lại → Website/WordPress/Node/DB/backup → reboot/crash restart → upgrade/
rollback. Hiện Android/reboot/Internet đều NOT RUN; xem [ACCEPTANCE](ACCEPTANCE.md).

## Lệnh cài V2.1 ghim commit và SHA256

Copy toàn khối vào **Termux MHS riêng**. Dùng cho fresh2.1, resume cùng release
hoặc nâng MHS2.0 đã INSTALLED; không chạy trên MHC/AMH/hosting khác. URL bootstrap
ghim commit artifact `d0d1793`, bên trong pin tag+SHA bundle. Sau cài `mhs doctor`,
`mhs setup first-site`, rồi `mhs cloudflare`. Không cần Codex SSH từng máy.

```sh
(
  set -eu
  test "${PREFIX:-}" = /data/data/com.termux/files/usr || { echo MHS_STANDARD_TERMUX_REQUIRED; exit 1; }
  for p in .config/mhc-full-installer .local/share/mhc-full-installer android-hosting-panel .config/mini-hosting-cluster apps .nginx .cloudflared; do
    test ! -e "$HOME/$p" || { echo MHS_EXISTING_HOSTING_REFUSED; exit 1; }
  done
  command -v curl >/dev/null || pkg install -y curl
  command -v sha256sum >/dev/null || pkg install -y coreutils
  curl --fail --location --proto '=https' --proto-redir '=https' --silent --show-error 'https://raw.githubusercontent.com/litequang/Mini-Hosting-Single/d0d179319c4165096d577095d889fec42c39803f/releases/install-2.1.0-rc.1.sh' -o "$HOME/mhs-install-2.1.0-rc.1.sh"
  printf '%s  %s\n' '4bf4e9ac58b5e02f05f8daa181e365e81f659ad08cd4a2caa6b52aa5c79b1698' "$HOME/mhs-install-2.1.0-rc.1.sh" | sha256sum -c -
  bash "$HOME/mhs-install-2.1.0-rc.1.sh"
)
```

Release [v2.1.0-rc.1](https://github.com/litequang/Mini-Hosting-Single/tree/v2.1.0-rc.1),
manifest [2.1.0-rc.1.json](../releases/2.1.0-rc.1.json). Source `4c865fc`; artifact
`d0d1793`. Bootstrap5034 bytes và bundle1118432 bytes đã tải lại qua commit/tag:
HTTP200/SHA256 PASS. Bundle SHA256:
`3450f42ef97de7e68c337864c972e7a42d3f232f4d9d375bd38fbff1071454c9`.
Đây là kiểm phân phối/fixture, **Android/Internet thật NOT RUN**. Chủ máy vẫn
cài ứng dụng Termux/Boot/API, cấp chạy nền, tạo Tunnel + hai app Access và nhập
thông tin riêng; website API token chỉ cần nếu chọn automation thay cho thủ công.

Khối RC2 bên dưới là lịch sử V2.0, không chứa tính năng V2.1. Không sửa byte các
release lịch sử. Rollback dùng `mhs rollback`; không khôi phục SQL theo source.

## Lệnh cài RC2 ghim commit và SHA256

Copy toàn bộ khối dưới đây, dán một lần vào **Termux trên thiết bị MHS riêng**.
Dùng được cho fresh install, resume cùng RC2 và nâng MHS RC1 đã INSTALLED lên RC2.
Không chạy trên PC, MHC, AMH V1 hoặc hosting khác. Cả bootstrap và bundle được
kiểm SHA256; URL bootstrap ghim commit artifact `e022684`, không chạy source main.
Bundle bên trong ghim tag RC2 và checksum; release cũ không bị ghi đè.

```sh
(
  set -eu
  test "${PREFIX:-}" = /data/data/com.termux/files/usr || { echo MHS_STANDARD_TERMUX_REQUIRED; exit 1; }
  for p in .config/mhc-full-installer .local/share/mhc-full-installer android-hosting-panel .config/mini-hosting-cluster apps .nginx .cloudflared; do
    test ! -e "$HOME/$p" || { echo MHS_EXISTING_HOSTING_REFUSED; exit 1; }
  done
  command -v curl >/dev/null || pkg install -y curl
  command -v sha256sum >/dev/null || pkg install -y coreutils
  curl --fail --location --proto '=https' --proto-redir '=https' --silent --show-error 'https://raw.githubusercontent.com/litequang/Mini-Hosting-Single/e022684200a169a3c78f7d11d31d1c3bc1165cd5/releases/install-2.0.0-rc.2.sh' -o "$HOME/mhs-install-2.0.0-rc.2.sh"
  printf '%s  %s\n' '4194e1f22b31256e153f60263406d77492d7e78e45bec8c0cc36ec5c388c795b' "$HOME/mhs-install-2.0.0-rc.2.sh" | sha256sum -c -
  bash "$HOME/mhs-install-2.0.0-rc.2.sh"
)
```

Đã tải lại bootstrap (5027 bytes) và bundle (116692 bytes) từ GitHub công khai:
HTTP200/SHA256 PASS; URL bundle qua tag cũng PASS. Đây là kiểm phân phối gói,
**không phải nghiệm thu cài Android**. Manifest: [2.0.0-rc.2.json](../releases/2.0.0-rc.2.json).
Sau cài, chạy `mhs doctor`, rồi `mhs cloudflare`. Các bước đăng nhập Cloudflare,
tạo Tunnel/2 app Access và nhập hostname/AUD/token vẫn do chủ tài khoản thực hiện
theo [hướng dẫn tiếng Việt](CLOUDFLARE.md); wizard không cần quyền API tài khoản.
