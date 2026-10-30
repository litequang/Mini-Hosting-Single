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
