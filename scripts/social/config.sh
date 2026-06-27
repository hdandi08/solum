#!/usr/bin/env bash
# Shared config + helpers for the SOLUM creative pipeline. Source this.
set -euo pipefail
SOCIAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SOCIAL_DIR/../.." && pwd)"

# Canvas sizes
W916=1080; H916=1920; W45=1080; H45=1350; W11=1080; H11=1080

# Brand assets
FONT_BEBAS="$SOCIAL_DIR/fonts/BebasNeue-Regular.ttf"
FONT_BARLOW="$SOCIAL_DIR/fonts/BarlowCondensed-SemiBold.ttf"
WORDMARK_WHITE="$REPO/web/public/solum-wordmark-white.png"

# Source media (override by exporting before calling)
SRC_PHOTOS="${SRC_PHOTOS:-$HOME/Downloads/solum-photo-download-1of1/Highlights}"
SRC_VIDEOS="${SRC_VIDEOS:-$HOME/Downloads/drive-download-20260625T092428Z-3-001}"
OUT_ROOT="${OUT_ROOT:-$REPO/artefacts/social}"

photo() { printf '%s/SOCO_SOLUM_SE-%s.jpg' "$SRC_PHOTOS" "$1"; }

verify_dims() {
  local f="$1" want="$2" got
  got=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$f")
  if [ "$got" = "$want" ]; then echo "OK dims  $f = $got"; else echo "FAIL dims $f: got $got want $want" >&2; return 1; fi
}
verify_dur() {
  local f="$1" min="$2" max="$3" d
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  if awk -v d="$d" -v a="$min" -v b="$max" 'BEGIN{exit !(d>=a && d<=b)}'; then echo "OK dur   $f = ${d}s"; else echo "FAIL dur  $f: ${d}s not in [$min,$max]" >&2; return 1; fi
}
