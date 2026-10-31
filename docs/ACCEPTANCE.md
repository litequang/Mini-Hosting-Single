# Acceptance — 31 October 2026, V2.1 / Issue #2

M5 integration on Windows Node22.22.2: **42 tests PASS,0 FAIL,0 skipped** in one
targeted integration run covering changed/preserved features. Real installed
Chrome tested local login, Uppy/Tus multi-file upload, CodeMirror save, site
workspace, schedule form and manual domain plan, including mobile viewport.
This is PC browser automation, not physical Android or visual design approval.
Actual restic0.19.1 Windows encrypted backup/check/restore/retention/kit PASS; SQL
adapter remains injected. Tus35/90/150/512MiB HTTP/resume PASS; latest RSS75→111MiB
(reported delta35MiB after rounding). Reset/quarantine/undo/private-path boundaries
and owned Nginx guard migration/reload-error rollback PASS with fixtures.
77 JavaScript syntax checks and boot/bootstrap bash syntax PASS. After final
doctor text/private-file-list update,3 remote-setup/doctor/lifecycle tests PASS.

| V2.1 native acceptance | Result | Needed next |
|---|---|---|
| Fresh/resume/upgrade/reboot on Android | NOT RUN | separate authorized MHS Termux |
| PHP lint/Adminer6/MariaDB/WordPress | NOT RUN | native PHP/SQL integration |
| Access SSO/Monitor + Internet upload | NOT RUN | own MHS Tunnel/two Access apps |
| SDK apply/HTTPS/delete on Cloudflare | NOT RUN | explicit own account LAB scope |
| Restic SFTP/S3, service restart/reset | NOT RUN | separate remote repository + Android |
| WP-CLI / wildcard automation | NOT ENABLED | optional, native gate/manual scope |

Exact2.1 RC1 archive1118432 bytes/99 source files + manifest: checksum/extraction/
manifest/fresh-install fixture and remote anonymous403 PASS. Bootstrap bash syntax
PASS; public pinned commit bootstrap/archive + tag archive downloaded, HTTP200
and exact SHA256 PASS. V2.0 RC1/RC2 bytes unchanged. Artifact/tag `d0d1793` /
`v2.1.0-rc.1`; source `4c865fc`. No MHC phone, production resource or real hosting
data was changed. No overall native/Internet acceptance claim.

V2.1 M4:4 tests PASS with official Cloudflare SDK and mocked HTTP API. Full ingress/
origin/unknown settings preserved; DNS ownership/conflicts/wildcards/reserved hosts,
stale plan/concurrent write, DNS failure rollback, HTTPS response states and delete
ownership checked. No live Cloudflare mutation. Android/API/Internet NOT RUN.

V2.1 M3:3 targeted tests PASS, including actual restic0.19.1 Windows encrypted
init/backup/check/restore/forget/prune and kit roundtrip. SQL dump/import adapter
is a fixture; injected post-mutation SQL failure rolls back SQL/files. Scheduler
durability/validation/no overlap and busy lock retry PASS.9 related old regressions
PASS, JS65 syntax PASS. Native SQL/Android/reboot/SFTP/S3/Internet NOT RUN.

V2.1 M2:2 targeted PC tests PASS: site DB binding, pinned Adminer release hash,
CGI proof and scoped cookie filtering; real HTTP Access/session/Origin/form-CSRF
then synthetic private FastCGI, response no-store/CSRF insertion, root/foreign
schema/server/bare Adminer denial. PHP syntax/Adminer SQL/native MariaDB/browser
iframe/Android/Internet NOT RUN. These tests validate the adapter, not PHP runtime.

V2.1 Issue #2 M1: Windows actual HTTP35/90/150/512MiB Tus uploads, partial request
disconnect→offset unchanged→retry, chunk/final SHA, HEAD session+CSRF/site boundary,
private paths/hardlink/traversal, streamed download ZIP readback, trash/restore,
unzip CRC/bomb metadata/collision/skip/overwrite/error rollback, dist-only safety
and HTTP-failure rollback:4 targeted tests PASS. RSS74→111MiB (delta37MiB) in latest
upload run. Existing20 auth/hosting/backup/installer/WordPress/Node regressions PASS;
JS56 syntax PASS. Browser UX, native Android and Internet NOT RUN.

R1/R2/R3/R4 regressions: Windows Node22.22.2,25 tests PASS trong8 runner liên
quan auth/Monitor/wizard/doctor/install/updater và hosting preservation;44 JS syntax
checks PASS, bash -n boot/bootstrap PASS. No Android or Cloudflare mutation run.

| Issue #1 scope | Kết quả đã chạy | Giới hạn |
|---|---|---|
| R1 SSO9093 / local9090 | PASS real local HTTP, fixture signed JWT; owner/Host/AUD/issuer/time/signature/CSRF/Origin/session checks, logout/replay/restart, local password | live Access and browser UX NOT RUN |
| R2 Remote9092 / LAN9091 | PASS sanitized GET whitelist, wrong token/cookie/owner/AUD denied; no admin/log/file routes; no-store | remote Internet and cross-device LAN NOT RUN |
| R3 wizard / doctor | PASS hidden/reused token, two apps/safe plan, actual negative HTTP probes, redacted reports, Monitor lifecycle fixture | account app/route permission, Termux native NOT RUN |
| R4 regression / artifact |25 tests PASS, JS/shell syntax PASS; RC2 exact checksum/extraction/manifest/fresh-install fixture and anonymous403 on remote Panel/Monitor PASS | physical install/reboot/PHP/SQL/WP/HTTPS NOT RUN |

Issue #1 code/checkpoints delivered without closing its physical acceptance gaps.
Below are inherited hosting checks, rerun where listed above to preserve behavior.

Windows Node22.22.2/Git Bash; không có Android MHS riêng. Theo yêu cầu mới, chỉ
chạy syntax/test liên quan từng checkpoint, để user kiểm tổng thể.

| Nhóm | Đã kiểm | Kết quả / giới hạn |
|---|---|---|
| Original Panel/auth/files | real loopback HTTP, password/Host/CSRF/logout | PASS |
| Access | RSA signature/issuer/AUD/expiry/tamper | PASS fixture, Internet NOT RUN |
| LAN Monitor | GET-only allowlisted metrics; no login/admin/log/secrets; Host/Origin deny | PASS; cross-device LAN NOT RUN |
| Websites/Node | config validation; actual Node HTTP with env/port | PASS; native runit/Nginx NOT RUN |
| WordPress | official HTTPS URL/version/checksum fixtures | PASS; native PHP/SQL/WP NOT RUN |
| ZIP | SHA/CRC/path/private config refusal/code rollback | PASS fixture |
| Backup | real file/Unicode/SHA/upload/restore; injected SQL failure; interrupted-directory recovery | PASS; native MariaDB NOT RUN |
| Install/update | resume after credentials, unchanged hashes; source health failure→rollback→retry; local lock | PASS fixture |
| Syntax | JS35 files, bash -n boot/bootstrap | PASS; PHP linter unavailable |
| Android/reboot/public hosting | no authorized fresh device/resources | NOT RUN |

Recent focused run12 tests (standalone/backup/install-upgrade) PASS, then3
website-v2 tests PASS. Prior hosting3 tests PASS at that checkpoint. This is not
a full system/production certification. Actual release bundle has its own smoke
verification recorded in LIVE-PROGRESS after packaging.

No MHC phone/SSH/DB/writer guard, Cloudflare or reference source was changed.
Remote reference HEAD was verified b2f04f9. No whole-account zero-request claim.
