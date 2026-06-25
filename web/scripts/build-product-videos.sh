#!/usr/bin/env bash
set -euo pipefail
SRC="$HOME/Downloads/drive-download-20260625T092428Z-3-001"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.media-build"; PUB="$ROOT/public"
mkdir -p "$OUT" "$PUB/video"

vert () { # $1 src file  $2 NN  (720x1280 H.264 + webm + committed poster)
  ffmpeg -y -i "$SRC/$1" -vf "scale=720:1280" -c:v libx264 -crf 24 -preset slow -an -movflags +faststart "$OUT/$2_720.mp4"
  ffmpeg -y -i "$SRC/$1" -vf "scale=720:1280" -c:v libvpx-vp9 -crf 34 -b:v 0 -an "$OUT/$2_720.webm"
  mkdir -p "$PUB/products/$2"
  ffmpeg -y -ss 00:00:02 -i "$SRC/$1" -frames:v 1 -vf "scale=720:1280" "$PUB/products/$2/poster.jpg"
}

# banner: 4K 16:9 -> 1080p H.264 + webm + committed poster
ffmpeg -y -i "$SRC/SOLUM - BANNER FILM.mp4" -vf "scale=1920:1080" -c:v libx264 -crf 23 -preset slow -an -movflags +faststart "$OUT/banner_1080.mp4"
ffmpeg -y -i "$SRC/SOLUM - BANNER FILM.mp4" -vf "scale=1920:1080" -c:v libvpx-vp9 -crf 32 -b:v 0 -an "$OUT/banner_1080.webm"
ffmpeg -y -ss 00:00:02 -i "$SRC/SOLUM - BANNER FILM.mp4" -frames:v 1 -vf "scale=1920:1080" "$PUB/video/banner-poster.jpg"

vert "SOLUM - BODY WASH.mp4"       01
vert "SOLUM - ITALY TOWEL MITT.mp4" 02
vert "SOLUM - ATLAS CLAY MASK.mp4"  05
vert "SOLUM - ARGON BODY OIL.mp4"   06
vert "SOLUM - BODY LOTION.mp4"      07
echo "TRANSCODE DONE — upload $OUT/*.{mp4,webm} to CDN, then flip ready flags in productMedia.js"
ls -lh "$OUT"
