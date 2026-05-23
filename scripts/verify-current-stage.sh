#!/usr/bin/env bash
# Current-stage verifier for the Pika-style half-duplex debate prototype.
# This is intentionally cheaper than scripts/smoke.sh: it does not call the
# LLM provider, so it can run frequently without spending tokens.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG="${TMPDIR:-/tmp}/wsc_verify_current_dev.log"
TTS_OUT="${TMPDIR:-/tmp}/wsc_verify_current_tts.mp3"
DEBATE_OUT="${TMPDIR:-/tmp}/wsc_verify_current_debate.html"
PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
DEV_PID=""

cleanup() {
  if [[ -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pass() {
  printf '✓ %s\n' "$1"
}

step() {
  printf '\n=== %s ===\n' "$1"
}

rm -f "$LOG" "$TTS_OUT" "$DEBATE_OUT"

step "1. TypeScript"
npm run typecheck
pass "typecheck passed"

step "2. Unit tests"
npm test
pass "unit tests passed"

step "3. Dev server"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!

for _ in $(seq 1 80); do
  if grep -q "Ready in" "$LOG" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "Dev server exited early. Log:"
    cat "$LOG"
    exit 1
  fi
  sleep 0.25
done

if ! grep -q "Ready in" "$LOG" 2>/dev/null; then
  echo "Dev server did not become ready in time. Log:"
  cat "$LOG"
  exit 1
fi
pass "dev server ready at ${BASE_URL}"

step "4. /debate page loads"
HTTP_CODE="$(
  curl -sS -m 20 -o "$DEBATE_OUT" -w '%{http_code}' "${BASE_URL}/debate"
)"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "/debate returned HTTP ${HTTP_CODE}"
  exit 1
fi
if ! grep -q "WSC AI Avatar" "$DEBATE_OUT"; then
  echo "/debate HTML did not include expected app shell text"
  exit 1
fi
pass "/debate returned HTTP 200"

step "5. TTS voice smoke"
TTS_STATUS="$(
  curl -sS -m 30 -X POST "${BASE_URL}/api/tts" \
    -H "Content-Type: application/json" \
    -d '{"text":"Ready for debate!","voice":"en-US-AnaNeural"}' \
    -o "$TTS_OUT" \
    -w '%{http_code} %{size_download}'
)"
TTS_CODE="${TTS_STATUS%% *}"
TTS_SIZE="${TTS_STATUS##* }"
if [[ "$TTS_CODE" != "200" ]]; then
  echo "/api/tts returned HTTP ${TTS_CODE}"
  exit 1
fi
if [[ "$TTS_SIZE" -lt 1000 ]]; then
  echo "/api/tts returned too few bytes: ${TTS_SIZE}"
  exit 1
fi
pass "TTS en-US-AnaNeural returned ${TTS_SIZE} bytes"

step "Result"
pass "current-stage verifier passed"
echo "Dev log: ${LOG}"
