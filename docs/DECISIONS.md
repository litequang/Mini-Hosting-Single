# Decisions — 30 October 2026

31 October — GitHub Issue #1 supersedes old remote-password/Monitor instructions.
Remote Panel uses owner-allowlisted Access SSO on9093, never local recovery9090.
Local listener rejects Cloudflare/proxy headers, remote never trusts localhost
Host or email headers. Token signature/owner/config/time rechecked every request;
session is token+identity+Host bound, logout hash persists across process restart.
Edge Access handles account/session revocation; offline JWT verification cannot
discover an account-wide revocation immediately. Logout redirects to Access;
do not promise per-app global logout or perpetual cross-app SSO without prompts.

- User requests an independent Mini-Hosting-Single repo, not an MHC mode.
- Preserve original Panel9090 UI/auth/hosting foundation; remove Cluster imports,
  background polling and production-specific adapters instead of disabling flags.
- Fresh installs/independent sites only; no conversion/unlocking managed writers.
- Direct Tunnel. Existing MHC phones and Cloudflare remain untouched.
- No fresh MHS phone available: PC fixtures first, Android/public acceptance NOT RUN.
- Ship useful S1/S2/S3 commits; do not equate source presence with Android PASS.
- User requested unauthenticated live LAN Monitor: add a read-only9091 surface,
  while preserving all authentication on management9090; never publish9091.
- Cloudflare setup uses a new user-created remotely managed Tunnel and Access app.
  An interactive local helper stores only its connector token; no account token
  is required. No existing Cloudflare resources are modified by this task.
- V2.0 instruction continues S1/S2 rather than rebuilding. MHC remote HEAD was
  verified unchanged. V1 archives were not found and are not a dependency.
- WordPress core installer uses official HTTPS version/checksum/download endpoints;
  fresh DB only. Node environment is private JSON and passed without a shell.
