# Troubleshooting

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
