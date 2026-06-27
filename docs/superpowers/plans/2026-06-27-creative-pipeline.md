# SOLUM Creative Pipeline (IG + TikTok) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable local ffmpeg toolkit that turns the June 2026 shoot (148 photos + 6 videos) into ready-to-post Instagram + TikTok creatives, and produce the first batch.

**Architecture:** A small set of focused bash scripts under `scripts/social/` (each one ffmpeg operation), sharing one `config.sh` (brand constants, source/output paths, ffprobe verify helpers). Scripts take source assets from the Downloads folders and write platform-ready exports to `artefacts/social/<batch>/`. The final task uses the toolkit to render Batch 01 with per-post caption files.

**Tech Stack:** bash, ffmpeg 8.1.1, ffprobe, fontconfig; Bebas Neue + Barlow Condensed (OFL, fetched once); white wordmark PNG.

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-06-27-conversion-led-growth-system-design.md` and CLAUDE.md brand rules. Every task implicitly includes these:

- **Palette (hex):** SOLUM Black `#08090B`, Charcoal `#181C24`, Deep Blue `#1A4A78`, Steel Blue `#2E6DA4`, Sky Blue `#4A8FC7`, Bone `#F0ECE2`. Never orange/amber/yellow/green.
- **Wordmark:** composite the image `web/public/solum-wordmark-white.png` (2000×462 RGBA). NEVER re-render "SOLUM" as drawtext / Bebas text. (Hook/body text may use Bebas/Barlow — that rule is wordmark-only.)
- **Copy:** never use the word "soap". Tagline: **Your body. Done right.** Products numbered 01–08. Kits: GROUND £65 · RITUAL £85 (hero) · SOVEREIGN = coming soon, no price.
- **Hashtags:** max 5 per post.
- **Formats:** 9:16 = 1080×1920 · 4:5 = 1080×1350 · 1:1 = 1080×1080.
- **Video encode:** H.264, `-preset medium -crf 19`, `format=yuv420p`, `-movflags +faststart`.
- **Platforms:** every core asset ships for BOTH Instagram + TikTok (same video; per-platform caption file).
- **Output convention:** `artefacts/social/<batch>/<id>_<format>.{mp4,jpg}` + per-post `<id>.captions.txt`.
- **Source assets (env-overridable):** photos `$HOME/Downloads/solum-photo-download-1of1/Highlights`, videos `$HOME/Downloads/drive-download-20260625T092428Z-3-001`.

---

### Task 1: Pipeline scaffolding (config, fonts, ignore rules)

**Files:**
- Create: `scripts/social/config.sh`
- Create: `scripts/social/fonts/.gitkeep`
- Create: `scripts/social/README.md`
- Modify: `.gitignore` (append rendered-media ignore)

**Interfaces:**
- Produces (sourced by all later scripts): env vars `W916/H916/W45/H45/W11/H11`, `FONT_BEBAS`, `FONT_BARLOW`, `WORDMARK_WHITE`, `SRC_PHOTOS`, `SRC_VIDEOS`, `OUT_ROOT`; bash functions `verify_dims FILE WxH`, `verify_dur FILE MIN MAX`, `photo N` (prints absolute path to `SOCO_SOLUM_SE-N.jpg`).

- [ ] **Step 1: Create `scripts/social/config.sh`**

```bash
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
```

- [ ] **Step 2: Fetch the two OFL fonts (one-time)**

Run:
```bash
mkdir -p scripts/social/fonts && touch scripts/social/fonts/.gitkeep
curl -fsSL -o scripts/social/fonts/BebasNeue-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf
curl -fsSL -o scripts/social/fonts/BarlowCondensed-SemiBold.ttf \
  https://github.com/google/fonts/raw/main/ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf
ls -la scripts/social/fonts/*.ttf
```
Expected: both `.ttf` files present, non-zero size (~50–120KB each).

- [ ] **Step 3: Append rendered-media ignore to `.gitignore`**

Append these lines (commit scripts/fonts/captions, never the heavy renders):
```
# SOLUM creative pipeline — rendered outputs (keep scripts + captions, not media)
artefacts/social/**/*.mp4
artefacts/social/**/*.jpg
artefacts/social/**/*.png
```

- [ ] **Step 4: Write `scripts/social/README.md`**

