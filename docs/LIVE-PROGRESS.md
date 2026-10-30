# Live progress — Mini Hosting Single

Only this file records execution status. Source provenance: b2f04f9 MHC, read-only.

| Milestone | Source status | PC tests | Android / Internet | Remaining |
|---|---|---|---|---|
| S1 standalone original Panel + LAN Monitor | SOURCE COMPLETE | PASS (6 tests) | NOT RUN | physical fresh device acceptance |
| S2 hosting / direct Tunnel | SOURCE COMPLETE | PASS (9 total tests) | NOT RUN | physical PHP/SQL/WP and HTTPS acceptance |
| S3 operations / release | SOURCE COMPLETE, PACKAGING | targeted PASS | NOT RUN | package RC; user Android acceptance |

No authorized fresh MHS device is available. Existing MHC devices/config remain
unchanged. S1: original Panel real local HTTP login/session/CSRF/Host and sites/files
PASS on Windows Node22; RS256 and MHC-import refusal PASS. Outbound fetch disabled
in Panel HTTP fixture; no Cluster endpoints. Read-only unauthenticated LAN Monitor
9091 tests PASS: metrics allowlist, no management routes, mutation/foreign Host/
cross-Origin rejected. Real LAN from another device is NOT RUN.

S1 result commit: `0fbbb54` (pushed main).

S2 result: this milestone commit (see Git log). Vhosts PHP/WordPress/static/Node,
private socket DB users, WordPress own credentials/salts, official core ZIP import,
SHA/CRC bounded ZIP deployment and code rollback, HTTP probe, direct connector
wizard/Access configuration. All9 Windows tests PASS; WordPress test uses synthetic
files, NOT real WordPress. No account/DNS/Tunnel was changed. No phone accessed.
S2 commit: `ab1f6c3` (pushed main).

V2.0 Website Manager checkpoint: source COMPLETE; targeted5 tests PASS on Windows
(hosting + website-v2). Edit hostname/Node entry/port/private environment; Panel
WordPress installer retrieves official version list/core/checksums then invokes
fresh-install PHP with credentials on stdin. Official endpoints are mocked in
tests; PHP/SQL installation, Android, public HTTPS all NOT RUN. Current result:
this checkpoint commit. No V1 archive dependency; reuse table in REUSE-AUDIT.md.
Website Manager / WordPress checkpoint: `be67c27`, pushed main.

Backup/restore checkpoint: source COMPLETE,2 targeted PC tests PASS. Real file
archive/Unicode/SHA256/readback/upload/restore and safety backup work in isolation;
SQL adapter fault after mutation rolls back in fixture. Native MariaDB/PHP/Android
and loss-of-power recovery NOT RUN. Online SQL/files are not one atomic snapshot;
private configs excluded. Details in BACKUP-RESTORE.md. Current result: this commit.
Backup checkpoint: `a6c37c0`, pushed main.

S3 source: fresh manifest/bootstrap, missing platform packages, isolated DB/socket,
runit/Boot, resume preserving admin, source upgrade/rollback and local operation
lock shared by original Panel/CLI. Restore recovery uses verified safety archive,
keeps journal. Monitor/settings/mobile logout improved. Recent focused Windows:
12 tests PASS (standalone/backup/install-upgrade) then3 website-v2 PASS including
actual Node HTTP with env/port. JS35 files and boot/bootstrap shell syntax PASS.
PHP/native services/WP/MariaDB/reboot/cross-device LAN/public Cloudflare NOT RUN.
See ACCEPTANCE.md; no overall system acceptance claim.

Current result: this S3 source commit. Next: build immutable2.0.0-rc.1, smoke actual
bundle in PC fixture, push bundle/tag and pinned install command. Android awaits user.
