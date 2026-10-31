# Live progress — Mini Hosting Single

Only this file records execution status. Source provenance: b2f04f9 MHC, read-only.

## Issue #1 — 31 October 2026

R1 source COMPLETE: local password9090 and remote SSO9093 are separate loopback
listeners. Remote checks RS256/issuer/AUD/time/exact Host, one explicit owner email
and signed subject every request. Automatic secure session binds Host/identity/
token, mutation requires CSRF+Origin. Logout stores hashes until expiry and sends
browser to Access logout. Legacy schema1 config fails closed until owner is set.
Windows8 targeted tests PASS (panel-sso + standalone); Android/Internet NOT RUN.
Wrong owner/Host/AUD, forged/expired JWT, missing CSRF/Origin, local-cookie replay,
owner removal, JWKS offline and logout replay rejected. Current result: this R1
commit. Next: independent remote read-only Monitor9092 (R2).

R1 commit: `fca36cc`, pushed main. R2 source COMPLETE: mhs-monitor independent
service runs anonymous LAN9091 and JWT/owner-checked loopback Remote Monitor9092.
Same sanitized GET-only routes, no management/session/password router. Monitor
has its own hostname/AUD/config; Panel token/cookies cannot authorize it. Panel
links to configured Remote Monitor; polling pauses on hidden tabs. Tests below
are PC fixtures; Android/Internet remain NOT RUN. Current result: this R2 commit.
Next: wizard both Access apps + safe route plan + doctor + install/upgrade (R3).

| Milestone | Source status | PC tests | Android / Internet | Remaining |
|---|---|---|---|---|
| S1 standalone original Panel + LAN Monitor | DONE (source/PC) | PASS | NOT RUN | physical fresh device acceptance |
| S2 hosting / direct Tunnel | DONE (source/PC) | PASS | NOT RUN | physical PHP/SQL/WP and HTTPS acceptance |
| S3 operations / release | DONE (source/PC RC) | PASS | NOT RUN | user Android acceptance |

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

S3 source commit: `6e4941624ac318e5958664d90468d04348ec527f`, pushed main.

RC2.0.0-rc.1 packaged from that exact commit:51 source/docs files + release manifest,
98234-byte source-only bundle. Actual artifact extraction/manifest/fresh-install
PC fixture PASS (tools/package-smoke); generated bootstrap bash syntax PASS.
Bundle SHA256 aafe08cbd4b174b62609c8ffecb5bb1555245ccb60ef154545713433bfe85e51.
Bootstrap SHA256 b014de5b3bc609cf224a8f4723f6e91fb5c64e1d93d178f4305f012d63776a12.
No runtime/secrets/history imported. MHC still clean at b2f04f9.

Release artifact commit `2b24bd0ea732dcb5c32de38f00063ab1add4c9d1`, tag
`v2.0.0-rc.1`, both pushed. Public raw bootstrap and bundle downloaded again:
HTTP200 + exact SHA256 PASS; bootstrap tag bundle URL HTTP200. Pinned command
is now in INSTALL.md; code/bundle remain unchanged. Current docs commit: Git HEAD.
Next concrete task: user overall fresh-Termux acceptance per INSTALL/ACCEPTANCE,
then fix actual reported failures. No authorized Android or new MHS Cloudflare
resources are available; native/Internet tests remain NOT RUN, not release-certified.
R2 verification:8 targeted Windows tests PASS (remote-monitor + standalone), boot shell and browser script syntax PASS.
