# Ritual Video Redesign — Design Spec
_Date: 2026-06-16 · Status: Design locked, implementation pending_

---

## What we're changing

Two surfaces:
1. **Homepage `RitualSection`** — replace step-flow tiles with video-led selector
2. **`RitualPage` / `RitualDailyGuide`** — replace detailed step cards with video-first layout

The weekly video is not yet ready. Weekly shows a "coming soon" state for the video; everything else (copy, products, selection) is live.

---

## CDN Setup (complete)

| | |
|---|---|
| S3 bucket | `solum-media-assets` (eu-west-2, private, OAC-only) |
| CloudFront ID | `E30M3DX095UFSH` |
| CDN domain | `d2ni3owln6t6zz.cloudfront.net` |
| Desktop video | `/video/daily/solum_daily_desktop.mp4` (1280×720, 5.6 MB) |
| Mobile video | `/video/daily/solum_daily_mobile.mp4` (720×1280, 7.6 MB) |
| Cache | `public, max-age=31536000, immutable` — use new filename on re-upload |

When weekly video is ready: transcode with same ffmpeg settings, upload to `/video/weekly/solum_weekly_desktop.mp4` and `/video/weekly/solum_weekly_mobile.mp4`.

**ffmpeg transcode command (reference):**
```bash
ffmpeg -i <input.mp4> \
  -c:v libx264 -preset slow -crf 26 -profile:v high -level 4.1 \
  -vf "scale=1280:720:flags=lanczos" \   # or 720:1280 for mobile
  -movflags +faststart \
  -c:a aac -b:a 128k \
  <output.mp4>
```

---

## Video behaviour

- **Click to play with sound** — no autoplay
- **Poster frame** shown by default (key scene selected from the video)
- Desktop gets the 16:9 cut; mobile gets the 9:16 cut via `<source media="(max-width: 768px)">`
- Duration shown on poster frame overlay

---

## Homepage RitualSection — Layout

### Desktop (≥ 768px)
Two columns: **pills left, video right**

Left column (pills, stacked):
- Daily pill (top)
- `+ once a week` divider
- Weekly pill (bottom)

Right column:
- `▶ [Ritual name]` label
- Video poster with play button
- Product image rail (5 items for daily, 4 for weekly)
- Weekly "coming soon" notice (when weekly selected)

### Mobile (< 768px)
Two pills **side by side** above the video:

- Daily | Weekly in a 2-column grid
- Arrow points **down** from the selected card half to the video below
- Video poster full width below
- Product rail below video

---

## Selection state

| Element | Selected | Unselected |
|---|---|---|
| Card border | Coloured top border (blue daily / gold weekly) | None |
| Card background | Tinted (blue or gold tint) | Dark, dimmed to 55% opacity |
| Card copy | Full copy visible | Minimal — title + time only |
| Tag | `▶ Watching` badge | None |
| Arrow (desktop) | Points right → into video panel | Hidden |
| Arrow (mobile) | Points down ↓ from selected half | Hidden |
| Video border | Glows matching colour | — |
| Video label | `● [Ritual name]` in ritual colour | — |
| Product rail | Shows products for selected ritual | — |

Daily is selected by default on load.

---

## Copy

**Section headline:** `The Ritual.`
**Eyebrow:** `The Ritual System`
**Subline:** `Daily every shower. Weekly once a week. Both matter.`

**Daily card:**
- Freq label: `Every shower`
- Title: `Daily Ritual`
- Time: `10 min · 5 products`
- Copy: _"Start here. The foundation everything builds on."_
- `▶ Watching` tag when selected

**Weekly card:**
- Freq label: `Once a week`
- Title: `Weekly Ritual`
- Time: `22 min · 4 products`
- Copy: _"Replaces daily that day. Come back once the daily habit is locked in."_

---

## Products per ritual

**Daily (blue):** 04 Scalp Massager · 01 Body Wash · 03 Back Scrub Cloth · 08 Cleansing Cloth · 07 Body Lotion

**Weekly (gold):** 05 Atlas Clay Mask · 04 Scalp Massager · 02 Italy Towel Mitt · 06 Argan Body Oil

---

## RitualPage — still to design

The homepage section redesign is locked. The dedicated `/ritual` page redesign (currently `RitualPage.jsx` + `RitualDailyGuide.jsx`) was not covered in this session. Key questions for next session:
- Does the chooser screen (`RitualChooser`) still exist, or do we go straight to a unified page?
- Do the detailed step cards remain, or does the video replace them entirely?
- What does the weekly "coming soon" state look like on the full ritual page?

---

## Files to change

| File | Change |
|---|---|
| `web/src/components/RitualSection.jsx` | Full rewrite — video selector replaces step-flow tiles |
| `web/src/pages/RitualPage.jsx` | TBD next session |
| `web/src/components/ritual/RitualDailyGuide.jsx` | TBD next session |

No new files needed for the homepage section.

---

## Constraints

- Dev branch only — do not merge to master without explicit sign-off
- Never push to prod without confirmation
- Weekly video URL will be `https://d2ni3owln6t6zz.cloudfront.net/video/weekly/solum_weekly_desktop.mp4` once ready — add as a `const` so it's easy to un-comment
