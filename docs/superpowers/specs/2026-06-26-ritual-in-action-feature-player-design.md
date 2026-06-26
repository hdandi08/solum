# Ritual-in-Action — Feature Player + Rail (Design Spec)

> Date: 2026-06-26 · Status: approved (design), pending spec review
> Replaces the home-page multi-autoplay ritual strip with a single feature player + thumbnail rail.

## 1. Problem

The home page renders `RitualInAction.jsx` (FullSite.jsx:98) — a horizontal strip of 8 vertical
(9:16) tiles, each an autoplaying `<video muted autoPlay loop>` (RitualInAction.jsx:82-90). All
film-tiles play at once: it's visually chaotic, hard to watch, and runs up to 8 simultaneous videos
(mobile perf cost). The existing IntersectionObserver only drives the mobile dots — it does not
control playback.

Secondary: watching an *autoplay* video must never count as user intent. (Today the home strip is
uninstrumented so it doesn't, but the redesign adds a user-selected play path that legitimately
should count.)

Also surfaced: `RitualSection.jsx` is dead code — defined but rendered nowhere (the visual overhaul
replaced it with `RitualInAction`). Its Task-4 `ritual_video_progress` instrumentation is therefore
inert.

## 2. Goal

One product film plays at a time. A single feature `<video>` shows one product; a rail of 8 product
thumbnails swaps it. First product auto-plays muted (ambient, not counted as intent); user selection
counts as intent.

## 3. Component

Rewrite `web/src/components/RitualInAction.jsx` in place. Keep `<section id="ritual">`, the eyebrow/
heading/sub, and the "See the full ritual →" CTA (and its `ritual_cta_clicked` event). Remove the
8-tile autoplay strip + its mobile dots + the dots IntersectionObserver.

### Layout (split)
- **Desktop (≥769px):** CSS grid `feature | rail`. Feature = portrait 9:16 `<video>` left (~360px).
  Rail right = 2-column grid of 8 product thumbnails (number + daily/weekly freq badge + name).
- **Mobile (≤768px):** stacked — feature on top, a single horizontal scroll row of 8 thumbnails below.
- Active thumbnail highlighted (border/background), mirroring the existing `.ria-freq` / active styling.

### Data
Reuse the existing `STEPS` array (8 products, canonical order: daily 04,01,03,08,07 → weekly 05,02,06)
and `videoFor(slug)` / product poster (`prod.media.gallery[0] || prod.media.still`).

## 4. Playback behaviour

- State: `activeIdx` (default 0), `userSelected` (boolean, default false).
- One `<video>` element bound to `STEPS[activeIdx]` film (`muted loop playsInline`), `key={activeIdx}`
  so swapping reloads the source.
- On scroll-into-view (IntersectionObserver on the section/feature): auto-play the active (first) film
  muted. `userSelected` stays false.
- Clicking/tapping a thumbnail: set `activeIdx`, set `userSelected = true`, play that film muted.
- **Reduced motion** (`REDUCE_MOTION`): feature renders the poster image, no autoplay; selecting a
  thumbnail swaps the still image only (no video). Preserve existing guard.
- Audio: muted throughout (short ambient model clips; no native controls).
- Only ONE `<video>` mounts at a time (was up to 8).

## 5. Tracking (honours autoplay-vs-intent)

- **Auto-played first film:** fires nothing as intent — no `ritual_video_progress`, no QualifiedVisit.
- **Thumbnail click:** `capture('ritual_selected', { product: slug, source: 'ritual_in_action' })`.
- **User-selected film progress:** an `onTimeUpdate` fires `capture('ritual_video_progress',
  { product: slug, percent, source: 'ritual_in_action' })` at 25/50/75/100 (each once per selected
  play, via a per-play Set that resets on selection) — ONLY when `userSelected` is true. At ≥50% it
  also calls `markRitualProgress(pct)` (from qualifiedVisitTracker.js) → trips
  `QualifiedVisit reason: ritual_50`.
- Keep `ritual_cta_clicked { source: 'ritual_in_action' }` on the CTA.
- Net rule: `markRitualProgress` / progress events fire only for user-selected playback, never autoplay.

## 6. Cleanup

Delete `web/src/components/RitualSection.jsx` (dead code, rendered nowhere; carries inert Task-4
instrumentation). Confirm no imports reference it before deleting.

## 7. Testing

- Unit (vitest): the QualifiedVisit decision logic is already covered. No new pure logic here.
- Manual smoke (post-deploy, browser): (a) only one video plays at a time; (b) auto-play first fires
  no `ritual_video_progress`/QualifiedVisit; (c) selecting a thumbnail fires `ritual_selected` and,
  on ≥50%, `ritual_video_progress` + `QualifiedVisit ritual_50`; (d) reduced-motion shows posters,
  no autoplay; (e) mobile rail scrolls and swaps.
- e2e: out of scope here (separate queued task to repair the suite).

## 8. Out of scope

- Unboxing play-button UX fix (separate, awaiting clarification).
- e2e test repair (separate queued task).
- Changes to the `/ritual` page (`RitualVideoSelector`) — unaffected.
