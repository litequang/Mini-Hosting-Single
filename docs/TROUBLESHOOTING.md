# Troubleshooting

- V2.1 UPLOAD_CHUNK_CHECKSUM_FAILED: retry chunk; offset unchanged until verified.
  After refresh reselect the same file/site/directory. Check network/session first.
- UPLOAD_RECOVERY_REQUIRED / PREPARED: Files → Kiểm tra upload gián đoạn; verify
  or restore only that journal. Do not delete the journal or files to bypass it.
- UNZIP_RECOVERY_REQUIRED: Files → Khôi phục unzip gián đoạn, type site slug.
- FRONTEND_OVERLAPS_BACKEND_OR_DATA: configure a separate frontend directory;
  dist cannot contain dist/server.cjs backend. Never remove these guards.
- FRONTEND_RECOVERY_REQUIRED: use Rollback frontend with site confirmation;
  backend/SQL remain outside that recovery. Keep release files/journal.

- MHS_EXISTING_MHC_REFUSED: use a different clean Termux device; do not delete MHC
  markers/guards or copy its data to bypass this check.
- MHS_SETUP_REQUIRED: run setup in the isolated MHS data location.
- NOT_INSTALLED / service Offline on PC: expected without Termux services;
  fixture success is not physical hosting acceptance.
- Access403: check exact Host, team, audience, signature, clock and policy.
  Never disable JWT/CSRF or publish port9090 to fix it.
- CPU/network/battery unavailable: Android may restrict /proc or Termux:API;
  missing values remain unknown, not zero.
- Source upgrades must preserve data and credentials; never re-run an MHC installer.
- ZIP_CHECKSUM_MISMATCH / ZIP checksum: obtain an intact trusted archive, do not
  bypass checks. MHS_PRIVATE_OR_CLUSTER_IMPORT_REFUSED: no .env/wp-config/MHC
  config import; use independent source and local credentials.
- DEPLOY_RECOVERY_REQUIRED: inspect the private deploy journal and use recovery;
  never delete the journal or recreate the site to bypass a partial operation.
- WordPress provisioning failure preserves schema/files and failed-create metadata;
  do not create a replacement by dropping data. Native SQL checks remain NOT RUN.
- RESTORE_RECOVERY_REQUIRED / RESTORE_ROLLBACK_FAILED_SITE_IN_MAINTENANCE: keep
  maintenance503, restore journal, safety archive and SQL backup. Do not create a
  new site or remove guards/journals. Recovery must use verified safety data.
- Backups exclude private configuration; read BACKUP-RESTORE.md before deleting
  source data. SQL fixture PASS is not native MariaDB restore acceptance.
- Interrupted restore: Websites → Khôi phục restore, or `mhs recover-restore SLUG`;
  confirm same slug. Recovery reads original verified safety backup and local
  config from live/previous files; never remove maintenance/journal to unlock it.
- MHS_OPERATION_BUSY: wait for current deploy/restore/update. A dead PID can be
  recovered by the lock code; invalid/unknown lock requires inspection, no blind delete.
- MHS_RESUME_SAME_RELEASE_OR_USE_UPGRADE: use original bootstrap for unfinished
  install; use `mhs upgrade` for a different version. Never overwrite immutable releases.
- MHS_LAN_MONITOR_UNAVAILABLE: port9091 busy; management9090 stays available.
  No login is needed on9091, but do not publish it through Tunnel/forwarding.
- MHS_UPGRADE_ROLLBACK_FAILED: keep releases/current/upgrade.json and data. Resume
  same bundle or `mhs rollback`; do not run fresh install or restore DB for source error.

Issue #1 (31/10): Panel Internet uses9093 SSO, local password remains9090. Remote
Monitor uses9092 in separate mhs-monitor service. LAN9091 is never Tunnel public.
Run `mhs doctor` for redacted local diagnosis; it does not mutate or certify live
Cloudflare. Nonzero exit means at least one FAIL; NOT RUN is not PASS.
Legacy Access config schema1/no owner: run `mhs cloudflare`, set owner/two AUDs,
route Panel9093 and Monitor9092. Never change hostname/Host allowlists to bypass403.
Wrong email is denied even if the Access application admits that user.
If logout403 persists: follow the Cloudflare logout URL and authenticate again;
the old token is deliberately blocked, including after Panel restart.
Rollback RC1: only local/SSH recovery; never public9090 or reuse old remote login.
`mhs lan-monitor off` now requires `mhs service mhs-monitor restart`, not Panel.
