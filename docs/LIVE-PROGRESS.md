# Live progress — Mini Hosting Single

Only this file records execution status. Source provenance: b2f04f9 MHC, read-only.

## Issue #2 — V2.1,31 October2026

| Timeline | Status | Latest result / SHA | Remaining |
|---|---|---|---|
| M0 modules | DONE | `8a86cc1`, audit0 | Android compatibility NOT RUN |
| M1 Files/deploy | DONE (PC) | `b678dd0`,512MiB/resume/ZIP/frontend PASS | Android/Internet NOT RUN |
| M2 Adminer/editor | DONE (source/PC adapter) | `08c1ad6`, scoped FCGI/auth PASS | native PHP/DB/Adminer NOT RUN |
| M3 restic/scheduler | DONE (PC) | `8278258`, real Windows restic PASS | Android/SQL/SFTP/S3/reboot NOT RUN |
| M4 domain | DONE (SDK mock) | `e9f922a`, preserve/conflict/rollback PASS | live Cloudflare NOT RUN |
| M5 integration/release | DONE (PC/distribution) | source `4c865fc`, artifact `d0d1793`, tag `v2.1.0-rc.1` pushed;42 tests/package/public SHA PASS | native acceptance remains NOT RUN |
| Physical acceptance | BLOCKED | NOT RUN; no authorized independent MHS Android available | fresh phone + own MHS Tunnel/Access/repository required |

M5 current checkpoint work: isolated real Chrome desktop/mobile viewport smoke
PASS for local login, real Uppy/Tus upload, CodeMirror save, site workspace,
schedule form and manual domain plan. Reinstall quarantine/undo, verified-backup
gate, MHC footprint refusal and trusted parent-path alias fixtures PASS. Owned
Nginx transfer-download guard migration preserves custom rules and rollback PASS.
No real reset, hosting-device operation or Cloudflare mutation. Source/packaging
and public hash verification are complete; next task is native acceptance below.
Final integration:
42 PASS,0 FAIL,0 skipped, including installed Chrome and real Windows restic;
latest Tus512MiB RSS75→111MiB (reported delta35MiB). Native/Internet still NOT RUN.
77 JavaScript syntax + boot/bootstrap bash syntax PASS. Final doctor change:
3 targeted regression tests PASS. origin/main fetched,0 ahead/behind at e9f922a;
reference MHC remains clean at b2f04f9. No remote account/device changed.

M5 source `4c865fc01552cfe58ea07ca0bf895723da486bad` pushed main. Immutable
2.1.0-rc.1 built from that exact commit:99 source/docs files + release manifest,
1118432-byte bundle,5034-byte bootstrap. Exact archive SHA/extraction/manifest/
fresh-install PC fixture and anonymous remote Panel/Monitor403 PASS. Generated
bootstrap bash syntax PASS. Source/package mode PC_ONLY; native/Internet NOT RUN.
Archive SHA256 `3450f42ef97de7e68c337864c972e7a42d3f232f4d9d375bd38fbff1071454c9`.
Bootstrap SHA256 `4bf4e9ac58b5e02f05f8daa181e365e81f659ad08cd4a2caa6b52aa5c79b1698`.
Artifact `d0d179319c4165096d577095d889fec42c39803f` and tag v2.1.0-rc.1 pushed.
Pinned bootstrap5034 bytes and archive1118432 bytes downloaded from public commit
URLs, plus archive from tag URL: HTTP200/exact SHA256 PASS. INSTALL.md publishes
copyable pinned command and first-site/Cloudflare/upgrade/rollback instructions.
All four V2.0 RC1/RC2 artifact hashes unchanged. Issue #2 native gates left open.
Published pinned install command bash syntax PASS; execution on PC refused
non-Termux before package/download/setup. Final documentation checkpoint: Git HEAD.
Blocker requiring owner: separate authorized MHS Termux and own Cloudflare LAB
scope; no current MHC phone may substitute. Next concrete task: run documented
fresh install/resume + doctor + PHP/Adminer/WordPress/Access/Monitor on that phone,
collect sanitized failures and fix only actual errors. No live reset/API executed.

