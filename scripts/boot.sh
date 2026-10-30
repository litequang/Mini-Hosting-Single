#!/data/data/com.termux/files/usr/bin/bash
set -eu
export PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
export PATH="$PREFIX/bin:$PATH"
export SVDIR="$PREFIX/var/service"
command -v termux-wake-lock >/dev/null && termux-wake-lock >/dev/null 2>&1 || true
if [ -f "$PREFIX/etc/profile.d/start-services.sh" ]; then
  . "$PREFIX/etc/profile.d/start-services.sh"
fi
# Only MHS-owned service directories; stock SSH services remain under user control.
for name in mhs-db mhs-php mhs-nginx mhs-panel; do
  test -f "$SVDIR/$name/mhs-owned" || continue
  test "$name" = mhs-panel || test ! -f "$SVDIR/$name/down" || continue
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    test -e "$SVDIR/$name/supervise/ok" && break
    sleep 1
  done
  sv -w 15 up "$SVDIR/$name" || exit 1
done
for service in "$SVDIR"/mhs-site-* "$SVDIR/mhs-tunnel"; do
  test -f "$service/mhs-owned" || continue
  test ! -f "$service/down" || continue
  sv -w 15 up "$service" || true
done
