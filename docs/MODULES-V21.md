# MHS V2.1 — đánh giá module (M0)

Issue #2 là đặc tả hợp nhất. Baseline RC2 `b63ead8`; không sửa MHC/điện thoại thật.
Đối chiếu npm registry chính thức và tài liệu upstream ngày31/10/2026. Phiên bản
được pin trong package-lock; không chạy install scripts. Không dùng CDN runtime.

| Module | Pin / license | Chọn và điều kiện |
|---|---|---|
| Uppy core / Tus |6.3.0 /6.0.0, MIT | UI upload trong original Panel; chunk8MiB, resume, không Dashboard/Companion riêng |
| Tus server / file-store |2.4.6 /2.1.1, MIT, Node≥20.19 | Pure JS filesystem; adapter đặt session/JWT/CSRF/Origin trước mọi request, private staging, giới hạn disk/chunk |
| yauzl |3.4.0, MIT, Node≥12 | lazyEntries/stream; bổ sung CRC, byte/count/ratio/path/symlink và transactional journal; không unzip trực tiếp vào live |
| archiver |8.0.0, MIT, Node≥18 | stream ZIP download; không buffer toàn archive, giới hạn số file/bytes |
| CodeMirror |6.0.2 + JS6.2.5/HTML6.4.12, MIT | editor trong Files, lazy local bundle, tối đa2MiB text |
| Adminer |6.2.0 MySQL-only, Apache-2.0 hoặc GPL2 | chỉ ghép qua MHS-auth proxy + site DB user/socket; không bare Nginx/public route; PHP native NOT RUN |
| restic |official Termux package, BSD-2-Clause | tùy chọn encrypted backup; cần password/recovery kit, SQL dump trước snapshot; native NOT RUN |
| node-cron |4.6.0, ISC (không phải MIT) | không dependency/native; schedule bền vững, allowlist job, noOverlap + operation lock, policy reboot |
| Cloudflare SDK |7.3.0, Apache-2.0 | official pure JS; source npm≈71MiB nên bundle riêng, lazy load; API token giới hạn khác connector; live mutations cần xác nhận |
| WP-CLI |official phar, MIT | optional, chỉ bật khi native PHP/Termux test đạt; hiện NOT RUN, không chặn ship |
| esbuild |0.28.2, MIT | công cụ build trên PC; binary không đưa vào gói Android, chỉ ship JS/assets/license |
| @noble/hashes |2.4.0, MIT | hash incremental browser,8MiB window; không file.arrayBuffer()512MiB |
| fastcgi-client / busboy |0.2.0 /1.6.0, MIT | private FPM transport + multipart stream; old FastCGI module bounded8MiB response/60s, no public route; native PHP gate NOT RUN |

Nền Node≥22.16 hiện tại đáp ứng engines của các runtime Node. Pure JS không cần
Linux glibc prebuild; khả năng Android/Bionic thực tế chưa được nghiệm thu. PHP
Adminer/restic dùng runtime/packages Termux, không Docker/root/panel thứ hai.
Dependencies chuyển tiếp được khóa integrity trong package-lock; license notices
được phát sinh cùng vendor build. Kiểm audit npm và RAM thực upload ghi trong
ACCEPTANCE/LIVE-PROGRESS tại checkpoint chức năng; không coi metadata là PASS native.

Audit lần đầu phát hiện3 moderate ở Archiver→readdir-glob→minimatch. Không downgrade
Archiver hoặc chạy force-fix: override minimatch11.0.1 (bản vá, cùng API Minimatch,
Node18/20/22+). npm install/audit sau override:0 vulnerabilities. Adapter chỉ đưa
danh sách file đã kiểm vào Archiver, không nhận glob do người dùng cung cấp.

M1 tái sử dụng auth/operation lock/site registry; thêm Tus upload store và streaming
ZIP/file transactions. M2 ghép editor/DB vào cùng trang site. M3 backup encrypted
và scheduler. M4 SDK domain preview/apply/rollback bảo toàn ingress. M5 release
chỉ sau integration tests; RC1/RC2 giữ bất biến.

Nguồn: [Uppy](https://uppy.io/docs/tus/),
[Tus](https://github.com/tus/tus-node-server),
[yauzl](https://github.com/thejoshwolfe/yauzl),
[Archiver](https://github.com/archiverjs/node-archiver),
[CodeMirror](https://codemirror.net/), [Adminer](https://www.adminer.org/),
[restic Termux](https://github.com/termux/termux-packages/blob/master/packages/restic/build.sh),
[node-cron](https://www.nodecron.com/),
[Cloudflare SDK](https://developers.cloudflare.com/fundamentals/api/reference/sdks/),
[WP-CLI](https://make.wordpress.org/cli/handbook/guides/installing/).
