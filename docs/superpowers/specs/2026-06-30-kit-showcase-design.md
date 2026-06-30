# Kit Showcase (Inside the Kit) — Design Spec

**Date:** 2026-06-30
**Status:** Design (approved)

## Problem

Kit photos were a single cropped (`object-fit: cover`, 5:3) header on the homepage pricing cards — the portrait box photos were badly cut and products weren't clearly visible. Decision: remove the image from the pricing cards (done) and instead show the full kit clearly in a dedicated, browsable showcase using the real shoot photos.

## Solution (revised)

The image goes back **inside each kit card** in `KitComparison`, as a full-bleed header above the kit name — but uncropped and browsable. (An earlier iteration used a separate `KitShowcase` section; that felt disconnected from the kit it described, so it was removed and the gallery moved into the card.)

### Layout
- Section heading (e.g. "Inside the kit").
- Two panels — **GROUND** and **RITUAL** — side-by-side on desktop (2-col grid), stacked on mobile. Each panel has a kit-name label and a gallery.

### Gallery (per kit)
- Horizontal **scroll-snap** strip (native CSS; swipe on mobile, scroll/drag on desktop).
- Each slide is a **fixed-ratio box (4:3)** with the image `object-fit: contain` on the brand-black background (`--black` #08090B). Photos already have black backgrounds, so the full kit shows seamlessly regardless of orientation (the photos mix portrait and landscape).
- **Dot indicators** below the strip when there is more than one image; hidden for single-image kits.
- First slide = the full-kit flatlay, so the whole kit is clear on first glance.

### Data
Add a `gallery` array per kit in `web/src/data/kits.js`, fallback to `[image]` when absent:
- `ground.gallery = ['/products/kit/ground.webp']`
- `ritual.gallery = ['/products/kit/still.webp', '/products/kit/use-1.webp', '/products/kit/use-2.webp']`
- `sovereign`: no gallery (hidden kit; not rendered).

All four referenced images already exist and are verified real shoot photos showing all products.

## Components / files
- Create: `web/src/components/KitShowcase.jsx` (self-contained: inline CSS block like sibling components, renders the two panels + galleries from `KITS`).
- Modify: `web/src/data/kits.js` — add `gallery` arrays.
- Modify: `web/src/pages/FullSite.jsx` — import + render `<KitShowcase />` above `<KitComparison />`.

## Already done (this work, pricing-card cleanup)
- `KitComparison`: removed the `kit-image`/placeholder block, removed the `one-time` price label, removed dead `.kit-image*` CSS.

## Out of scope
- Lightbox/zoom (inline gallery already shows full images).
- New photography (uses existing assets; GROUND has one image until more are shot).
- `/buy` page (showcase is homepage only).

## Success criteria
- Homepage shows an "Inside the kit" section above pricing with GROUND + RITUAL galleries.
- Every photo renders fully (no crop), centered on black, across orientations.
- RITUAL gallery scrolls/swipes through 3 images with dot indicators; GROUND shows 1 with no dots.
- Pricing cards have no image and no "one-time" label. Build + unit tests pass.
