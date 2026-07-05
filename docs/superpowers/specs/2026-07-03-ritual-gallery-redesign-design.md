# Ritual in Action — Gallery Redesign + QualifiedVisit Recalibration

**Date:** 2026-07-03
**Component:** `web/src/components/RitualInAction.jsx` (+ `web/src/lib/qualifiedVisit.js`, `web/src/lib/qualifiedVisitTracker.js`)
**Mockup:** published Artifact (Gallery mode) — center-active coverflow.

## Problem

The current desktop layout is a **player + rail**: one video on the left, a 2×4 tile grid on the right that controls it. Clicking a right-side tile changes the left video — action and result are spatially separated, so users don't perceive that their click did anything ("spatial disconnect"). A full 9:16 hero is also too tall to co-fit with tiles in one viewport, which reintroduces scrolling between action and result.

PostHog day-1 ad data (2026-07-02) is a separate issue (cold traffic bounces at the hero, above this section) — this redesign is desktop UX polish, not the conversion fix. See [[project_meta_ads_launch]].

## Decision — Center-active Gallery (coverflow)

Replace the desktop player/rail with a **horizontal center-active gallery**:

- All 8 steps in one horizontal row, ordered **daily (04,01,03,08,07) → weekly (05,02,06)** so left-to-right encodes the ritual sequence.
- The **centered item is active**: enlarged (`scale(1)`), full overlay (num, freq badge, name, action), and it is the one playing. Off-center items are scaled down (~0.74) and dimmed (~0.45).
- User brings a step to center by **horizontal scroll / drag / scroll-snap**, **‹ › arrow buttons**, or **clicking a side item** (scrolls it to center).
- Height-capped (`clamp` on `vh`) so the whole section — header, gallery, CTA — fits **one screen**; all steps are visible at once (center in focus, neighbours peeking).
- Daily/weekly encoded by badge + accent colour (Steel Blue `#2E6DA4` daily, gold `#C8A96E` weekly), since grouping is now by order+colour, not spatial columns.

### Unify desktop + mobile into ONE component
This gallery **is** the existing mobile carousel pattern (scroll-snap, center-snap, centered item plays), scaled up. So collapse the two code paths (desktop player + mobile carousel) into a **single responsive gallery**:
- Mobile: item ~near-full-width (current behaviour), native swipe.
- Desktop: item ~9:16 at `clamp(300px,50vh,460px)` tall, neighbours visible (coverflow), arrows shown.
- **Risk to verify:** mobile must still behave like today (no regression). Verify on a real mobile viewport before merge.

## QualifiedVisit recalibration

Current triggers (`qualifiedVisit.js`): `product_detail` (immediate), `ritual_50` (one video ≥50%), `unboxing_50`, `scroll_dwell` (scroll≥50% AND dwell≥60s).

**Add** a new trigger:
- **`ritual_multi`** — user deliberately centers/plays **≥2 distinct ritual steps**. Threshold = **2**.

Rationale: browsing multiple steps in the gallery is genuine engagement and should qualify; also loosens the demanding `scroll_dwell` bar. Watching one film to 50% already qualifies via `ritual_50` (a full watch is subsumed).

### Implementation of `ritual_multi`
- `qualifiedVisitTracker.js`: add state `ritualSlugs = new Set()` and export `markRitualEngaged(slug)` that adds the slug and calls `evaluate()`.
- `qualifiedVisit.js`: add rule `if (ritualVideosEngaged >= 2) return 'ritual_multi';` (pass `ritualVideosEngaged: state.ritualSlugs.size`).
- The gallery calls `markRitualEngaged(slug)` on **deliberate** selection only.
- **First auto-centered item is passive** — not counted (mirror the current mobile `firstSettle` guard), so an initial page-load center doesn't inflate the count. Only user-initiated centering counts.

## Preserve (do not regress)
- `capture('ritual_selected', {product, source})` on user selection.
- `capture('ritual_video_progress', {product, percent, source})` + `markRitualProgress(pct)` at 25/50/75/100 for the active video (feeds `ritual_50`).
- `preload="none"`, only the centered video plays; others paused/poster (keep it light — same as current mobile).
- `prefers-reduced-motion` respected (no autoplay / no pulse).
- "See the full ritual →" CTA + `ritual_cta_clicked`.
- Real product posters (`posterFor(num)`) on items; real films (`videoFor(slug)`) in the centered stage.

## Out of scope
- The hero/above-the-fold conversion fix (separate, higher priority — see [[project_meta_ads_launch]]).
- Any change to the `/ritual` full page.

## Verification
- Desktop: click side item / arrows / drag → center updates and plays; only one video plays at a time.
- QV: center a 2nd distinct step → `ritual_multi` fires once (check PostHog `QualifiedVisit` reason + Meta custom event). First load does NOT fire it.
- Mobile: swipe behaves like today; centered card plays; no layout break.
- Reduced-motion: no autoplay, no pulse.
