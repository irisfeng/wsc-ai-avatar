#!/usr/bin/env bash
# Defensively kills any orphan Next.js dev server holding the project's
# .next directory or our default ports. Runs automatically as `predev`
# so `npm run dev` always starts on a clean slate.
#
# Idempotent — safe to invoke even when nothing is running.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

found_any=0

# 1. Kill any next-server / next-dev process whose CWD is this project.
#    `lsof` would be more precise but is slower; `pgrep -f` is good enough.
for pat in "next dev" "next-server"; do
  pids=$(pgrep -f "$pat" || true)
  for pid in $pids; do
    # Only kill processes whose working directory matches THIS repo,
    # so we don't murder unrelated Next projects the user has open.
    cwd=$(lsof -p "$pid" 2>/dev/null | awk '$4 == "cwd" {print $NF}' | head -1)
    if [ "$cwd" = "$ROOT" ]; then
      echo "  ↳ killing stale '$pat' pid=$pid (cwd=$ROOT)"
      kill -9 "$pid" 2>/dev/null || true
      found_any=1
    fi
  done
done

# 2. Free up the canonical ports if THIS project's process is holding them.
for port in 3000 3001; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  for pid in $pids; do
    cwd=$(lsof -p "$pid" 2>/dev/null | awk '$4 == "cwd" {print $NF}' | head -1)
    if [ "$cwd" = "$ROOT" ]; then
      echo "  ↳ freeing port $port from pid=$pid"
      kill -9 "$pid" 2>/dev/null || true
      found_any=1
    fi
  done
done

if [ "$found_any" -eq 1 ]; then
  # Give the kernel a moment to release the sockets so `next dev` doesn't
  # immediately see them still bound.
  sleep 1
fi

# 3. macOS / iCloud Drive sometimes leaves ghost duplicates inside .next/
#    when the project lives under ~/Documents (iCloud-synced). The ghosts
#    look like "app 2/", "routes.d 2.ts" etc. (space + "2"). TypeScript
#    then sees duplicate identifiers and the dev server hangs at "Starting...".
#    Sweep them on every boot so the user never has to think about it.
if [ -d "$ROOT/.next" ]; then
  ghost_count=$(find "$ROOT/.next" -name "* 2" -o -name "* 2.*" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ghost_count" -gt 0 ]; then
    echo "  ↳ sweeping $ghost_count iCloud/Finder ghost duplicates from .next/"
    # -exec rm is safer than xargs when paths contain spaces
    find "$ROOT/.next" \( -name "* 2" -o -name "* 2.*" \) -exec rm -rf {} + 2>/dev/null || true
  fi
fi

exit 0
