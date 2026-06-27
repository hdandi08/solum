#!/usr/bin/env bash
# Rasterize the CANONICAL approved wordmark (web/public/solum-wordmark-clean.svg)
# to a white transparent PNG for ffmpeg overlay. Re-run if the SVG changes.
# NOTE: solum-wordmark-white.png is the OLD/incorrect wordmark — do NOT use it.
set -euo pipefail
SOCIAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SOCIAL_DIR/../.." && pwd)"
SVG="$REPO/web/public/solum-wordmark-clean.svg"
OUT="$SOCIAL_DIR/assets/solum-wordmark.png"
mkdir -p "$SOCIAL_DIR/assets"
rsvg-convert -w 2000 "$SVG" -o "$OUT"
echo "wrote $OUT from $SVG"
