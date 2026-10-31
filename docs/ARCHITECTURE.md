# Architecture

V2.1 adds site-scoped adapters within this Panel, using audited pure-JS vendor
bundles. No second panel, upload bypass, privileged daemon or Cluster runtime.
See MODULES-V21.md for license/native validation gates; Android remains NOT RUN.

M1 upload requests enter the same verified Panel session boundary, including Tus
HEAD/PATCH. Each verified8MiB chunk stages to private disk before append; final
SHA must match before publishing a file. ZIP upload, unzip, frontend-only directory
swap and full-app release are distinct operations. Shared local operation lock
serializes mutations across local/remote listener; no public chunk service exists.
Private staging records owner+site and conservative disk reservations. Zip/file
adapters reject links, protected paths, collision/CRC/expansion limits. Backend
and SQL remain outside frontend-only write scope. Same Android UID remains the
trust model; these guards do not sandbox malicious applications.

M2 SQL explorer is an authenticated Panel route, forwarded only to the existing
private PHP-FPM Unix socket with a short-lived HMAC adapter proof. It uses the
site-bound SQL user; PHP cannot select arbitrary remote server/root/other schema.
POST staged to disk before form-CSRF authorization and forwarding; both MHS and
Adminer session/CSRF checks apply. Cookie scopes and identities stay separate.
No Nginx alias to Adminer, no additional listener, no raw SQL credentials in CGI
headers/URLs. Interactive response8MiB cap keeps legacy FastCGI buffering bounded.

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

LAN Monitor9091 is a GET-only listener in an independent mhs-monitor process,
with private-address/Host/Origin restrictions and explicit sanitized fields. It has
no session, management router, logs, credentials or arbitrary file access.
Remote Monitor9092 is loopback-only, uses a separate Access hostname/AUD and
owner-identity check before every GET, and shares only sanitized telemetry/assets.
It never requires or accepts Panel sessions. No Monitor route enters Panel APIs.

One committed source release manifest, SHA256 bundle/files, resumable install
journal and immutable releases/current. No .git/history/runtime is packaged.
Source upgrade switches current, restarts/verifies Panel, rolls back source on
failure. Data/SQL are outside its write scope. Platform packages come from Termux
and are not downgraded by source rollback. Local process lock excludes concurrent
management/update; it is not a distributed authority/lease.
