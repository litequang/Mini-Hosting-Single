# V2.0 reuse audit — 30 October 2026

Remote MHC branch codex/m1-m2-foundation checked: HEAD remains
`b2f04f9ac15d082005c61993db01eeb417c4f344`, same as selected source.
Reference repository/worktree is untouched. MHS S1/S2 already pushed as
`0fbbb54` / `ab1f6c3`; V2.0 continues that work.

| Module | ĐÃ CÓ | TÁI SỬ DỤNG | CẦN NÂNG CẤP / VIẾT MỚI |
|---|---|---|---|
| Original Panel9090 | MHC vendor + managed assets | layout/CSS, session, CSRF, scrypt, JWT, files | single-node pages, Website edit/environment, WordPress installer |
| Nginx/PHP/Node | original sites/system + MHC hosting scripts | site registry/file/deploy patterns | own configs/sockets/services; transactional deploy/recovery |
| MariaDB | original database module | identifier checks, dump/import pattern | MHS-only schemas/users/socket, restricted import, full site restore |
| Monitor | original stats + MHC telemetry | /proc/battery/network bounded sampling | local-only collector; read-only unauthenticated LAN9091 |
| Cloudflare | MHC origin JWT + connector services | JWT verifier, token-file service pattern | direct new MHS Tunnel, exact hostname guide; no Worker |
| Backup/restore | original archive/SQL + MHC snapshot/checksum | safety/checksum/staging patterns | independent per-site verified archive, SQL and recovery |
| Installer/updater | MHC manifests/resume/source rollback | release-pin/manifest/journal design | MHS fresh guard, independent release/boot/services/updater |
| Cluster orchestration | MHC Authority/DO/agents/lease/relay | NONE | excluded; no existing managed-site conversion |

Historical V1 archives named in the request were not found by filename under the
authorized workspace. Their contents are not assumed and do not block V2.0.
No device was accessed and no Cloudflare settings were changed for this audit.