M3 commit `8278258`, pushed main. M4 DONE (source/PC SDK mock): exact domain
preview/apply/HTTPS/remove, connector/API scope binding, private ownership journals,
full ingress/origin settings preservation, optimistic version/hash checks and
partial rollback.4 tests PASS using actual official SDK7.3.0 against fetch mock:
foreign DNS/wildcard/management names/stale config denied; foreign concurrent
change preserved and recovery marked; changed DNS refuses deletion. No real
Cloudflare resource or token was accessed. Native API/HTTPS/Internet NOT RUN;
wildcard automation intentionally not enabled. Current result: this M4 commit.
Next M5: guided setup/reinstall guards, focused integration and pinned2.1 release.

M2 commit `08c1ad6`, pushed main. M3 DONE (source/PC): encrypted restic backups,
site/owner tags + repository ID, SQL512MiB streaming, private recovery metadata,
verified restore/safety rollback, keepLast/prune, AES-GCM recovery kit export/import.
Durable node-cron/interval schedules + allowlisted async job runner integrated in
same Backups page, runit/Boot and upgrade/rollback.3 targeted PC tests PASS with
actual official restic0.19.1 Windows binary (asset digest verified); SQL adapter is
fixture. Init/backup/check/read-data/restore, injected SQL fault rollback, retention,
prune and encrypted kit roundtrip PASS. Windows ACL test required unsandboxed test
execution; no user data involved.9 backup/auth/setup/install regressions PASS,
JS65 syntax PASS. Android/native SQL/reboot/SFTP/S3/Internet NOT RUN. Existing
Node env/DB credentials preserved; cross-device config mapping remains manual.
Current result: this M3 commit. Next: M4 exact domain preview/apply/rollback using
official SDK, preserving unrelated ingress/DNS and existing SSO/Monitor routes.

M1 checkpoint `b678dd0` pushed main. M2 DONE (source/PC adapter): official Adminer
6.2.0 MySQL-only293497 bytes, digest/SHA verified; site workspace + site-only DB
binding/credentials once, private FPM proxy/proof, scoped PHP session and MHS form
CSRF/Origin checks. Root/foreign schema/server denied, no bare Adminer route.
CodeMirror integrated in M1.2 targeted PC tests PASS (actual HTTP + synthetic FCGI).
PHP lint/native Adminer/MariaDB/browser/Android/Internet NOT RUN. Interactive8MiB
response/64MiB import limits explicit in DATABASE-ADMIN.md. Current result: this M2
commit. Next: M3 encrypted restic backup/scheduler/recovery, preserving old backups.

M0 commit `8a86cc1`, pushed main. M1 DONE (source/PC checkpoint): integrated actual
Uppy/Tus/FileStore, yauzl/Archiver, local CodeMirror; protected site files, chunk
and final SHA, copy/move/trash/download, unzip preview/transaction/recovery and
frontend-only deploy/rollback. Windows4 new tests PASS including actual HTTP
35/90/150/512MiB uploads and broken connection retry; latest RSS73→111MiB
(delta38MiB), not512MiB buffered. ZIP traversal/CRC/bomb/collision refused;
skip/overwrite and failed-apply rollback PASS. Dist-only preserves backend,
env/storage/SQL fixtures, HTTP failure rollback PASS. Existing11 auth/hosting/
standalone regressions PASS. Browser UI/native Android/Internet NOT RUN.
Additional upload recovery and streamed ZIP download/readback PASS; final20
preservation regressions PASS, JS56 syntax PASS. Latest upload RSS74→111MiB.
Current result: this M1 commit; installer release still RC2 until M5. Next implement M2
Adminer site-user auth boundary and per-site operation page, then M3/M4.

