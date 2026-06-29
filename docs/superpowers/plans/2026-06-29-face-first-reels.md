# Face-First Reels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `face_hook.sh` that prepends a face-led, inquisitive ~2.8s opener onto a captioned product film, and use it to ship a face-first MITT reel as today's launch post.

**Architecture:** A single new bash/ffmpeg script (`scripts/social/face_hook.sh`) builds a 2.8s face-hook segment (portrait + slow push-in + curiosity-gap question, no logo/price), normalizes the already-captioned product film to a matching canonical format, and concatenates the two with the `concat` filter. `render-batch-01.sh` chains it onto the existing captioned mitt film. The posting board is updated so the face-first mitt becomes today's Day-1 post.

**Tech Stack:** bash, ffmpeg/ffprobe (8.x), fontconfig; Bebas Neue (OFL, already fetched at `scripts/social/fonts/`); white wordmark PNG; existing `scripts/social/config.sh` helpers.

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-06-29-face-first-reels-design.md` and CLAUDE.md. Every task implicitly includes these:

- **Canvas:** 9:16 = 1080×1920. Video encode: H.264 `-preset medium -crf 19`, `format=yuv420p`, `setsar=1`, 30fps, AAC 128k @ 48000, `-movflags +faststart`.
- **Palette (hex):** SOLUM Black `#08090B`, Bone `#F0ECE2`. Never orange/amber/yellow/green.
- **Wordmark:** only ever the composite image `web/public/solum-wordmark-white.png`. NEVER re-render "SOLUM" as drawtext. (The face-hook segment carries NO wordmark/logo/price by design.)
- **Copy:** never the word "soap". No em-dashes (—), en-dashes (–), or double hyphens (--) in any on-screen or caption text. Use plain periods/commas.
- **Hashtags:** max 5 per post. Both platforms (IG + TikTok) per post.
- **Source assets (env-overridable, see `config.sh`):** photos `$SRC_PHOTOS` (`SOCO_SOLUM_SE-N.jpg`), output root `$OUT_ROOT` (`artefacts/social`). Fonts: `$FONT_BEBAS`.

---

### Task 1: `face_hook.sh` tool

**Files:**
- Create: `scripts/social/face_hook.sh`
- Test: manual ffprobe assertions + frame-0 visual QC (no unit framework; this is media tooling, matching the rest of `scripts/social/`).

**Interfaces:**
- Consumes: `config.sh` (`FONT_BEBAS`, `verify_dims`, `verify_dur`, sizes); a portrait jpg; an already-captioned vertical product film.
- Produces: CLI `face_hook.sh PORTRAIT QUESTION_FILE FILM OUT`. Prepends a 2.8s face hook (env override `HOOK_DUR`) onto `FILM`, writes 1080×1920 H.264 mp4 to `OUT`. Captioning/wordmark/CTA are NOT done here (done upstream by `caption_video.sh`).

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
PORTRAIT="$1"; QFILE="$2"; FILM="$3"; OUT="$4"
HOOK_DUR="${HOOK_DUR:-2.8}"
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d)
FRAMES=$(awk -v d="$HOOK_DUR" 'BEGIN{printf "%d", d*30}')

# --- Segment A: face hook (portrait + push-in + question, silent, no logo) ---
ffmpeg -y -loop 1 -i "$PORTRAIT" -f lavfi -t "$HOOK_DUR" -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0009,1.08)':d=${FRAMES}:s=1080x1920:fps=30,drawbox=x=0:y=ih*0.58:w=iw:h=ih*0.42:color=0x08090B@0.5:t=fill,drawtext=fontfile=${FONT_BEBAS}:textfile='${QFILE}':fontcolor=0xF0ECE2:fontsize=86:x=(w-text_w)/2:y=h*0.64:line_spacing=16:shadowcolor=0x000000:shadowx=3:shadowy=3:enable='gte(t,0.4)',setsar=1,format=yuv420p[v]" \
  -map "[v]" -map 1:a -t "$HOOK_DUR" -r 30 -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 128k -ar 48000 "$TMP/segA.mp4"

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

