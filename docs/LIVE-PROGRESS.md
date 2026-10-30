# Live progress — Mini Hosting Single

Only this file records execution status. Source provenance: b2f04f9 MHC, read-only.

| Milestone | Source status | PC tests | Android / Internet | Remaining |
|---|---|---|---|---|
| S1 standalone original Panel + LAN Monitor | SOURCE COMPLETE | PASS (6 tests) | NOT RUN | physical fresh device acceptance |
| S2 hosting / direct Tunnel | SOURCE COMPLETE | PASS (9 total tests) | NOT RUN | physical PHP/SQL/WP and HTTPS acceptance |
| S3 operations / release | NOT STARTED | NOT RUN | NOT RUN | backup restore, installer, upgrade rollback |

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
Next concrete task: verified per-site file+SQL backup/restore, then fresh release
installer and transactional updater/rollback. Overall V2.0 remains IN PROGRESS.
