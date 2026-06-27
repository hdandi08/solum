#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
IN="$1"; OUT="$2"; CAPS="$3"; shift 3
CTA=""; WM=0
while [ $# -gt 0 ]; do case "$1" in
  --cta) CTA="$2"; shift 2;;
  --wordmark) WM=1; shift;;   # opt-in: only for footage that does NOT already show the logo
  *) echo "unknown arg: $1" >&2; exit 1;; esac; done
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

INPUTS=(-i "$IN")
FILTER=""; LAST="0:v"; IDX=1; n=0

# Timed caption overlays (rendered as PNGs; this ffmpeg lacks drawtext).
while IFS=$'\t' read -r s e t; do
  [ -z "${s:-}" ] && continue
  png="$TMP/cap_$n.png"
  python3 "$SOCIAL_DIR/textcard.py" --text "$t" --out "$png" \
    --font "$FONT_BEBAS" --size 72 --width "$W916" --color "#F0ECE2" --box >/dev/null
  INPUTS+=(-i "$png")
  FILTER="${FILTER};[${LAST}][${IDX}:v]overlay=0:(H-h)*0.80:enable='between(t,${s},${e})'[v${n}]"
  LAST="v${n}"; IDX=$((IDX+1)); n=$((n+1))
done < "$CAPS"

if [ -n "$CTA" ]; then
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
  START=$(awk -v d="$DUR" 'BEGIN{printf "%.2f", d-2.5}')
  png="$TMP/cta.png"
  python3 "$SOCIAL_DIR/textcard.py" --text "$CTA" --out "$png" \
    --font "$FONT_BARLOW" --size 58 --width "$W916" --color "#4A8FC7" >/dev/null
  INPUTS+=(-i "$png")
  FILTER="${FILTER};[${LAST}][${IDX}:v]overlay=0:(H-h)*0.90:enable='gte(t,${START})'[vc]"
  LAST="vc"; IDX=$((IDX+1))
fi

if [ "$WM" = 1 ]; then
  INPUTS+=(-i "$WORDMARK_WHITE")
  FILTER="${FILTER};[${IDX}:v]scale=300:-1[wm];[${LAST}][wm]overlay=(W-w)/2:120[out]"
  LAST="out"; IDX=$((IDX+1))
fi

FILTER="${FILTER#;}"
if [ -z "$FILTER" ]; then
  ffmpeg -y -i "$IN" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -movflags +faststart "$OUT"
else
  ffmpeg -y "${INPUTS[@]}" -filter_complex "$FILTER" \
    -map "[$LAST]" -map 0:a? -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -movflags +faststart "$OUT"
fi
echo "wrote $OUT"
