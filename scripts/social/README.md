# SOLUM creative pipeline
Local ffmpeg toolkit: shoot assets -> IG/TikTok creatives. Spec: docs/superpowers/specs/2026-06-27-conversion-led-growth-system-design.md

## Scripts
- still.sh IN OUT 9x16|4x5|1x1 [--wordmark] [--hook TEXTFILE]
- reframe.sh IN OUT [--ss S] [--t D]      # 16:9 -> 9:16 center-crop + trim
- caption_video.sh IN OUT CAPTIONS.tsv [--cta TEXT]   # captions + wordmark
- slideshow.sh OUT SLIDES.tsv [--music FILE]          # Ken Burns slideshow

## Posting board
- build-board.py  → generates artefacts/social/board.html (self-contained).
  Open with `open artefacts/social/board.html`. Preview + IG/TikTok copy-caption
  buttons + 7-day schedule + posted tracker (localStorage) + download buttons.
  Re-run after rendering a new batch to refresh it.

## Source (override via env)
SRC_PHOTOS, SRC_VIDEOS, OUT_ROOT — see config.sh.
Rendered media (mp4/jpg/png) is gitignored; commit scripts + *.captions.txt + board.html only.