rm -rf "$TMP"
echo "wrote $OUT"
```

- [ ] **Step 2: Make executable and run a test render against the existing mitt film**

Run:
```bash
chmod +x scripts/social/face_hook.sh
source scripts/social/config.sh
printf "You shower every day.\nSo why doesn't your\nskin feel clean?" > /tmp/q_mitt.txt
scripts/social/face_hook.sh "$(photo 90)" /tmp/q_mitt.txt \
  artefacts/social/batch-01/b01-cold-mitt_9x16.mp4 /tmp/t_facefirst.mp4
```
Expected: ends with `wrote /tmp/t_facefirst.mp4`, no ffmpeg errors.

- [ ] **Step 3: Verify dimensions and total duration**

Run:
```bash
source scripts/social/config.sh
verify_dims /tmp/t_facefirst.mp4 1080x1920
verify_dur  /tmp/t_facefirst.mp4 16.0 17.5
```
Expected: `OK dims /tmp/t_facefirst.mp4 = 1080x1920` and `OK dur ... ≈ 16.8s` (2.8s hook + 13.97s mitt).

- [ ] **Step 4: Visual QC — extract a hook frame and confirm face + legible question**

Run:
```bash
ffmpeg -loglevel error -y -ss 1.5 -i /tmp/t_facefirst.mp4 -frames:v 1 -vf scale=320:-1 /tmp/qc_hook.jpg
echo "open /tmp/qc_hook.jpg and confirm: model face visible, question readable over scrim, no logo/price"
```
Expected: the frame shows the SE-90 portrait with the three-line question burned in over a dark scrim, no wordmark. (If text overflows the frame width, reduce `fontsize=86` to `78` in the script and re-run Steps 2–4.)

- [ ] **Step 5: Commit**

```bash
git add scripts/social/face_hook.sh
git commit -m "feat(social): face_hook.sh — prepend face-led inquisitive opener onto product film

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Render the face-first MITT reel via `render-batch-01.sh`

**Files:**
- Modify: `scripts/social/render-batch-01.sh` (append a face-first mitt block after the existing mitt render)
- Create (gitignored render): `artefacts/social/batch-01/b01-cold-mitt-facefirst_9x16.mp4`

**Interfaces:**
- Consumes: `face_hook.sh` (Task 1), the captioned `b01-cold-mitt_9x16.mp4` produced earlier in the same script.
- Produces: `b01-cold-mitt-facefirst_9x16.mp4` in `$OUT_ROOT/batch-01`.

- [ ] **Step 1: Read the current mitt block to anchor the insertion point**

Run:
```bash
grep -n "b01-cold-mitt" scripts/social/render-batch-01.sh
```
Expected: shows the line that writes `b01-cold-mitt_9x16.mp4` (the `caption_video.sh` call).

- [ ] **Step 2: Append the face-first mitt block immediately after the existing mitt `caption_video.sh` line**

Insert these lines right after the `"$D/caption_video.sh" ... "$OUT/b01-cold-mitt_9x16.mp4" ...` line:

```bash
# --- Cold: FACE-FIRST mitt (face hook -> captioned mitt film) ---
printf "You shower every day.\nSo why doesn't your\nskin feel clean?" > "$OUT/_qmitt.txt"
"$D/face_hook.sh" "$(photo 90)" "$OUT/_qmitt.txt" "$OUT/b01-cold-mitt_9x16.mp4" "$OUT/b01-cold-mitt-facefirst_9x16.mp4"
```

Note: the script's final `rm -f "$OUT"/_*.tsv "$OUT"/_*.txt` already cleans up `_qmitt.txt`.

- [ ] **Step 3: Re-render the batch (idempotent) and confirm the new file exists**

Run:
```bash
scripts/social/render-batch-01.sh
ls -la artefacts/social/batch-01/b01-cold-mitt-facefirst_9x16.mp4
```
Expected: the face-first mitt mp4 is present, non-zero size.

- [ ] **Step 4: Verify dimensions and duration**

