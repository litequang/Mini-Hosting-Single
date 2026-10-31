# Acceptance — 31 October 2026, Issue #1

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
