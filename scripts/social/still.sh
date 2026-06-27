#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
IN="$1"; OUT="$2"; RATIO="$3"; shift 3
case "$RATIO" in
  9x16) W=$W916; H=$H916;; 4x5) W=$W45; H=$H45;; 1x1) W=$W11; H=$H11;;
  *) echo "bad ratio: $RATIO (use 9x16|4x5|1x1)" >&2; exit 1;; esac
WM=0; HOOK=""
while [ $# -gt 0 ]; do case "$1" in
  --wordmark) WM=1; shift;;
  --hook) HOOK="$2"; shift 2;;
  *) echo "unknown arg: $1" >&2; exit 1;; esac; done
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# Text overlays are rendered as transparent PNGs (this ffmpeg lacks drawtext).
FILTER="[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[bg]"
INPUTS=(-i "$IN"); LAST="bg"; IDX=1; FS=$((W/13))

if [ -n "$HOOK" ]; then
  HOOKTXT=$(awk 'BEGIN{ORS=""} {if(NR>1)printf "\\n"; printf "%s",$0}' "$HOOK")
  python3 "$SOCIAL_DIR/textcard.py" --text "$HOOKTXT" --out "$TMP/hook.png" \
    --font "$FONT_BEBAS" --size "$FS" --width "$W" --color "#F0ECE2" --shadow >/dev/null
  INPUTS+=(-i "$TMP/hook.png")
  FILTER="${FILTER};[${LAST}][${IDX}:v]overlay=0:H*0.09[txt]"; LAST="txt"; IDX=$((IDX+1))
fi
if [ "$WM" = 1 ]; then
  INPUTS+=(-i "$WORDMARK_WHITE")
  FILTER="${FILTER};[${IDX}:v]scale=$((W/3)):-1[wm];[${LAST}][wm]overlay=(W-w)/2:H-h-$((H/22))[out]"
  LAST="out"; IDX=$((IDX+1))
fi
ffmpeg -y "${INPUTS[@]}" -filter_complex "$FILTER" -map "[$LAST]" -frames:v 1 -q:v 2 "$OUT"
echo "wrote $OUT"
