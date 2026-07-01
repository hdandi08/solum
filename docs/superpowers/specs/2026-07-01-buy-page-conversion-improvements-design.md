# /buy Page — Cold-Traffic Conversion Improvements

**Date:** 2026-07-01
**Status:** Approved (brainstorming complete)
**Scope:** `web/src/pages/BuyPage.jsx` + `web/src/data/kits.js` (minor)

---

## Problem

`/buy` is built as a 3-step checkout (Details → Delivery → Payment) that assumes the
visitor already saw the product on the marketing site. But it's also a destination we send
**cold ad traffic** directly to convert. On mobile — where almost all ad traffic lands — the
order summary is **collapsed by default and text-only** (`num + name`), while desktop gets
product tiles with hover-zoom. A cold visitor sees kit name + price and little else: no
product imagery, no "why", no returns reassurance.

## Goals

- Give a cold, mobile-first visitor enough to convert **without** turning checkout into a
  landing page.
- Bring the mobile order summary to visual parity with desktop (product imagery + zoom).
- Add a per-kit outcome hook and a legally-accurate returns line.

## Non-Goals (YAGNI / explicitly deferred)

- **Social proof / reviews** — user will add later.
- **Benefit bullets / product education** — belongs on homepage/PDP, not checkout.
- **New returns policy page** — reuse existing Terms §7 (`/terms#s7`).
- **Returns model + per-item price points** — separate business/legal workstream (user chose
  "decide later"). See Follow-ups.

## Decisions (from brainstorming)

1. Outcome hook: **one line, per kit**, shown on mobile + desktop.
2. Mobile summary: **compact** — kit hero thumbnail + outcome line + price always visible in
   the collapsed bar; product tiles (with tap-to-zoom) behind the expand toggle.
3. Returns line: compliant microcopy linking to `/terms#s7`.

---

## Design

### 1. Kit data (`web/src/data/kits.js`)
Add two fields per kit so mobile + desktop read one source (DRY):
- `outcome` — the hook line.
- `hero` — kit hero image path (already used by the Meta/TikTok catalog).

| Kit | `hero` | `outcome` (proposed — easily reworded) |
|-----|--------|----------------------------------------|
| ground | `/products/kit/ground.webp` | "Properly clean, head to toe." |
| ritual | `/products/kit/still.webp` | "Not just clean — properly fed." |

### 2. Mobile order summary (`BuyMobileHeader`)
- **Collapsed bar (always visible):** small kit **hero thumbnail** + kit name + **outcome
  line** + price. Keep the ▾/▴ toggle. (Today: name + price only.)
- **Expanded body:** ship/arrive dates → **product tiles** (image thumb + num + name) with
  **tap-to-zoom** → free-delivery + Stripe lines → **returns line**.
- **Tap-to-zoom:** mobile has no hover. Tapping a tile opens a centered enlarged preview
  (reuse `co-product-preview-fixed` styling as a fixed, centered lightbox); tap the image or
  anywhere to dismiss. Same preview asset as desktop (`p.media.still`).

### 3. Desktop order summary (`BuyOrderSummary`)
- Add the **kit hero image** at the top of the panel + the **outcome line** under the kit
  name (parity with mobile).
- Keep existing tiles + hover-zoom and the "Before You Buy" promise block.
- Add the **returns line** into the promise block.

### 4. Returns / guarantee line (both summaries)
Microcopy (matches Terms §7 exactly — no over-promise):

> ✓ 14-day returns on unopened items · faulty items fully refunded — Returns policy → (`/terms#s7`)

`/terms#s7` already covers the 14-day cooling-off right (Consumer Contracts Regs 2013), the
cosmetics hygiene exemption (Reg 28(3)), tools returns, and faulty-goods rights.

### 5. Assets (all confirmed present)
- Hero: `/products/kit/ground.webp`, `/products/kit/still.webp`.
- Tiles: existing per-product `still` / `use-1` webp (same set desktop summary uses).

---

## Testing / verification

- Mobile (≤768px): collapsed bar shows thumbnail + outcome + price; expand reveals tiles;
  tapping a tile opens + dismisses the zoom preview.
- Desktop: hero image + outcome line render; hover-zoom unchanged; returns line present.
- Returns link navigates to `/terms#s7` and lands on the Right-to-Cancel section.
- `npm run build` passes.

## Follow-ups (separate workstreams)

- **Returns model + per-item price points** — decide whole-kit-bundle vs partial returns;
  establish per-item **pro-rata** refund values (RRP ÷ total RRP × kit price — NOT standalone
  RRPs, which would over-refund). Needed for faulty/damaged single-item refunds under CRA 2015.
- **Social proof** on `/buy` once available.
