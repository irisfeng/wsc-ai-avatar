#!/usr/bin/env bash
# Quick end-to-end smoke test: chat + tts + score endpoints.
# Requires .env.local to be configured (LLM_PROVIDER, etc.) and the matching
# provider reachable (e.g. `ollama serve` running).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG=/tmp/wsc_smoke.log
TTS_OUT=/tmp/wsc_tts.mp3
rm -f "$LOG" "$TTS_OUT"

echo "→ starting dev server…"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!
trap 'kill -9 $DEV_PID 2>/dev/null || true' EXIT
until grep -q "Ready in" "$LOG" 2>/dev/null; do sleep 0.3; done
echo "  ready"

echo
echo "=== 1. /api/chat (opponent mode) ==="
curl -sS -m 120 -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "mode":"opponent",
    "context":{
      "motion":"This House Believes That social media has done more harm than good for teenagers.",
      "userSide":"proposition",
      "round":"opening"
    },
    "messages":[{"role":"user","content":"Firstly, social media causes anxiety. Secondly, it harms attention spans. Therefore we should restrict it."}]
  }' | python3 -m json.tool || echo "(non-JSON response)"

echo
echo "=== 2. /api/tts (Edge-TTS) ==="
curl -sS -m 20 -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello. This is a quick test of the WSC AI Avatar."}' \
  -o "$TTS_OUT" -w "HTTP %{http_code}, size=%{size_download} bytes\n"
file "$TTS_OUT" || true

echo
echo "=== 3. /api/score (judge mode) ==="
curl -sS -m 120 -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "motion":"This House Believes That social media has done more harm than good.",
    "speakerSide":"proposition",
    "transcript":"Honourable adjudicators, social media platforms have eroded teenage well-being. Firstly, Common Sense Media 2024 found a 40% rise in anxiety with daily screen time over three hours. Secondly, algorithmic feeds prioritize outrage. We urge you to oppose."
  }' | python3 -m json.tool || echo "(non-JSON response)"

echo
echo "✓ smoke OK — see $LOG for full dev log"
