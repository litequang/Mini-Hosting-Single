# Acceptance — 30 October 2026

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