```markdown
# SOLUM creative pipeline
Local ffmpeg toolkit: shoot assets -> IG/TikTok creatives. Spec: docs/superpowers/specs/2026-06-27-conversion-led-growth-system-design.md

## Scripts
- still.sh IN OUT 9x16|4x5|1x1 [--wordmark] [--hook TEXTFILE]
- reframe.sh IN OUT [--ss S] [--t D]      # 16:9 -> 9:16 center-crop + trim
- caption_video.sh IN OUT CAPTIONS.tsv [--cta TEXT]   # captions + wordmark
- slideshow.sh OUT SLIDES.tsv [--music FILE]          # Ken Burns slideshow

## Source (override via env)
SRC_PHOTOS, SRC_VIDEOS, OUT_ROOT — see config.sh.
Rendered media is gitignored; commit scripts + *.captions.txt only.
```

- [ ] **Step 5: Verify config sources cleanly**

Run:
```bash
bash -c 'source scripts/social/config.sh; echo "$W916x$H916 | $FONT_BEBAS | $(photo 60)"; test -f "$WORDMARK_WHITE" && echo WORDMARK_OK; test -f "$FONT_BEBAS" && echo FONT_OK'
```
Expected: prints `1080x1920 | .../BebasNeue-Regular.ttf | .../SOCO_SOLUM_SE-60.jpg`, then `WORDMARK_OK` and `FONT_OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/social/config.sh scripts/social/fonts/ scripts/social/README.md .gitignore
git commit -m "feat(social): creative pipeline scaffolding — config, fonts, ignore rules"
```

---

### Task 2: Still cropper (`still.sh`)

**Files:**
- Create: `scripts/social/still.sh`
- Test: manual ffprobe assertions (no unit framework; this is media tooling)

**Interfaces:**
- Consumes: `config.sh` (sizes, `FONT_BEBAS`, `WORDMARK_WHITE`, `verify_dims`).
- Produces: CLI `still.sh IN OUT RATIO [--wordmark] [--hook TEXTFILE]`, RATIO ∈ `9x16|4x5|1x1`. Cover-fits (scale-to-fill + center-crop), optional top hook text (Bebas, Bone) + optional bottom-center wordmark. Used for single stills AND carousel slides.

- [ ] **Step 1: Write the script**

```bash
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
FILTER="[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[bg]"
INPUTS=(-i "$IN"); LAST="bg"; FS=$((W/13))
if [ -n "$HOOK" ]; then
  FILTER="${FILTER};[${LAST}]drawtext=fontfile=${FONT_BEBAS}:textfile='${HOOK}':fontcolor=0xF0ECE2:fontsize=${FS}:x=(w-text_w)/2:y=h*0.09:line_spacing=14:shadowcolor=0x000000:shadowx=3:shadowy=3[txt]"
  LAST="txt"
fi
if [ "$WM" = 1 ]; then
  INPUTS+=(-i "$WORDMARK_WHITE")
  FILTER="${FILTER};[1:v]scale=$((W/3)):-1[wm];[${LAST}][wm]overlay=(W-w)/2:H-h-$((H/22))[out]"
  LAST="out"
fi
ffmpeg -y "${INPUTS[@]}" -filter_complex "$FILTER" -map "[$LAST]" -frames:v 1 -q:v 2 "$OUT"
echo "wrote $OUT"
```

- [ ] **Step 2: Run plain 4:5 crop and verify dims**

Run:
```bash
chmod +x scripts/social/still.sh
source scripts/social/config.sh
scripts/social/still.sh "$(photo 90)" /tmp/t_plain.jpg 4x5
verify_dims /tmp/t_plain.jpg 1080x1350
```
Expected: `OK dims /tmp/t_plain.jpg = 1080x1350`.

- [ ] **Step 3: Run with hook + wordmark, verify 9:16 dims**

Run:
```bash
printf 'YOUR BACK HAS\nNEVER BEEN CLEAN' > /tmp/hook.txt
scripts/social/still.sh "$(photo 60)" /tmp/t_hook.jpg 9x16 --wordmark --hook /tmp/hook.txt
verify_dims /tmp/t_hook.jpg 1080x1920
```
Expected: `OK dims /tmp/t_hook.jpg = 1080x1920` (file has Bone hook text top, white wordmark bottom).

- [ ] **Step 4: Commit**

```bash
git add scripts/social/still.sh
git commit -m "feat(social): still cropper — 9x16/4x5/1x1 with hook text + wordmark"
```

---

### Task 3: Video reframer (`reframe.sh`)

**Files:**
- Create: `scripts/social/reframe.sh`

