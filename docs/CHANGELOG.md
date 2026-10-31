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
