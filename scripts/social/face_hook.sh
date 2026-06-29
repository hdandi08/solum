#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
PORTRAIT="$1"; QFILE="$2"; FILM="$3"; OUT="$4"
HOOK_DUR="${HOOK_DUR:-2.8}"
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
FRAMES=$(awk -v d="$HOOK_DUR" 'BEGIN{printf "%d", d*30}')

# Question text -> transparent PNG (this ffmpeg lacks drawtext; pipeline uses textcard.py).
# Join the question file's lines with literal "\n" as textcard expects.
QTEXT=$(awk 'NR>1{printf "\\n"} {printf "%s", $0}' "$QFILE")
python3 "$SOCIAL_DIR/textcard.py" --text "$QTEXT" --out "$TMP/q.png" \
  --font "$FONT_BARLOW" --size 78 --width "$W916" --color "#F0ECE2" --box --boxalpha 150 --shadow >/dev/null

# --- Segment A: face hook (portrait + push-in + question PNG, silent, no logo) ---
ffmpeg -y -loop 1 -i "$PORTRAIT" -i "$TMP/q.png" -f lavfi -t "$HOOK_DUR" -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0009,1.08)':d=${FRAMES}:s=1080x1920:fps=30,setsar=1,format=yuv420p[bg];[bg][1:v]overlay=0:H*0.30:enable='gte(t,0.4)'[v]" \
  -map "[v]" -map 2:a -t "$HOOK_DUR" -r 30 -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -ar 48000 "$TMP/segA.mp4"

# --- Segment B: normalize product film to canonical format, guarantee audio ---
if [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$FILM")" ]; then
  ffmpeg -y -i "$FILM" \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p" \
    -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -ar 48000 "$TMP/segB.mp4"
else
  ffmpeg -y -i "$FILM" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 -shortest \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p" \
    -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -ar 48000 "$TMP/segB.mp4"
fi

# --- Concat A -> B ---
ffmpeg -y -i "$TMP/segA.mp4" -i "$TMP/segB.mp4" \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -movflags +faststart "$OUT"

echo "wrote $OUT"