**Interfaces:**
- Consumes: `config.sh`.
- Produces: CLI `reframe.sh IN OUT [--ss START] [--t DURATION]`. Center-crops any 16:9 source to 9:16 (1080×1920), optional trim. Keeps audio. Used to turn `BANNER FILM` (4K) into 6/9/15/30s vertical cutdowns.

- [ ] **Step 1: Write the script**

```bash
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
```

- [ ] **Step 2: Reframe a 9s cutdown from the banner film, verify dims + duration**

Run:
```bash
chmod +x scripts/social/reframe.sh
source scripts/social/config.sh
scripts/social/reframe.sh "$SRC_VIDEOS/SOLUM - BANNER FILM.mp4" /tmp/t_banner9.mp4 --ss 0 --t 9
verify_dims /tmp/t_banner9.mp4 1080x1920
verify_dur  /tmp/t_banner9.mp4 8.5 9.6
```
Expected: `OK dims ... = 1080x1920` and `OK dur ... ≈ 9s`.

- [ ] **Step 3: Commit**

```bash
git add scripts/social/reframe.sh
git commit -m "feat(social): video reframer — 16:9 -> 9:16 center-crop + trim"
```

---

### Task 4: Video captioner (`caption_video.sh`)

**Files:**
- Create: `scripts/social/caption_video.sh`

