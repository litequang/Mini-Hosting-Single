# Source provenance

Reference: litequang/Mini-Hosting-Cluster, commit
`b2f04f9ac15d082005c61993db01eeb417c4f344` (30 October 2026).
Copied committed blobs only, without Git history, runtime or private data.

Original Panel base: vendor/mini-hosting-warm-standby-v1/mini-hosting-dr-v1/panel.
Reused layout/CSS, browser helpers/file manager/database UI, HTTP session/CSRF
server, scrypt password and path validators, ZIP parser, site/file/database/backup
operations. Standalone adapters replace cluster bridges and device assumptions.
Origin JWT validation is from bin/legacy-panel-src/src/mhc-remote-access.mjs.

No Cluster integration, managed-site runtime, existing production-site adapter,
Thờ Phượng Pro backup manager, Authority Worker/DO, enrollment, site relay,
distributed writer gates or MHC installer is copied or executed.
The inherited source is marked UNLICENSED; this project does not grant a new license.
