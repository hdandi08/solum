#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
OUT="$1"; SEG="$2"
TEXT_Y="${TEXT_Y:-0.10}"   # overlay band (fraction of height); override per concept if it covers a subject
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
LIST="$TMP/list.txt"; : > "$LIST"

has_audio(){ [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1")" ]; }
VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p"

i=0
while IFS=$'\t' read -r clip start dur text; do
  [ -z "${clip:-}" ] && continue
  case "$clip" in \#*) continue;; esac          # allow # comment rows
  [ -f "$clip" ] || clip="$SRC_VIDEOS/$clip"
  seg="$TMP/seg_$i.mp4"
  IN=(-ss "$start" -i "$clip"); idx=1; fc="[0:v]${VF}[v]"
  if [ -n "${text:-}" ]; then
    png="$TMP/t_$i.png"
    python3 "$SOCIAL_DIR/textcard.py" --text "$text" --out "$png" \
      --font "$FONT_BARLOW" --size 72 --width "$W916" --color "#F0ECE2" --box --boxalpha 150 --shadow >/dev/null
    IN+=(-i "$png"); fc="[0:v]${VF}[bg];[bg][${idx}:v]overlay=0:H*${TEXT_Y}[v]"; idx=$((idx+1))
  fi
  if has_audio "$clip"; then amap="0:a"
  else IN+=(-f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000"); amap="${idx}:a"; fi
  ffmpeg -nostdin -y "${IN[@]}" -t "$dur" -filter_complex "$fc" -map "[v]" -map "$amap" \
    -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -ar 48000 "$seg"
  echo "file '$seg'" >> "$LIST"
  i=$((i+1))
done < "$SEG"

ffmpeg -y -f concat -safe 0 -i "$LIST" \
  -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -movflags +faststart "$OUT"
echo "wrote $OUT ($i segments)"
