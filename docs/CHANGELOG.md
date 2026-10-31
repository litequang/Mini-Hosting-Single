# MHS 2.1.0-rc.2 ? Xiaomi 11T installation fixes

- Install `php-gd`; require GD/mysqli/curl/mbstring/zip during native install health
  and show individual extension checks in doctor. Missing packages no longer
  silently appear ready for WordPress image processing.
- Allow the exact public `SecretStream` class directory used by official
  sodium_compat, while retaining private-name, traversal, symlink, CRC and size
  guards. Actual WordPress 7.1.4: 4,250 streamed entries and 3,338 core checksums PASS.
- Export Termux `LOGDIR` before starting runit from Boot/non-login SSH. Existing
  stock SSH keys/service choices are preserved; doctor identifies a disabled SSH
  service instead of treating it as an Android crash.
- Fresh install marks stock nginx/php-fpm/mysqld down and also stops an already
  supervised instance before starting the MHS equivalents. Unknown/orphaned
  processes are not killed. A stop failure refuses startup for operator review.
- 12 targeted PC regression tests PASS. Full fresh RC2 Android installation and
  physical reboot remain NOT RUN; Wi-Fi loss/Android process termination cannot
  be repaired or certified by these source changes. Existing 11T RC1 deployment
  supplied the reported problems; no production or Cluster state was changed.
- Earlier release artifacts remain immutable. Follow the new pinned RC2 command
  in INSTALL.md; rerunning an old pinned command continues to install the old code.

# MHS2.1.0-rc.1

- Original Panel: site workspace, Files Uppy/Tus512MiB + SHA/resume, folder upload,
  ZIP streaming/preview/collision/rollback, trash/download, CodeMirror; frontend
  replacement riêng giữ backend/env/storage/SQL.
- Site-scoped Adminer6.2 qua cùng xác thực/CSRF Panel và private FPM socket.
- Restic mã hóa, SQL streaming512MiB, verify/safety restore/retention/recovery kit;
  scheduler cron/timezone/chu kỳ với journal, no overlap và retry gián đoạn.
- Official Cloudflare SDK tùy chọn: scoped token riêng connector, exact hostname
  preview/apply/HTTPS/remove, giữ toàn bộ ingress khác, ownership/rollback có điều kiện.
- First-site wizard, reset cách ly riêng MHS sau backup ngoài máy, rollback source.
- Trusted Android parent-path aliases; reserve9092/9093; bảo vệ khóa/private files
  và chặn Nginx tải các gói ZIP/SQL/backup đã upload, migration cấu hình có backup.

Runtime JS/assets vendor cục bộ, không CDN/npm trên máy đích. Legacy website,
WordPress/Node/SQL/backup và Access/Monitor được giữ. RC1/RC2 V2.0 bất biến.
PC tests không chứng nhận Android/PHP/MariaDB/Adminer/Internet; xem ACCEPTANCE.
WP-CLI/wildcard automation chưa bật. Chuyển config/URL WordPress độc lập thủ công.

## 2.1.0-rc.3

Guided Node deployment in original Panel Files/site workspace: locked first-use
production dependencies, private owned database/socket binding and restart/HTTP
verification. Bounded512MiB SQL uploads,8MiB SHA256 chunks, background backup,
import progress, rollback and interruption recovery guards. No runtime data or
credentials in release. See NODE-DEPLOY.md for application requirements.

## 2.1.0-rc.4

Fix native source upgrade management paths: rewrite the Panel run script after
switching source and resolve current before writing Panel/Monitor/scheduler paths.
This also makes rollback start historical entrypoints correctly. Data services,
websites and Tunnel are outside the management restart scope. Use the new pinned
installer to upgrade older code; do not modify a historical release in place.

RC5: direct .env file upload in guided Node deployment, private64KiB file storage,
Node built-in dotenv parsing before child launch; managed DB/URL overrides and
site-owned PORT retain precedence. No plaintext file/API value echo. SQL native
failure on a17.3MB INSERT exceeded the existing16MiB packet: client128MiB budget,
temporary scoped root-socket server allowance with finally restoration, fresh
service128MiB default. SQL diagnostics expose numeric code/line only. Fresh
service paths are also resolved before launch. Earlier artifacts unchanged.
