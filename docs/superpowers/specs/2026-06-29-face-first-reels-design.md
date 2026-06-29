# Face-First Reels — Design

> Created 2026-06-29. Extends the creative pipeline (`docs/superpowers/specs/2026-06-27-conversion-led-growth-system-design.md` + `docs/superpowers/plans/2026-06-27-creative-pipeline.md`).

## Problem

Batch-01 reels open on product/torso footage. Per Harsha (2026-06-29): creatives must be **face-first**, grab attention in the **first 3 seconds**, and be **inquisitive** — an open loop the viewer must keep watching to resolve. The shoot's product films (mitt, clay, body wash, banner) are all framed chin-down (torso + hands only) — they contain **no usable face footage**. The only true face material is in the photo stills (notably `SE-90`, `SE-149`, `SE-122`).

## Approach

Add a reusable opener mechanism rather than re-cutting films (impossible — no face in them). A new script **prepends a face-hook segment** onto any product film: a held portrait with a curiosity-gap question, cutting into the product footage that answers it.

This is consistent with proven ad data (personal-stake, second-person hooks: "You do [daily thing] but [invisible outcome]") while satisfying the inquisitive/face-first direction.

## Component: `scripts/social/face_hook.sh`

**Signature:** `face_hook.sh PORTRAIT QUESTION_FILE PRODUCT_FILM OUT`

- `PORTRAIT` — absolute path to a face still (e.g. `SE-90`).
- `QUESTION_FILE` — text file, the inquisitive question (1–3 short lines, plain punctuation, no em/en/double-dashes).
- `PRODUCT_FILM` — an already-captioned vertical (1080×1920) product film. (Source films are already 9:16; no reframe needed.)
- `OUT` — output mp4.

Captioning, wordmark, and CTA are applied upstream (by `caption_video.sh` in the render script) before the film is passed in. `face_hook.sh` only prepends the face hook.

**Behaviour — two segments concatenated A→B:**

- **Segment A — face hook (~2.8s):**
  - Portrait cover-fit to 1080×1920 (`scale=...:force_original_aspect_ratio=increase,crop=1080:1920`).
  - Slow push-in via `zoompan` (zoom 1.00→1.08 over the segment, fps 30).
  - Bottom scrim (semi-opaque SOLUM-Black gradient/box) for text legibility.
  - Question text: Bebas Neue, Bone `#F0ECE2`, centered, shadow; appears ~0.4s in and holds.
  - **No wordmark, no logo, no price** in Segment A (kept native/raw).
  - Silent — a generated silent stereo track (`anullsrc`) is attached so the concat audio is continuous.
- **Segment B — product film:**
  - `face_hook.sh` stays single-purpose: `PRODUCT_FILM` is an **already-captioned** vertical film (the existing `caption_video.sh` output — timed captions + wordmark top-centre + CTA in last 2.5s). Segment B is composited as-is.
- **Concat:** use the `concat` filter (not demuxer) with both video and audio, re-encoding to H.264 `-preset medium -crf 19`, `yuv420p`, AAC 128k, `+faststart`, matched 30fps + `setsar=1`.

**Verification:** `verify_dims OUT 1080x1920`; `verify_dur OUT` within expected total (~16–17s); manual QC of frame 0 (face visible, question legible).

## Today's deliverable — face-first MITT reel

- **Face:** `SE-90` (full portrait, direct eye contact).
- **Question:** `You shower every day.\nSo why doesn't your\nskin feel clean?`
- **Product segment:** existing captioned mitt film (`b01-cold-mitt_9x16.mp4`: "Korean bathhouse technique" / "Cleans. Doesn't strip.") + CTA `bysolum.co.uk`.
- **Output:** `artefacts/social/batch-01/b01-cold-mitt-facefirst_9x16.mp4`.
- **Caption:** reuse `b01-cold-mitt.captions.txt` (IG + TikTok, ≤5 hashtags).

## Board + schedule changes

- Update `artefacts/social/board.html` DATA:
  - Point the `b01-cold-mitt` card `media` at the new `-facefirst_9x16.mp4`.
  - Set it to **Day 1** (today's launch post).
  - Move `b01-cold-back` (still) to a later day.

## Out of scope (next, not today)

- Reworking the clay + banner reels with `face_hook.sh` (same tool, different portrait + question). Mechanism must be reusable so these are trivial follow-ups.
- Stills/carousel rework.

## Constraints (inherited)

Never the word "soap". Wordmark only via `web/public/solum-wordmark-white.png` composite, never re-rendered as text. Palette only (no orange/amber/yellow/green). ≤5 hashtags/post. No em/en/double-dashes in any on-screen or caption copy. Both platforms per post.
