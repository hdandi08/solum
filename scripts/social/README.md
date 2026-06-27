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
