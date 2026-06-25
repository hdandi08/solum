# SOLUM — Picture-First Website Overhaul

> Design spec · 2026-06-25 · branch: `dev`
> Goal: convert the site from text-driven to image/video-led, to communicate brand value visually.

## 1. Objective

Shift the site's communication load from copy to photography and film. The brand value
(craft, ritual, quality, head-to-toe care) should be felt through imagery first, with text
demoted to a supporting role. New assets:

- **148 studio + editorial photos** (`~/Downloads/solum-photo-download-1of1/Highlights`)
- **6 films** (`~/Downloads/drive-download-20260625T092428Z-3-001`): 1 banner (4K 16:9, 71s)
  + 5 vertical product films (9:16): Body Wash, Italy Towel Mitt, Atlas Clay Mask,
  Argan Oil, Body Lotion.
- **Coming later:** 1–2 more banner films, an unboxing film. No films yet for
  03 Back Scrub Cloth or 04 Scalp Massager (run on stills).

## 2. Scope

In: homepage (`FullSite`), new dedicated product pages, `/buy` product cards, `/ritual` imagery.
Out: checkout flow internals, `/account`, legal pages, email templates, admin.

Approach: a **content layer over existing components**, not a from-scratch rebuild. Keep the
section architecture, analytics (`capture`), A/B framework, and checkout intact; swap section
*content* from text-blocks to media; add product pages as the new depth layer.

## 3. Asset pipeline

### 3.1 Images — build-time, committed to `/public`

Script `scripts/build-product-images.py` (Python/PIL, already installed; re-runnable). Reads a
**curation manifest** (explicit source-file → output-name map, section 7) and writes responsive
WebP to `web/public/products/<NN>/`:

```
web/public/products/01/
  still.webp        1200px wide, q80   (~150–250KB)
  still@600.webp    600px              (mobile srcset)
  use-1.webp        1200px
  use-2.webp        1200px
  detail.webp       1200px
```

Old flat PNGs (`/products/01-body-wash.png` …) stay until every reference is migrated, then
removed in a cleanup commit.

### 3.2 Videos — transcode locally, host on CDN

Script `scripts/build-product-videos.sh` (ffmpeg, installed). For each source film:

- **Banner** (4K) → `banner-1080.mp4` (H.264, CRF 23, ~8–12MB), `banner-1080.webm` (VP9),
  `banner-poster.jpg` (frame ~2s). Optional 16:9 only.
- **Vertical product films** → `<NN>-720.mp4` (720×1280 H.264), `<NN>-720.webm`,
  `<NN>-poster.jpg`.
- All: muted, `autoplay loop playsinline`, `preload="none"`, lazy-load behind poster.

Posters are committed to `/public/products/<NN>/`; the `.mp4`/`.webm` are uploaded to the
existing CDN (same host as the `_v2` ritual films) and referenced by URL. Until a CDN URL is
set, the slot renders the poster image only (graceful placeholder for the missing 03/04 films
and future banners).

## 4. Data model (`web/src/data/products.js`)

Additive only — existing keys (`benefits`, `desc`, `highlights`, etc.) unchanged and reused.

```js
{
  // ...existing fields...
  slug: '01-body-wash',
  media: {
    still: '/products/01/still.webp',
    stillMobile: '/products/01/still@600.webp',
    gallery: ['/products/01/use-1.webp', '/products/01/use-2.webp', '/products/01/detail.webp'],
    poster: '/products/01/01-poster.jpg', // null if no film
    video: null,        // CDN URL when uploaded; null → poster/still only
  },
}
```

A small `MEDIA_BASE` constant allows pointing `video` at the CDN without editing every object.

## 5. Components & routes

### 5.1 New: `/product/:slug` → `ProductPage.jsx`
Editorial layout, mobile-first:
1. **Hero** — product vertical film autoplaying behind poster (or `still` if no film),
   product number + name + tagline overlaid.
2. **In-use editorial** — `gallery` shots interleaved with existing `benefits` bullets and
   `desc` (reused verbatim; no rewriting).
3. **Detail/spec strip** — `origin`, `size`, `lifespan`, `highlights` as visual chips.
4. **Ritual context** — which ritual step(s) this product is used in (link to `/ritual`).
5. **Kit CTA** — "In these kits" + buy link.
6. **Prev / next product** nav.
- SEO: per-page `<title>`/meta/OG via existing head mechanism; add all product URLs to
  `web/public/sitemap.xml`. Indexable, shareable.
