#!/usr/bin/env bash
# Downloads Live2D Cubism 4 Core runtime and the open-source Hiyori sample model
# into ./public/live2d/ so the web app can serve them.
#
# Cubism Core is a closed-source binary released by Live2D Inc.; we mirror their
# official CDN URL. Hiyori is a Live2D Inc. sample model, free for non-commercial use.
# Replace with your own licensed model before going to production.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/public/live2d"
CORE_DIR="$TARGET/core"
MODELS_DIR="$TARGET/models"

mkdir -p "$CORE_DIR" "$MODELS_DIR"

echo "→ Downloading Cubism 4 core runtime…"
curl -fsSL \
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" \
  -o "$CORE_DIR/live2dcubismcore.min.js"

SAMPLES_BASE="https://raw.githubusercontent.com/Live2D/CubismWebSamples/develop/Samples/Resources"

# ─── Hiyori (kawaii junior, full-body — kept as alt avatar) ────────
HIYORI_REPO="$SAMPLES_BASE/Hiyori"
HIYORI_DIR="$MODELS_DIR/Hiyori/runtime"
echo "→ Downloading Hiyori sample model…"
mkdir -p "$HIYORI_DIR/Hiyori.2048" "$HIYORI_DIR/motions"
for FILE in Hiyori.model3.json Hiyori.moc3 Hiyori.physics3.json \
            Hiyori.pose3.json Hiyori.cdi3.json Hiyori.userdata3.json; do
  echo "    $FILE"
  curl -fsSL "$HIYORI_REPO/$FILE" -o "$HIYORI_DIR/$FILE"
done
for TEX in texture_00.png texture_01.png; do
  echo "    Hiyori.2048/$TEX"
  curl -fsSL "$HIYORI_REPO/Hiyori.2048/$TEX" -o "$HIYORI_DIR/Hiyori.2048/$TEX"
done
for I in 01 02 03 04 05 06 07 08 09 10; do
  echo "    motions/Hiyori_m${I}.motion3.json"
  curl -fsSL "$HIYORI_REPO/motions/Hiyori_m${I}.motion3.json" \
    -o "$HIYORI_DIR/motions/Hiyori_m${I}.motion3.json"
done

# ─── Mao (business half-body, 8 expressions — debate default) ──────
MAO_REPO="$SAMPLES_BASE/Mao"
MAO_DIR="$MODELS_DIR/Mao/runtime"
echo "→ Downloading Mao sample model (debate default — half-body, business attire)…"
mkdir -p "$MAO_DIR/Mao.2048" "$MAO_DIR/expressions" "$MAO_DIR/motions"
for FILE in Mao.model3.json Mao.moc3 Mao.physics3.json \
            Mao.pose3.json Mao.cdi3.json; do
  echo "    $FILE"
  curl -fsSL "$MAO_REPO/$FILE" -o "$MAO_DIR/$FILE"
done
echo "    Mao.2048/texture_00.png"
curl -fsSL "$MAO_REPO/Mao.2048/texture_00.png" -o "$MAO_DIR/Mao.2048/texture_00.png"
for I in 01 02 03 04 05 06 07 08; do
  echo "    expressions/exp_${I}.exp3.json"
  curl -fsSL "$MAO_REPO/expressions/exp_${I}.exp3.json" \
    -o "$MAO_DIR/expressions/exp_${I}.exp3.json"
done
for FN in mtn_01 mtn_02 mtn_03 mtn_04 sample_01 special_01 special_02 special_03; do
  echo "    motions/${FN}.motion3.json"
  curl -fsSL "$MAO_REPO/motions/${FN}.motion3.json" \
    -o "$MAO_DIR/motions/${FN}.motion3.json"
done

# ─── Natori (male, formal, 11 expressions — top WSC senior fit) ────
NATORI_REPO="$SAMPLES_BASE/Natori"
NATORI_DIR="$MODELS_DIR/Natori/runtime"
echo "→ Downloading Natori sample model (male, formal — 11 expressions)…"
mkdir -p "$NATORI_DIR/Natori.2048" "$NATORI_DIR/exp" "$NATORI_DIR/motions"
for FILE in Natori.model3.json Natori.moc3 Natori.physics3.json \
            Natori.pose3.json Natori.cdi3.json; do
  echo "    $FILE"
  curl -fsSL "$NATORI_REPO/$FILE" -o "$NATORI_DIR/$FILE"
done
echo "    Natori.2048/texture_00.png"
curl -fsSL "$NATORI_REPO/Natori.2048/texture_00.png" -o "$NATORI_DIR/Natori.2048/texture_00.png"
for FN in Angry Blushing Normal Sad Smile Surprised exp_01 exp_02 exp_03 exp_04 exp_05; do
  echo "    exp/${FN}.exp3.json"
  curl -fsSL "$NATORI_REPO/exp/${FN}.exp3.json" -o "$NATORI_DIR/exp/${FN}.exp3.json"
done
for I in 00 01 02 03 04 05 06 07; do
  echo "    motions/mtn_${I}.motion3.json"
  curl -fsSL "$NATORI_REPO/motions/mtn_${I}.motion3.json" \
    -o "$NATORI_DIR/motions/mtn_${I}.motion3.json"
done

# ─── Haru (mature female schoolgirl, 8 expressions, 26 motions) ──────
# moc3 v1 — broad SDK compatibility. NOT Ren — Ren's moc3 is v6 which
# requires Cubism 5 SDK R5 (not yet on the public CDN).
HARU_REPO="$SAMPLES_BASE/Haru"
HARU_DIR="$MODELS_DIR/Haru/runtime"
echo "→ Downloading Haru sample model (mature female, 8 expressions)…"
mkdir -p "$HARU_DIR/Haru.2048" "$HARU_DIR/expressions" "$HARU_DIR/motions" "$HARU_DIR/sounds"
for FILE in Haru.model3.json Haru.moc3 Haru.physics3.json \
            Haru.pose3.json Haru.cdi3.json Haru.userdata3.json; do
  echo "    $FILE"
  curl -fsSL "$HARU_REPO/$FILE" -o "$HARU_DIR/$FILE"
done
for TEX in texture_00.png texture_01.png; do
  echo "    Haru.2048/$TEX"
  curl -fsSL "$HARU_REPO/Haru.2048/$TEX" -o "$HARU_DIR/Haru.2048/$TEX"
done
for I in 01 02 03 04 05 06 07 08; do
  echo "    expressions/F${I}.exp3.json"
  curl -fsSL "$HARU_REPO/expressions/F${I}.exp3.json" \
    -o "$HARU_DIR/expressions/F${I}.exp3.json"
done
# Motions referenced by Haru.model3.json, plus representative extras for future use.
for MN in haru_g_idle haru_g_m15 haru_g_m26 haru_g_m06 haru_g_m20 haru_g_m09 \
          haru_g_m01 haru_g_m04 haru_g_m10 haru_g_m16; do
  echo "    motions/${MN}.motion3.json"
  curl -fsSL "$HARU_REPO/motions/${MN}.motion3.json" \
    -o "$HARU_DIR/motions/${MN}.motion3.json"
done
for WAV in haru_talk_13 haru_Info_14 haru_normal_6 haru_Info_04; do
  echo "    sounds/${WAV}.wav"
  curl -fsSL "$HARU_REPO/sounds/${WAV}.wav" \
    -o "$HARU_DIR/sounds/${WAV}.wav"
done

echo "✓ Live2D assets installed under $TARGET"
echo "  Avatars: Mao (creative) · Natori (formal male) · Hiyori (junior peer)"
echo "  Replace with your own licensed model for production use."
