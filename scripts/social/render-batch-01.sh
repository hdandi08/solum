#!/usr/bin/env bash
set -euo pipefail
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; source "$D/config.sh"
OUT="$OUT_ROOT/batch-01"; mkdir -p "$OUT"

# --- Cold: mitt technique reel ---
printf "0.5\t4\tYOU ARE WASHING YOUR BODY WRONG\n5\t9\tKOREAN BATHHOUSE TECHNIQUE\n10\t13\tCLEANS. DOESN'T STRIP.\n" > "$OUT/_mitt.tsv"
"$D/caption_video.sh" "$SRC_VIDEOS/SOLUM - ITALY TOWEL MITT.mp4" "$OUT/b01-cold-mitt_9x16.mp4" "$OUT/_mitt.tsv" --cta "bysolum.co.uk"

# --- Cold: FACE-FIRST mitt (face hook -> captioned mitt film) ---
printf "You shower every day.\nSo why doesn't your\nskin feel clean?" > "$OUT/_qmitt.txt"
"$D/face_hook.sh" "$(photo 90)" "$OUT/_qmitt.txt" "$OUT/b01-cold-mitt_9x16.mp4" "$OUT/b01-cold-mitt-facefirst_9x16.mp4"

# --- Cold: 9s banner hook ---
"$D/reframe.sh" "$SRC_VIDEOS/SOLUM - BANNER FILM.mp4" "$OUT/b01-cold-banner9_9x16.mp4" --ss 0 --t 9

# --- Cold: "your back" still (both ratios) — pack already shows SOLUM, no overlay ---
"$D/still.sh" "$(photo 60)" "$OUT/b01-cold-back_4x5.jpg" 4x5
"$D/still.sh" "$(photo 60)" "$OUT/b01-cold-back_9x16.jpg" 9x16

# --- Warm: clay origin reel ---
printf "0.5\t4\t1,000 YEARS IN THE ATLAS MOUNTAINS\n5\t9\tPULL OUT WHAT SHOULDN'T BE THERE\n10\t16\tWEEKLY RITUAL. HEAD TO TOE.\n" > "$OUT/_clay.tsv"
"$D/caption_video.sh" "$SRC_VIDEOS/SOLUM - ATLAS CLAY MASK.mp4" "$OUT/b01-warm-clay_9x16.mp4" "$OUT/_clay.tsv" --cta "bysolum.co.uk"

# --- Warm: 3-minute carousel (5 x 4:5 slides) ---
printf 'AFTER YOUR SHOWER\nYOU HAVE 3 MINUTES' > "$OUT/_c1.txt"
"$D/still.sh" "$(photo 80)" "$OUT/b01-warm-3min_s1_4x5.jpg" 4x5 --hook "$OUT/_c1.txt"
"$D/still.sh" "$(photo 40)" "$OUT/b01-warm-3min_s2_4x5.jpg" 4x5
"$D/still.sh" "$(photo 10)" "$OUT/b01-warm-3min_s3_4x5.jpg" 4x5
SRC07="$(photo 07)"; [ -f "$SRC07" ] || SRC07="$(photo 11)"
"$D/still.sh" "$SRC07" "$OUT/b01-warm-3min_s4_4x5.jpg" 4x5
"$D/still.sh" "$(photo 50)" "$OUT/b01-warm-3min_s5_4x5.jpg" 4x5

# --- Hot: kit reveal slideshow ---
{ printf '%s\tEVERYTHING YOU WERE MISSING\n' "$(photo 50)"
  printf '%s\t\n' "$(photo 10)"; printf '%s\t\n' "$(photo 20)"; printf '%s\t\n' "$(photo 40)"
  printf '%s\t\n' "$(photo 100)"; printf '%s\tGROUND 65  RITUAL 85\n' "$(photo 105)"; } > "$OUT/_kit.tsv"
"$D/slideshow.sh" "$OUT/b01-hot-kit_9x16.mp4" "$OUT/_kit.tsv"

rm -f "$OUT"/_*.tsv "$OUT"/_*.txt
echo "Batch 01 rendered to $OUT"