**Interfaces:**
- Consumes: `config.sh`.
- Produces: CLI `caption_video.sh IN OUT CAPTIONS.tsv [--cta TEXT]`. TSV rows = `start<TAB>end<TAB>text` (seconds). Burns timed lower-third captions (Bebas, Bone, on a SOLUM-Black box), overlays the wordmark top-centre, and if `--cta` given, shows it (Barlow, Sky Blue) in the last 2.5s. Keeps audio. Used on the 5 vertical product films.

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
IN="$1"; OUT="$2"; CAPS="$3"; shift 3
CTA=""
while [ $# -gt 0 ]; do case "$1" in --cta) CTA="$2"; shift 2;; *) echo "unknown arg: $1" >&2; exit 1;; esac; done
mkdir -p "$(dirname "$OUT")"
esc() { printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g; s/:/\\\\:/g; s/%/\\\\%/g"; }
DT=""
while IFS=$'\t' read -r s e t; do
  [ -z "${s:-}" ] && continue
  DT="${DT}drawtext=fontfile=${FONT_BEBAS}:text='$(esc "$t")':fontcolor=0xF0ECE2:fontsize=72:x=(w-text_w)/2:y=h*0.76:line_spacing=10:box=1:boxcolor=0x08090B@0.66:boxborderw=28:enable='between(t,${s},${e})',"
done < "$CAPS"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
CTADT=""
if [ -n "$CTA" ]; then
  START=$(awk -v d="$DUR" 'BEGIN{printf "%.2f", d-2.5}')
  CTADT="drawtext=fontfile=${FONT_BARLOW}:text='$(esc "$CTA")':fontcolor=0x4A8FC7:fontsize=58:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${START})',"
fi
ffmpeg -y -i "$IN" -i "$WORDMARK_WHITE" -filter_complex \
  "[1:v]scale=300:-1[wm];[0:v]${DT}${CTADT}null[v0];[v0][wm]overlay=(W-w)/2:120[out]" \
  -map "[out]" -map 0:a? -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -movflags +faststart "$OUT"
echo "wrote $OUT"
```

- [ ] **Step 2: Caption the Italy-Towel-Mitt film, verify it preserves dims + duration**

Run:
```bash
chmod +x scripts/social/caption_video.sh
source scripts/social/config.sh
printf '0.5\t4\tYOU ARE WASHING WRONG\n5\t9\tKOREAN BATHHOUSE TECHNIQUE\n' > /tmp/caps.tsv
scripts/social/caption_video.sh "$SRC_VIDEOS/SOLUM - ITALY TOWEL MITT.mp4" /tmp/t_mitt.mp4 /tmp/caps.tsv --cta "bysolum.co.uk"
verify_dims /tmp/t_mitt.mp4 1080x1920
verify_dur  /tmp/t_mitt.mp4 12 14
```
Expected: `OK dims ... = 1080x1920` and `OK dur ... ≈ 13s`.

- [ ] **Step 3: Commit**

```bash
git add scripts/social/caption_video.sh
git commit -m "feat(social): video captioner — timed captions + wordmark + CTA"
```

---

### Task 5: Slideshow builder (`slideshow.sh`)

**Files:**
- Create: `scripts/social/slideshow.sh`

**Interfaces:**
- Consumes: `config.sh`.
- Produces: CLI `slideshow.sh OUT SLIDES.tsv [--music FILE]`. TSV rows = `imagepath<TAB>caption`. Each slide = 3s, Ken Burns zoom, optional Bebas caption on a box; concatenated to a 9:16 video; optional music bed (`-shortest`). Used for kit-reveal + ritual slideshows.

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
OUT="$1"; SLIDES="$2"; shift 2
MUSIC=""
while [ $# -gt 0 ]; do case "$1" in --music) MUSIC="$2"; shift 2;; *) echo "unknown arg: $1" >&2; exit 1;; esac; done
mkdir -p "$(dirname "$OUT")"
esc() { printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g; s/:/\\\\:/g; s/%/\\\\%/g"; }
TMP=$(mktemp -d); LIST="$TMP/list.txt"; : > "$LIST"; i=0
while IFS=$'\t' read -r img cap; do
  [ -z "${img:-}" ] && continue
  clip="$TMP/clip_$i.mp4"; DT=""
  [ -n "${cap:-}" ] && DT=",drawtext=fontfile=${FONT_BEBAS}:text='$(esc "$cap")':fontcolor=0xF0ECE2:fontsize=80:x=(w-text_w)/2:y=h*0.80:box=1:boxcolor=0x08090B@0.66:boxborderw=28"
  ffmpeg -y -loop 1 -i "$img" -t 3 -r 30 -vf \
    "scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,zoompan=z='min(zoom+0.0012,1.12)':d=90:s=1080x1920:fps=30${DT},format=yuv420p" \
    -c:v libx264 -preset medium -crf 19 "$clip"
  echo "file '$clip'" >> "$LIST"; i=$((i+1))
done < "$SLIDES"
if [ -n "$MUSIC" ]; then
  ffmpeg -y -f concat -safe 0 -i "$LIST" -i "$MUSIC" -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart "$OUT"
else
  ffmpeg -y -f concat -safe 0 -i "$LIST" -c:v copy -movflags +faststart "$OUT"
fi
rm -rf "$TMP"; echo "wrote $OUT"
```

- [ ] **Step 2: Build a 3-slide silent slideshow, verify dims + duration (~9s)**

Run:
```bash
chmod +x scripts/social/slideshow.sh
source scripts/social/config.sh
printf '%s\tEVERYTHING YOU WERE MISSING\n%s\t\n%s\tYOUR BODY. DONE RIGHT.\n' "$(photo 50)" "$(photo 10)" "$(photo 90)" > /tmp/slides.tsv
scripts/social/slideshow.sh /tmp/t_slideshow.mp4 /tmp/slides.tsv
verify_dims /tmp/t_slideshow.mp4 1080x1920
verify_dur  /tmp/t_slideshow.mp4 8.5 9.8
```
Expected: `OK dims ... = 1080x1920` and `OK dur ... ≈ 9s`.

- [ ] **Step 3: Commit**

```bash
git add scripts/social/slideshow.sh
git commit -m "feat(social): slideshow builder — Ken Burns + captions + optional music"
```

---

### Task 6: Render Batch 01 + caption files (IG + TikTok)

**Files:**
- Create: `scripts/social/render-batch-01.sh`
- Create: `artefacts/social/batch-01/*.captions.txt` (committed; the `.mp4`/`.jpg` are gitignored renders)

**Interfaces:**
- Consumes: all four tools + `config.sh`.
- Produces: 6 conversion-led pieces for Phase 0/Week 1, each with an IG and a TikTok caption (≤5 hashtags). Funnel tags noted per piece.

Batch 01 contents (maps to spec §3 funnel):
| id | stage | piece | source | tool |
|----|-------|-------|--------|------|
| `b01-cold-mitt` | Cold L1–L3 | Reel: mitt technique | `ITALY TOWEL MITT.mp4` | caption_video |
| `b01-cold-banner9` | Cold L1 | Reel: 9s banner hook | `BANNER FILM.mp4` | reframe |
| `b01-cold-back` | Cold L1 | Still 4:5 + 9:16: "your back" | photo 60 | still |
| `b01-warm-clay` | Warm L2 | Reel: clay/origin | `ATLAS CLAY MASK.mp4` | caption_video |
| `b01-warm-3min` | Warm L4 | Carousel 4:5 (5 slides) | photos 80,40,10,07*,50 | still ×5 |
| `b01-hot-kit` | Hot L5 | Slideshow: kit reveal | photos 50,10,20,40,100,105 | slideshow |

\* photo 07 = a clean lotion/hero frame; if absent use photo 11.

- [ ] **Step 1: Write `render-batch-01.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; source "$D/config.sh"
OUT="$OUT_ROOT/batch-01"; mkdir -p "$OUT"

# --- Cold: mitt technique reel ---
printf '0.5\t4\tYOU ARE WASHING YOUR BODY WRONG\n5\t9\tKOREAN BATHHOUSE TECHNIQUE\n10\t13\tCLEANS. DOESN T STRIP.\n' > "$OUT/_mitt.tsv"
"$D/caption_video.sh" "$SRC_VIDEOS/SOLUM - ITALY TOWEL MITT.mp4" "$OUT/b01-cold-mitt_9x16.mp4" "$OUT/_mitt.tsv" --cta "bysolum.co.uk"

# --- Cold: 9s banner hook ---
"$D/reframe.sh" "$SRC_VIDEOS/SOLUM - BANNER FILM.mp4" "$OUT/b01-cold-banner9_9x16.mp4" --ss 0 --t 9

# --- Cold: "your back" still (both ratios) ---
printf 'YOUR BACK HAS\nNEVER BEEN CLEAN' > "$OUT/_back.txt"
"$D/still.sh" "$(photo 60)" "$OUT/b01-cold-back_4x5.jpg" 4x5 --wordmark
"$D/still.sh" "$(photo 60)" "$OUT/b01-cold-back_9x16.jpg" 9x16 --wordmark

# --- Warm: clay origin reel ---
printf '0.5\t4\t1,000 YEARS IN THE ATLAS MOUNTAINS\n5\t9\tPULL OUT WHAT SHOULDN T BE THERE\n10\t16\tWEEKLY RITUAL. HEAD TO TOE.\n' > "$OUT/_clay.tsv"
"$D/caption_video.sh" "$SRC_VIDEOS/SOLUM - ATLAS CLAY MASK.mp4" "$OUT/b01-warm-clay_9x16.mp4" "$OUT/_clay.tsv" --cta "bysolum.co.uk"

# --- Warm: 3-minute carousel (5 x 4:5 slides) ---
printf 'AFTER YOUR SHOWER\nYOU HAVE 3 MINUTES' > "$OUT/_c1.txt"
"$D/still.sh" "$(photo 80)" "$OUT/b01-warm-3min_s1_4x5.jpg" 4x5 --hook "$OUT/_c1.txt"
"$D/still.sh" "$(photo 40)" "$OUT/b01-warm-3min_s2_4x5.jpg" 4x5
"$D/still.sh" "$(photo 10)" "$OUT/b01-warm-3min_s3_4x5.jpg" 4x5
SRC07="$(photo 07)"; [ -f "$SRC07" ] || SRC07="$(photo 11)"
"$D/still.sh" "$SRC07" "$OUT/b01-warm-3min_s4_4x5.jpg" 4x5
"$D/still.sh" "$(photo 50)" "$OUT/b01-warm-3min_s5_4x5.jpg" 4x5 --wordmark

# --- Hot: kit reveal slideshow ---
{ printf '%s\tEVERYTHING YOU WERE MISSING\n' "$(photo 50)"
  printf '%s\t\n' "$(photo 10)"; printf '%s\t\n' "$(photo 20)"; printf '%s\t\n' "$(photo 40)"
  printf '%s\t\n' "$(photo 100)"; printf '%s\tGROUND 65  RITUAL 85\n' "$(photo 105)"; } > "$OUT/_kit.tsv"
"$D/slideshow.sh" "$OUT/b01-hot-kit_9x16.mp4" "$OUT/_kit.tsv"

rm -f "$OUT"/_*.tsv "$OUT"/_*.txt
echo "Batch 01 rendered to $OUT"
```

- [ ] **Step 2: Render the batch**

Run:
```bash
chmod +x scripts/social/render-batch-01.sh
scripts/social/render-batch-01.sh
ls -la artefacts/social/batch-01/
```
Expected: 3 mp4s, 7 jpgs present (mitt, banner9, clay, kit-slideshow; back ×2, carousel ×5).

- [ ] **Step 3: Verify every render's dimensions**

Run:
```bash
source scripts/social/config.sh
B=artefacts/social/batch-01
verify_dims $B/b01-cold-mitt_9x16.mp4 1080x1920
verify_dims $B/b01-cold-banner9_9x16.mp4 1080x1920
verify_dims $B/b01-warm-clay_9x16.mp4 1080x1920
verify_dims $B/b01-hot-kit_9x16.mp4 1080x1920
verify_dims $B/b01-cold-back_4x5.jpg 1080x1350
verify_dims $B/b01-warm-3min_s1_4x5.jpg 1080x1350
verify_dims $B/b01-warm-3min_s5_4x5.jpg 1080x1350
```
Expected: all `OK dims`.

- [ ] **Step 4: Write per-post caption files (IG + TikTok, ≤5 hashtags)**

Create `artefacts/social/batch-01/b01-cold-mitt.captions.txt`:
```
[INSTAGRAM]
A flannel doesn't exfoliate — it just moves water around. The Korean bathhouse mitt lifts the dead skin your shower leaves behind. Long circular strokes, front of body, daily. Cleans. Doesn't strip. → link in bio
#mensgrooming #skincareformen #bodycare #showerroutine #menswellness

[TIKTOK]
POV: you've been washing your body wrong your whole life. The mitt does what a flannel can't. → bysolum.co.uk
#mensgrooming #skincareformen #bodycare #showertok #menswellness
```

Create `artefacts/social/batch-01/b01-cold-banner9.captions.txt`:
```
[INSTAGRAM]
Most men shower every day and still get it wrong — because nobody ever built them a system. Head to toe. This is it. → link in bio
#mensgrooming #skincareformen #bodycare #groomingtips #menswellness

[TIKTOK]
The body care system you were never taught. → bysolum.co.uk
#mensgrooming #skincareformen #bodycare #grwm #menswellness
```

Create `artefacts/social/batch-01/b01-cold-back.captions.txt`:
```
[INSTAGRAM]
You shower every day. Your back has never once been properly cleaned — your arms can't reach it. Product 03 is the only tool that does. → link in bio
#mensgrooming #skincareformen #bodycare #backcare #menswellness

[TIKTOK]
Your back has never been clean. Here's why. → bysolum.co.uk
#mensgrooming #skincareformen #bodycare #hygienetok #menswellness
```

Create `artefacts/social/batch-01/b01-warm-clay.captions.txt`:
```
[INSTAGRAM]
Moroccan rhassoul clay has drawn impurities out of skin for 1,000 years — mined in the Atlas Mountains, mineral-rich. Once a week, head to toe, 8–10 minutes. → link in bio
#rhassoulclay #mensgrooming #naturalskincare #bodycare #skincareformen

[TIKTOK]
1,000-year-old Moroccan clay vs your skin. Weekly ritual. → bysolum.co.uk
#rhassoulclay #mensgrooming #naturalskincare #skincaretok #bodycare
```

Create `artefacts/social/batch-01/b01-warm-3min.captions.txt`:
```
[INSTAGRAM]
Skin absorbs 70% more moisture in the first 3 minutes after towelling, while it's still warm. Miss the window and it evaporates. Two pumps. Press in, don't rub. Save this. → link in bio
#mensskincare #bodycare #skincareformen #groomingtips #menswellness

[TIKTOK]
You have 3 minutes after your shower. Most men waste them. → bysolum.co.uk
#mensskincare #bodycare #skincareformen #skincaretok #grwm
```

Create `artefacts/social/batch-01/b01-hot-kit.captions.txt`:
```
[INSTAGRAM]
Not a 12-step routine. One system, ten minutes, head to toe. GROUND £65 — the foundation. RITUAL £85 — adds the weekly oil. First batch is limited. Your body. Done right. → link in bio
#mensgrooming #skincareformen #bodycare #groomingroutine #menswellness

[TIKTOK]
One kit. Everything you've been missing. GROUND £65 / RITUAL £85. → bysolum.co.uk
#mensgrooming #skincareformen #bodycare #grwm #menswellness
```

- [ ] **Step 5: Commit (scripts + captions only; renders are gitignored)**

```bash
git add scripts/social/render-batch-01.sh artefacts/social/batch-01/*.captions.txt
git commit -m "feat(social): Batch 01 renderer + IG/TikTok captions (cold/warm/hot)"
```

---

## Self-Review notes
- **Spec coverage:** §3 creative system (buckets, L1–L5, formats, both platforms, ffmpeg, output convention, ≤5 hashtags) → Tasks 1–6. UGC (§3) is a *future* source that reuses the same tools — no task needed now (tools are source-agnostic). Landing tuning (§4) and ad setup (§2) are intentionally OUT of this plan (separate plans).
- **Placeholder scan:** photo 07 fallback handled explicitly (→ photo 11). All ffmpeg commands complete.
- **Type/interface consistency:** every script sources `config.sh`; CLI signatures match the README and Task 6 usage.
