# Troubleshooting

- RESTIC_UNAVAILABLE: `pkg install restic`, then `mhs doctor` and scheduler up.
- RESTIC_REPOSITORY_CHANGED: stop backup jobs; verify repo ID/config, do not init
  over an existing repository or change state to adopt it.
- RESTIC_LOW_MEMORY / INSUFFICIENT_DISK_SPACE: postpone job, preserve website and
  reserve. RESTIC_LOCAL_REPOSITORY_LIMIT_RUN_PRUNE: review retention/prune owned repo.
- BACKUP_JOB_PENDING: inspect job list; Retry FAILED/INTERRUPTED only after typed
  confirmation. Old process may still be active; do not remove locks to bypass it.
- RESTIC_RESTORE_RECOVERY_REQUIRED: keep maintenance/journal/safety snapshot;
  Backups → recovery, typed slug. Never delete a DB or old root to unblock.
- RECOVERY_KIT_INVALID_OR_WRONG_PASSPHRASE: verify kit/passphrase locally; do not
  paste secret material into chat. Kit alone cannot replace a lost local repository.

- SITE_DATABASE_NOT_CONFIGURED: Websites → Site → Tạo database cho site. Do not
  bind arbitrary existing/root schemas or change credentials files to bypass.
- PHP_FPM_UNAVAILABLE: `mhs doctor`, then `mhs service mhs-php up`; no public
  Adminer port is needed. Native PHP wrapper checks must pass on the test device.
- ADMINER_RESPONSE_LIMIT_USE_BACKUP_EXPORT: use Backup SQL/site export for large
  data; do not increase response buffers. Adminer SQL form2MiB/import64MiB.
- DB iframe403 after session expiry: reload Panel/Access, reopen Database. PHP
  cookies alone never authorize MHS. Local9090 remains password recovery.

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
