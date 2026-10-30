# Code map

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
