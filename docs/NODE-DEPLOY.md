# Deploy a Node.js website

Create a Node website with its hostname and actual backend entrypoint, for
example `dist/server.cjs`. Upload the production build plus `package.json` and
`package-lock.json` to the application root. A frontend-only `dist` and SQL
dump do not provide a Node backend or runtime dependencies. Build on a PC;
do not upload Windows `node_modules` to Android.

Open **Files → Triển khai Node.js** (also in the site workspace):

1. Type the site slug and install/update libraries. MHS runs locked production
   `npm ci --omit=dev --ignore-scripts` in private staging, checks that manifests
   are unchanged, then replaces `node_modules`. Previous modules survive until
   the next preparation attempt. Native packages or packages requiring install
   scripts need an Android-compatible build prepared separately.
2. Select an existing MHS database and save configuration. Databases bound to
   other sites are excluded. MHS privately supplies `MYSQL_SOCKET`, `MYSQL_USER`,
   `MYSQL_PASSWORD`, `MYSQL_DATABASE`, a small pool, production mode and HTTPS
   URL. The application must support these variables and Unix sockets. Other
   frameworks need their own adapter. Upload the original `.env` in the same
   dialog (maximum64KiB). MHS stores it privately outside replaceable application
   code and reads it before spawning Node. No JSON conversion is required. MHS
   database/URL configuration takes precedence; PORT comes from the site registry.
   Reserved process injection variables are refused. Previous files are saved
   privately; no environment values are returned by the API.
3. Use **Databases → Restore SQL** for a trusted dump if needed. Maximum512MiB;
   transfer uses8MiB checksummed chunks. Watch upload, backup and import phases.
   Import starts after validation and a successful backup. Failed imports restore
   that backup; interrupted mutation/failed recovery blocks further imports for
   operator inspection. Keep the safety backup until the application is verified.
4. Start the application and check HTTP. MHS restarts only the site's owned
   service and refuses to label the default `MHS Node ready` placeholder ready.
   View site Logs if startup fails. This action does not run SQL migrations.
5. Point the exact Cloudflare Tunnel hostname to `http://127.0.0.1:8080` and test
   public HTTPS, assets and application APIs. Import does not supply media or keys.

Closing the dialog does not stop background jobs. Reopen to inspect progress.
Uploads abandoned before import can be cancelled. Interrupted database mutation
requires manual safety-backup review; it is never retried blindly. Private jobs,
configuration and backups are not public files or Git data.

Validation: authenticated90MiB HTTP upload, rollback/interruption tests and guided
Chrome install/config/start/SQL progress PASS on PC. Android and Internet results
are recorded separately in LIVE-PROGRESS.md.

RC5: SQL file limit512MiB, individual statement/client/server packet budget128MiB.
For existing installations the budget is temporarily raised through the private
root socket and restored after import/failure; no SQL service restart is needed.
Fresh services use128MiB. Error reports contain only numeric SQL codes/line numbers,
never failing row text.

For apps using file-backed media, put SHEET_STORAGE_ROOT in the uploaded .env
with an absolute path to the folder containing the archive's inner media paths.
A ZIP wrapper named sheets means the root is the extracted sheets directory,
not its parent. Prefer persistent site storage outside replaceable app code.
If a previous managed environment JSON contains the same variable, remove that
one override after verifying the .env value, since managed values take precedence.
Private env values/files and media stay out of Git.

Files provides Sửa .env and Restart Node.js. The authenticated editor displays
current effective configuration; saving consolidates legacy managed values into
the private .env file with backups. Ordinary file routes still deny env downloads.
For the dist-only deployment layout, keep sheets beside dist and set the absolute
SHEET_STORAGE_ROOT accordingly. Replacing dist does not replace sibling sheets.
