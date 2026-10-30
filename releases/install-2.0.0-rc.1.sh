#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
umask 077
VERSION='2.0.0-rc.1'
ARCHIVE='mhs-2.0.0-rc.1.mhs.gz'
EXPECTED='aafe08cbd4b174b62609c8ffecb5bb1555245ccb60ef154545713433bfe85e51'
test "${PREFIX:-}" = /data/data/com.termux/files/usr || { echo MHS_STANDARD_TERMUX_REQUIRED; exit 1; }
for footprint in .config/mhc-full-installer .local/share/mhc-full-installer android-hosting-panel .config/mini-hosting-cluster apps .nginx .cloudflared; do
  test ! -e "$HOME/$footprint" || { echo MHS_EXISTING_HOSTING_REFUSED; exit 1; }
done
# Dependencies are installed from the official Termux package repositories only.
if ! command -v node >/dev/null; then pkg update -y; pkg install -y nodejs-lts; fi
node -e 'const v=process.versions.node.split(".").map(Number);if(v[0]<22||(v[0]===22&&v[1]<16))process.exit(1)' || { echo MHS_NODE_22_16_REQUIRED; exit 1; }
missing=()
for package in curl coreutils util-linux nginx php php-fpm mariadb openssh termux-services termux-api cloudflared; do
  dpkg-query -W -f='${Status}' "$package" 2>/dev/null | grep -q 'install ok installed' || missing+=("$package")
done
if test "${#missing[@]}" -gt 0; then pkg update -y; pkg install -y "${missing[@]}"; fi
state="$HOME/.local/state/mhs-bootstrap"
mkdir -p "$state"
exec 9>"$state/bootstrap.lock"
flock -n 9 || { echo MHS_BOOTSTRAP_ALREADY_RUNNING; exit 1; }
bundle="$state/$ARCHIVE"
if ! printf '%s  %s\n' "$EXPECTED" "$bundle" | sha256sum -c - >/dev/null 2>&1; then
  curl --fail --location --proto '=https' --proto-redir '=https' --silent --show-error "https://raw.githubusercontent.com/litequang/Mini-Hosting-Single/v$VERSION/releases/$ARCHIVE" -o "$bundle.part"
  printf '%s  %s\n' "$EXPECTED" "$bundle.part" | sha256sum -c - >/dev/null || { echo MHS_DOWNLOAD_CHECKSUM_FAILED; exit 1; }
  mv "$bundle.part" "$bundle"
fi
stage="$(mktemp -d "$state/source-$VERSION-XXXXXX")"
node --input-type=module - "$bundle" "$stage" <<'MHS_EXTRACTOR'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {pathToFileURL} from 'node:url';
// Standalone bootstrap decoder: builtin modules only; embedded into pinned bootstrap.
export function extractSource(archive,target){
 const raw=fs.readFileSync(archive);if(raw.length>16*1024*1024)throw Error('MHS_SOURCE_SIZE_LIMIT');
 const lines=zlib.gunzipSync(raw,{maxOutputLength:32*1024*1024}).toString('utf8').trimEnd().split('\n'),header=JSON.parse(lines.shift());
 if(header.format!=='MHS_SOURCE_RELEASE'||header.project!=='MHS'||header.schema!==1||!Array.isArray(header.files)||header.files.length>301||header.files.length<16)throw Error('MHS_SOURCE_FORMAT_REFUSED');
 if(fs.existsSync(target)&&fs.readdirSync(target).length)throw Error('MHS_EXTRACT_NONEMPTY_REFUSED');fs.mkdirSync(target,{recursive:true,mode:0o700});if(fs.lstatSync(target).isSymbolicLink())throw Error('MHS_EXTRACT_SYMLINK_REFUSED');
 const map=new Map(header.files.map(f=>[f.path,f]));if(map.size!==header.files.length)throw Error('MHS_SOURCE_DUPLICATE');const seen=new Set();
 for(const line of lines){const v=JSON.parse(line),f=map.get(v.path);if(!f||seen.has(v.path)||!/^files\/[A-Za-z0-9_./-]+$/.test(v.path)||v.path.split('/').some(p=>p==='.'||p==='..')||typeof v.data!=='string'||v.data.length>4*1024*1024)throw Error('MHS_SOURCE_PATH_REFUSED');const data=Buffer.from(v.data,'base64');if(data.length!==f.size||crypto.createHash('sha256').update(data).digest('hex')!==f.sha256)throw Error('MHS_SOURCE_CHECKSUM_FAILED');const file=path.join(target,...v.path.split('/').slice(1));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,data,{mode:0o600,flag:'wx'});seen.add(v.path);}
 if(seen.size!==map.size)throw Error('MHS_SOURCE_INCOMPLETE');return target;
}
if(process.argv[1]&&process.argv[1]!=='-'&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)extractSource(process.argv[2],process.argv[3]);

extractSource(process.argv[2],process.argv[3]);
MHS_EXTRACTOR
# The installed source manifest is checked again before any data/service mutation.
node "$stage/tools/install.mjs"
printf '\nMHS ready: http://127.0.0.1:9090 (admin). Run mhs password locally for credentials.\n'
printf 'LAN read-only monitor: http://PHONE_LAN_IP:9091 (no login).\n'
printf 'Open Termux:Boot once and allow background/autostart for Termux, Boot and API.\n'
printf 'Cloudflare is optional: mhs cloudflare (new MHS resources only).\n'
