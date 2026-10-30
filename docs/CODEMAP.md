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
