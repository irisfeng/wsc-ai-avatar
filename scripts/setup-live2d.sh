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

REPO="https://raw.githubusercontent.com/Live2D/CubismWebSamples/develop/Samples/Resources/Hiyori"
HIYORI_DIR="$MODELS_DIR/Hiyori/runtime"

echo "→ Downloading Hiyori sample model from Live2D SDK samples repo…"
mkdir -p "$HIYORI_DIR" "$HIYORI_DIR/Hiyori.2048" "$HIYORI_DIR/motions"

ROOT_FILES=(
  "Hiyori.model3.json"
  "Hiyori.moc3"
  "Hiyori.physics3.json"
  "Hiyori.pose3.json"
  "Hiyori.cdi3.json"
  "Hiyori.userdata3.json"
)
for FILE in "${ROOT_FILES[@]}"; do
  echo "    $FILE"
  curl -fsSL "$REPO/$FILE" -o "$HIYORI_DIR/$FILE"
done

for TEX in texture_00.png texture_01.png; do
  echo "    Hiyori.2048/$TEX"
  curl -fsSL "$REPO/Hiyori.2048/$TEX" -o "$HIYORI_DIR/Hiyori.2048/$TEX"
done

for I in 01 02 03 04 05 06 07 08 09 10; do
  echo "    motions/Hiyori_m${I}.motion3.json"
  curl -fsSL "$REPO/motions/Hiyori_m${I}.motion3.json" \
    -o "$HIYORI_DIR/motions/Hiyori_m${I}.motion3.json"
done

echo "✓ Live2D assets installed under $TARGET"
echo "  Replace Hiyori with your own licensed model for production use."
