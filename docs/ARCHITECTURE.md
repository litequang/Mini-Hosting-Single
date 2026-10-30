# Architecture

One phone owns its sites and data. Direct Tunnel routes website hostnames to
loopback Nginx8080; Nginx dispatches static/PHP/Node. Panel9090 is loopback-only.
Remote Panel requires an exact configured hostname, valid Access JWT, local
password/session, and mutation CSRF/Origin. Local recovery needs only password.
JWKS retrieval for Access is not a Worker/DO request. There is no Cloudflare
orchestration loop or external authority on website requests.

Data/config/admin/sites/DB/backups live under ~/.local/share/mhs/data, separate
from immutable source releases. Services use mhs-* names. Existing MHC footprints
are refused by setup; MHC managed data is not a supported import.

Termux processes share an Android UID: this is personal hosting of trusted apps,
not a sandbox for untrusted tenants. Root/Android permissions are not required.
