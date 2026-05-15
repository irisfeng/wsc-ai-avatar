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

exit 0
