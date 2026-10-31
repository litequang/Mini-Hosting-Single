# Architecture

One phone owns its sites and data. Direct Tunnel routes website hostnames to
loopback Nginx8080; Nginx dispatches static/PHP/Node. Panel9090 is loopback-only.
Local password Panel9090 and remote SSO Panel9093 are separate loopback listeners.
Remote requires exact hostname, Access JWT and explicit signed owner identity,
automatic secure session and mutation CSRF/Origin; no second admin password.
Local recovery9090 rejects proxy/Cloudflare headers and needs the admin password.
JWKS retrieval for Access is not a Worker/DO request. There is no Cloudflare
orchestration loop or external authority on website requests.

Data/config/admin/sites/DB/backups live under ~/.local/share/mhs/data, separate
from immutable source releases. Services use mhs-* names. Existing MHC footprints
are refused by setup; MHC managed data is not a supported import.

Termux processes share an Android UID: this is personal hosting of trusted apps,
not a sandbox for untrusted tenants. Root/Android permissions are not required.

WordPress creates its own schema/user/salts and accepts official core ZIP, refusing
wp-config from uploads. Existing uploads survive code deployment unless a conflict
requires operator action. SQL management connects to a dedicated Unix socket;
database import/dump use schema-specific users, not root. Root is used only to
provision new MHS schemas/users. No database is dropped on failed creation.

LAN Monitor9091 is a separate GET-only listener within the original Panel process,
with private-address/Host/Origin restrictions and explicit sanitized fields. It has
no session, management router, logs, credentials or arbitrary file access.

One committed source release manifest, SHA256 bundle/files, resumable install
journal and immutable releases/current. No .git/history/runtime is packaged.
Source upgrade switches current, restarts/verifies Panel, rolls back source on
failure. Data/SQL are outside its write scope. Platform packages come from Termux
and are not downgraded by source rollback. Local process lock excludes concurrent
management/update; it is not a distributed authority/lease.
