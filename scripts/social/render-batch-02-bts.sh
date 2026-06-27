#!/usr/bin/env bash
# BTS / founder Stories (9:16). Source = ~/Downloads/BTS (override via BTS_DIR).
# BTS footage is un-branded, so the canonical wordmark IS overlaid here (--wordmark).
set -euo pipefail
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; source "$D/config.sh"
BTS_DIR="${BTS_DIR:-$HOME/Downloads/BTS}"
OUT="$OUT_ROOT/batch-02-bts"; mkdir -p "$OUT"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

IMG_SHOOT="$BTS_DIR/WhatsApp Image 2026-06-25 at 08.13.41.jpeg"
IMG_WORK="$BTS_DIR/WhatsApp Image 2026-06-25 at 08.13.42.jpeg"
IMG_FACE="$BTS_DIR/WhatsApp Image 2026-06-25 at 08.13.42 (3).jpeg"
IMG_CREW="$BTS_DIR/WhatsApp Image 2026-06-25 at 08.13.41 (1).jpeg"
VID_WH="$BTS_DIR/WhatsApp Video 2026-06-27 at 09.47.44.mp4"

# --- Story stills (9:16, hook top + wordmark bottom) ---
printf 'SHOOT DAY' > "$TMP/h1.txt"
"$D/still.sh" "$IMG_SHOOT" "$OUT/b02-bts-shootday_9x16.jpg" 9x16 --hook "$TMP/h1.txt" --wordmark
printf 'BEHIND\nTHE SCENES' > "$TMP/h2.txt"
"$D/still.sh" "$IMG_WORK" "$OUT/b02-bts-behind_9x16.jpg" 9x16 --hook "$TMP/h2.txt" --wordmark
# Portrait — let it breathe, wordmark only
"$D/still.sh" "$IMG_FACE" "$OUT/b02-bts-face_9x16.jpg" 9x16 --wordmark
printf 'COMING SOON' > "$TMP/h4.txt"
"$D/still.sh" "$IMG_CREW" "$OUT/b02-bts-comingsoon_9x16.jpg" 9x16 --hook "$TMP/h4.txt" --wordmark

# --- Warehouse video Story (upscale 576x1024 -> 1080x1920, trim ~15s, caption + wordmark) ---
"$D/reframe.sh" "$VID_WH" "$TMP/wh_scaled.mp4" --ss 1 --t 15
printf "1\t14\tTHE FIRST BATCH HAS LANDED\n" > "$TMP/wh.tsv"
"$D/caption_video.sh" "$TMP/wh_scaled.mp4" "$OUT/b02-bts-warehouse_9x16.mp4" "$TMP/wh.tsv" --wordmark --cta "bysolum.co.uk"

echo "BTS Stories rendered to $OUT"
