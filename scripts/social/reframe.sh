#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
IN="$1"; OUT="$2"; shift 2
SS=(); T=()
while [ $# -gt 0 ]; do case "$1" in
  --ss) SS=(-ss "$2"); shift 2;;
  --t)  T=(-t "$2"); shift 2;;
  *) echo "unknown arg: $1" >&2; exit 1;; esac; done
mkdir -p "$(dirname "$OUT")"
ffmpeg -y "${SS[@]}" -i "$IN" "${T[@]}" \
  -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1,format=yuv420p" \
  -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -movflags +faststart "$OUT"
echo "wrote $OUT"