- Route added in `App.jsx`: `<Route path="/product/:slug" element={<ProductPage />} />`.

### 5.2 Rework: `ProductLineup.jsx` (homepage)
- Cards become **photo-dominant**: full-bleed `still` (object-fit cover), number badge,
  frequency badge, name, one-line tagline. Highlights/benefits/lifespan move to product page.
- Optional hover/in-view teaser: muted vertical film loop **or** `use-1` photo, per a card
  flag so 03/04 (no film) degrade to photo cleanly.
- **Card click navigates to `/product/:slug`** — the existing detail modal is removed from
  this component. (Modal code deleted, not just hidden.)
- Optional editorial "ritual in action" strip above the grid using strongest model shots.

### 5.3 Rework: `Hero.jsx`
- Banner film as background (`autoplay muted loop playsinline`, poster fallback,
  `preload="none"`), outcome headline + CTA overlaid. Mobile: poster still or a shorter loop
  to protect data/perf. Keep existing CTA targets and analytics.

### 5.4 Unboxing moment
- Near the kit/subscription section: box flatlays (#61–70) now; swap to unboxing film slot
  when it arrives (same poster→video pattern).

### 5.5 `/buy` (`BuyPage.jsx`)
- Product card thumbnails swap flat PNG → new `still.webp`. No checkout-logic changes.

### 5.6 `/ritual` (`RitualPage.jsx` + `components/ritual`)
- Step imagery uses model-in-use shots matched to each daily/weekly step (mapping in §7).
  Existing video-selector behavior preserved.

## 6. Performance & accessibility

- Every `<img>`: explicit width/height (no layout shift), `loading="lazy"` except hero/LCP,
  `srcset` for still (600/1200), descriptive `alt`.
- Videos: `preload="none"`, poster always set, never autoplay with sound; respect
  `prefers-reduced-motion` (show poster, no autoplay).
- Target: homepage LCP unchanged or better vs current (poster-first paint).

## 7. Curation manifest (source → use)

Final selection; adjust in implementation if a better frame is spotted. Numbers = `SE-<n>.jpg`.

| # | Product | still | gallery (use-1, use-2, detail) | film |
|---|---|---|---|---|
| 01 | Body Wash | 4 | 77 (pour), 84 (hold), 8 (angle) | yes |
| 02 | Italy Towel Mitt | 56 (sachet) | 135 (on arm), 146 (skin), 43 | yes |
| 03 | Back Scrub Cloth | 59 (sachet) | 124 (over back), 128, 51 | no |
| 04 | Scalp Massager | 28 | 116 (on scalp), 119, 26 | no |
| 05 | Rhassoul Clay | 16 (jar) | 108 (on chest), 110, 22 (open jar) | yes |
| 06 | Argan Oil | 24 | 92 (dropper), 100, 25 | yes |
| 07 | Body Lotion | 30 | 31, 32 | yes |
| 09 | Mixing Bowl | 35 | 33, 36 | no |
| Kit/unboxing | — | 62, 66, 48 | (unboxing film later) |

**Ritual-step mapping** (model shots → steps): Daily — scalp #116, wash #77, mitt #135,
back cloth #124, lotion #30-context. Weekly — scalp #119, clay #108/#110, mitt+cloth #146/#128,
oil #92/#100.

## 8. Build & test plan

- Work entirely on `dev`. Build assets locally, run `cd web && npm run dev` (port 5173),
  verify every touched surface visually before any commit.
- Manual test matrix: homepage hero film + poster fallback; product card → product page nav
  for all products; product page hero film for 01/02/05/06/07 and poster-only for 03/04;
  `/buy` cards; `/ritual` steps; mobile widths; reduced-motion.
- Run existing e2e/Playwright after changes; do not commit until green locally.
- Commit to `dev`, push to prod only after sign-off (per dev workflow rules).

## 9. Out of scope / later

- Extra banner films + unboxing film: slot in by URL/poster, no code change.
- Films for 03/04: add `video` URL + poster when shot.
- Removing legacy `/products/*.png` once all references migrated.

## 10. Risks

- **Video weight on mobile** — mitigated by poster-first, `preload=none`, reduced-motion,
  smaller mobile encodes.
- **CDN upload step is manual** — document the exact filenames/URLs so the user can upload;
  code tolerates `video: null` until then.
- **148→~30 curation is subjective** — manifest is explicit and reviewable here before build.
