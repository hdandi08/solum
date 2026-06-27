#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
OUT="$1"; SLIDES="$2"; shift 2
MUSIC=""
while [ $# -gt 0 ]; do case "$1" in --music) MUSIC="$2"; shift 2;; *) echo "unknown arg: $1" >&2; exit 1;; esac; done
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
LIST="$TMP/list.txt"; : > "$LIST"; i=0
KB="scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,zoompan=z='min(zoom+0.0012,1.12)':d=90:s=1080x1920:fps=30"
while IFS=$'\t' read -r img cap; do
  [ -z "${img:-}" ] && continue
  clip="$TMP/clip_$i.mp4"
  if [ -n "${cap:-}" ]; then
    png="$TMP/cap_$i.png"
    python3 "$SOCIAL_DIR/textcard.py" --text "$cap" --out "$png" \
      --font "$FONT_BEBAS" --size 80 --width "$W916" --color "#F0ECE2" --box >/dev/null
    ffmpeg -nostdin -y -loop 1 -i "$img" -i "$png" -t 3 -r 30 -filter_complex \
      "[0:v]${KB}[bg];[bg][1:v]overlay=0:(H-h)*0.80,format=yuv420p[out]" \
      -map "[out]" -c:v libx264 -preset medium -crf 19 "$clip"
  else
    ffmpeg -nostdin -y -loop 1 -i "$img" -t 3 -r 30 -vf "${KB},format=yuv420p" \
      -c:v libx264 -preset medium -crf 19 "$clip"
  fi
  echo "file '$clip'" >> "$LIST"; i=$((i+1))
done < "$SLIDES"
if [ -n "$MUSIC" ]; then
  ffmpeg -y -f concat -safe 0 -i "$LIST" -i "$MUSIC" -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart "$OUT"
else
  ffmpeg -y -f concat -safe 0 -i "$LIST" -c:v copy -movflags +faststart "$OUT"
fi
echo "wrote $OUT"