M0 DONE (PC/source audit): latest main clean at `b63ead8`, read full Issue #2 and
baseline docs. Pinned pure-JS candidates + integrity lockfile, license/runtime
table in MODULES-V21.md. npm audit initially3 moderate; minimatch11.0.1 override
resolves all, final audit0. PC imports of Tus/FileStore/yauzl/Archiver/cron/official
Cloudflare SDK PASS. Android/Bionic/PHP/restic/Internet NOT RUN. No device/Cloudflare
configuration touched. Current result: this M0 commit. Next: M1 authenticated Tus
streaming upload + guarded ZIP/file operations + independent frontend deployment.

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

R2 commit: `cd1cad7`, pushed main. R3 source COMPLETE: Vietnamese wizard configures
owner +2 Access apps/AUDs, privately stores/reuses connector token and prints safe
manual routes9093/9092/8080; never calls account/DNS API. `mhs doctor` reports
sanitized PASS/FAIL/NOT RUN for packages/services/config/private permissions/boot
receipt/anonymous and spoofed remote denial, with repair steps. Boot invocation
does not certify reboot. Bootstrap now dispatches fresh/resume or existing MHS
source upgrade; old hosting/Cluster/user schema footprints refused before setup.
Management upgrade starts independent Monitor, rollback stops it before old Panel;
web/DB/Tunnel stay outside this restart scope. Windows9 targeted tests PASS
(remote-setup + install-upgrade + hosting), JS44/shell syntax PASS. Android/Internet
still NOT RUN. Current result: this R3 commit. Next: R4 regressions, immutable RC2,
exact pinned one-command install and current instructions.

R3 commit: `630d509`, pushed main. R4 source ready: RC2 version and current SSO/
Monitor/install/rollback instructions; corrected inherited Vietnamese UI labels and
actual Panel→Remote Monitor links. Windows regression25 tests PASS across8 runners
for modified auth/Monitor/installer plus preserved hosting/WordPress/Node/DB/backup
paths.44 JS syntax checks PASS, boot/bootstrap bash syntax PASS. Browser UI,
Android/reboot/native PHP/SQL/WP/public Access/Internet NOT RUN.
Current result: this R4 source commit. Next: create immutable RC2 from this commit,
smoke exact bundle/remote denial, push tag/artifacts and publish pinned install.

R4 source commit `1b52bb71d0fe38f544e3e50563bcbe788c14f56c`, pushed main.
RC2 `2.0.0-rc.2` packaged from that commit:56 committed source/docs files +
release manifest. Actual artifact checksum/extraction/manifest/fresh-install fixture
and anonymous403 on both remote listeners PASS; generated bootstrap bash syntax
PASS. Mode PC_FIXTURE_ONLY; Android/Internet/reboot/native hosting NOT RUN.
Archive SHA256 `97f847e641e139a4dd14688d37307d9e7bc03644c727a80e656d9f0641a6a22e`.
Bootstrap SHA256 `4194e1f22b31256e153f60263406d77492d7e78e45bec8c0cc36ec5c388c795b`.
RC1 archive/bootstrap hashes unchanged. Current checkpoint: immutable RC2 artifacts;
next publish tag, verify public bytes and attach exact pinned install command.

R4 DONE (source + PC + distribution scope): artifact commit
`e022684200a169a3c78f7d11d31d1c3bc1165cd5`, tag `v2.0.0-rc.2`, pushed main/tag.
Public pinned bootstrap5027 bytes and bundle116692 bytes: HTTP200/exact SHA256
PASS; tag bundle download/SHA PASS. INSTALL.md now contains exact pinned command,
fresh/resume/RC1-upgrade and local rollback instructions. All R1–R4 commits pushed;
physical Android/Internet acceptance remains NOT RUN and Issue #1 is left open.
Blocker: no authorized fresh MHS Android/Cloudflare test environment. Next task:
operator follows INSTALL + CLOUDFLARE + ACCEPTANCE on a separate clean phone;
collect sanitized `mhs doctor` output and fix any actual native failures.
Final docs command: bash syntax PASS; executing it on PC refused non-Termux
before package/setup actions PASS. Reference MHC repo remains clean at `b2f04f9`;
no phone or Cloudflare configuration was accessed or changed.