Run:
```bash
source scripts/social/config.sh
verify_dims artefacts/social/batch-01/b01-cold-mitt-facefirst_9x16.mp4 1080x1920
verify_dur  artefacts/social/batch-01/b01-cold-mitt-facefirst_9x16.mp4 16.0 17.5
```
Expected: both `OK`.

- [ ] **Step 5: Commit (script only; renders are gitignored)**

```bash
git add scripts/social/render-batch-01.sh
git commit -m "feat(social): render face-first mitt reel in batch-01

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Promote the face-first mitt to today's Day-1 launch post on the board

**Files:**
- Modify: `artefacts/social/board.html` (the inline `const DATA = {...}` object)

**Interfaces:**
- Consumes: the rendered `b01-cold-mitt-facefirst_9x16.mp4` (Task 2).
- Produces: an updated posting board where the mitt card is Day 1 and points to the face-first file; the "back" still moves to a later day.

- [ ] **Step 1: Point the mitt card at the face-first render**

In `artefacts/social/board.html`, in the `b01-cold-mitt` post object, change its `"media"` array from:
```
"media": ["batch-01/b01-cold-mitt_9x16.mp4"]
```
to:
```
"media": ["batch-01/b01-cold-mitt-facefirst_9x16.mp4"]
```

- [ ] **Step 2: Swap the Day numbers so the mitt is Day 1 and the back still moves later**

In the same `DATA.posts` array:
- In the `b01-cold-mitt` object change `"day": 2` to `"day": 1`.
- In the `b01-cold-back` object change `"day": 1` to `"day": 2`.

(The board renders `DATA.posts` sorted by `day`, so this reorders the feed: mitt first, back second. Other days unchanged.)

- [ ] **Step 3: Update the mitt card title to reflect the face-first hook**

In the `b01-cold-mitt` object change:
```
"title": "Mitt technique — you're washing wrong"
```
to:
```
"title": "Face-first: why your skin never feels clean"
```
(Removes the `—` em-dash, aligns with the new hook.)

- [ ] **Step 4: Verify the board parses and shows the change**

Run:
```bash
python3 -c "import json,re; s=open('artefacts/social/board.html').read(); m=re.search(r'const DATA = (\{.*\});', s); d=json.loads(m.group(1)); p={x['id']:x for x in d['posts']}; print('mitt day', p['b01-cold-mitt']['day'], '->', p['b01-cold-mitt']['media']); print('back day', p['b01-cold-back']['day']); print('day1 =', sorted(d['posts'], key=lambda x:x['day'])[0]['id'])"
```
Expected:
```
mitt day 1 -> ['batch-01/b01-cold-mitt-facefirst_9x16.mp4']
back day 2
day1 = b01-cold-mitt
```

- [ ] **Step 5: Open the board to eyeball it (optional but recommended)**

Run:
```bash
open artefacts/social/board.html
```
Expected: first card is the face-first mitt (Day 1 / Mon), its caption is the existing mitt IG/TikTok copy; the "back" still is now second.

- [ ] **Step 6: Commit**

```bash
git add artefacts/social/board.html
git commit -m "feat(social): face-first mitt is the Day-1 launch post on the board

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review notes

- **Spec coverage:** `face_hook.sh` mechanism + segments A/B/concat → Task 1. Today's MITT deliverable (SE-90, the question, output filename) → Task 2. Board + schedule change (mitt→facefirst, Day 1; back→later) → Task 3. Out-of-scope clay/banner reworks correctly excluded (they reuse `face_hook.sh` with a different portrait + question file — trivial follow-ups, no new tasks now). Captions reused as-is per spec.
- **Placeholder scan:** none — all ffmpeg commands, file edits, and verify commands are complete and concrete. The one conditional ("if text overflows, drop fontsize to 78") is an explicit, bounded QC fallback, not a placeholder.
- **Type/interface consistency:** `face_hook.sh PORTRAIT QUESTION_FILE FILM OUT` is defined in Task 1 and called with exactly those 4 positional args in Task 2. `photo N`, `verify_dims`, `verify_dur` come from the existing `config.sh`. Output filename `b01-cold-mitt-facefirst_9x16.mp4` is identical across Tasks 2 and 3.
