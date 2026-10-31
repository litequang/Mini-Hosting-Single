# Code map

V2.1 Issue #2: MODULES-V21.md records candidate/license/runtime decisions;
package-lock.json pins dependencies/integrity; deployment will use local vendor
bundles, no runtime CDN/npm requirement. RC1/RC2 archives remain immutable.

Issue #1 R1: remote-access.mjs adds strict schema2 owner-identity mapping, separate
local/remote authorizers and bounded JWKS cache. createPanelServer factory keeps
local password and remote-only SSO sessions separate. tests/panel-sso exercises
real loopback HTTP with locally signed JWT/JWKS fixture, not live Cloudflare.

R2: monitor-server.mjs owns separate mhs-monitor service; lan-monitor.mjs provides
anonymous LAN and verified remote read-only factories with route allowlists.
remote-monitor.test covers method/Host/AUD/identity/session separation and fields.

R3: cloudflare.mjs Vietnamese owner/two-app wizard + safe local route plan; no API.
doctor.mjs: bounded sanitized package/service/config/permission/HTTP denial report.
setup-entry.mjs: fresh/resume vs verified existing-MHS source upgrade dispatch.
management.mjs: independent Monitor lifecycle when source upgrades/downgrades;
boot-record.mjs: invocation receipt, explicitly not physical reboot acceptance.

- panel/src/server.mjs: original HTTP Panel, loopback, password/session/CSRF/Host.
- config.mjs: separate MHS data marker and registry, MHC import refusal.
- security.mjs / zip.mjs: inherited scrypt, path and archive boundaries.
- sites.mjs / system.mjs: independent sites, files, Nginx, runit, local Monitor.
- databases.mjs / backups.mjs: local database and backup adapters.
- remote-access.mjs: exact Host + RS256 Access issuer/AUD/expiry/JWKS.
- panel/public: original layout/CSS/helpers/file manager, single-node pages.
- tests/standalone.test.mjs: isolated PC and real loopback HTTP tests.

Runtime belongs outside source. No Cluster runtime or Worker deployment exists.

S2: hosting.mjs owns standalone PHP/Nginx config and private WordPress config;
databases.mjs restricts import/dump to each MHS schema's own local socket user.
sites.mjs stages ZIP/CRC/SHA, rejects managed-site/private config imports and keeps
previous code. tools/cloudflare.mjs uses hidden connector input, token-file and
original origin JWT adapter; no Cloudflare API/Worker credentials. Tests/hosting
are PC fixtures, not native PHP/SQL/WordPress acceptance.

V2 Website Manager: updateSite validates hostname/port/relative Node entry and
private env; tools/node-app.mjs launches app without shell interpolation.
wordpress.mjs downloads only official WordPress HTTPS endpoints and verifies core
checksums; wordpress-install.php accepts fresh admin input on stdin. No WP-CLI
phar, MHC credentials or hosted controller required. Native acceptance NOT RUN.

archive.mjs: bounded checksummed MHS gzip archive with path-safe extraction.
backups.mjs: per-site safety backup, restore/upload/readback, SQL/files rollback,
maintenance journal. Backup/restore reuses original authenticated Panel endpoints.
tests/backup.test.mjs: real isolated files + injected SQL adapter failure.

tools/install.mjs: fresh/resume admin/own DB/config/services/Boot/health.
release.mjs / extract-release.mjs: source manifest/SHA/path bounds.
upgrade.mjs: current pointer/restart/health/automatic rollback, no SQL changes.
operation.mjs: local lock shared with Panel mutation queue.
build-release.mjs: committed Git blobs only → checksummed bundle/bootstrap.
scripts/bootstrap.sh.in / boot.sh: official Termux packages, MHS-owned runit.
cli.mjs: status/service/cloudflare/password/monitor/upgrade/rollback/recovery.
install-upgrade.test / package-smoke.mjs: PC fixtures, not Android acceptance.
