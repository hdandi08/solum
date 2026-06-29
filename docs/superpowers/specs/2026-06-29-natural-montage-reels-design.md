# Natural Montage Reels — Design

> Created 2026-06-29. Refines/supersedes the ad-style single-film reel approach (`docs/superpowers/specs/2026-06-29-face-first-reels-design.md`) after the first face-first reel read too much like an ad.

## Problem

The first shipped reel (face still + one full product film + lower-third captions + CTA card) reads like an ad: static hero portrait, polished demo, "link in bio". Founder direction (2026-06-29):
- Make **compelling videos that earn organic reach** — this is the goal.
- **Hook is the priority**: the first ~1.5s must stop the scroll and force the watch.
- Natural/authentic feel: quick **2 to 3 second cuts from different clips stitched together**, real motion, minimal text.
- **Face-first is optional**, not a hard rule (the product films have no face footage anyway — faces live only in the photo stills).
- Text must never cover the subject (a bug in the first reel: an uncentered push-in let the face drift under fixed-position text).

## Approach

Move from "one film + captions" to a **sensory montage**: 4 to 6 short trimmed segments from the 6 product films, hard-cut together, real source audio, almost no on-screen text. A reusable `stitch.sh` builds any montage from a segments list. Concepts are expressed as `segments.tsv` files (committed), the heavy renders gitignored.

## Editing grammar (the recipe every natural reel follows)

- 4 to 6 segments, ~1.5 to 2.5s each. Total runtime **9 to 14s**.
- Hard cuts, no transitions. **Keep the real source audio** (skin, water, fabric) — key to the un-produced feel.
- **No CTA card. No lower-third caption track. No held static portrait.**
- Text is rare: at most ONE short hook line, only in **dead space** (the dark studio background), never over the body or a face.
- Optional tiny wordmark beat (~0.8s) at the very end only (composited PNG, never re-rendered as text).
- The message lives in the **post caption** (IG + TikTok), not burned into the video.

## The hook (first segment, ~1.5 to 2.5s)

- Lead with the most visually unusual motion as a pattern interrupt.
- **First reel hook = the back-scrub cloth sawing over a soapy shoulder** (Body Wash film, ~t=18 to 22) — strange, rhythmic, "what is that?" pulls the watch.
- Carries ONE short open-loop hook line in the dark margin (3 to 5 words), e.g. "the part your shower misses".
- Structure pays off / loops: end on a beat that resolves the hook.

## Component: `scripts/social/stitch.sh`

**Signature:** `stitch.sh OUT SEGMENTS_TSV`

- `SEGMENTS_TSV` rows: `clip<TAB>start<TAB>duration<TAB>text` (text optional; `clip` is an absolute path or a key resolved against `$SRC_VIDEOS`).
- For each row: trim `clip` from `start` for `duration`, scale/crop to 1080x1920, 30fps, `setsar=1`, `format=yuv420p`, guarantee an audio track (synthesize silence if the source segment has none).
- If `text` present: render it to a transparent PNG via `textcard.py` (this ffmpeg has no `drawtext`) using **Barlow Condensed SemiBold**, overlay in a fixed safe dead-space band (default top, `y=H*0.10`, clear of platform UI and centered subjects).
- Concatenate all segments with the `concat` filter (video + audio), re-encode H.264 `-preset medium -crf 19`, `yuv420p`, AAC 128k @ 48000, `+faststart`.
- Verification: `verify_dims OUT 1080x1920`; total duration within the sum of segment durations (±0.5s); manual on-device QC of the first 2s.

`face_hook.sh` stays as-is for any future face-led piece; `stitch.sh` is the new default for natural montages.

## First deliverable + refined concept set

Build ONE reel, QC on device, then commit the concept set. Each concept is a committed `segments.tsv` under `artefacts/social/batch-03-montage/`.

1. **"The part your shower misses"** (FIRST, build now) — back-cloth saw (hook) -> mitt drag -> lather -> a clean final beat. Hook line: "the part your shower misses".
2. **"Clean isn't the same as done"** — lather (Body Wash) -> oil press (Argan) -> neck press (Lotion). Textless except optional hook line.
3. **"The 10-minute reset"** — rhythm cut across all films (wash -> mitt -> back-cloth -> clay -> oil), faster cadence, textless.

Concepts 2 and 3 are scoped but built only after concept 1 is approved on device.

## Constraints (inherited)

Never the word "soap". Wordmark only via `web/public/solum-wordmark-white.png` composite. Palette only (no orange/amber/yellow/green). Text via `textcard.py` PNG overlay (no `drawtext`), Barlow Condensed, kept in safe dead-space zones. No em/en/double-dashes in any copy. ≤5 hashtags per post. Both platforms (IG + TikTok) per post. Rendered media gitignored; commit scripts + `segments.tsv` + `*.captions.txt` only.

## Out of scope

- New footage / reshoots (e.g. a literal "grey towel test" clip we do not have).
- Reworking the already-posted face-first mitt reel.
- UGC creator content (separate, lands ~early July, reuses the same `stitch.sh`).
