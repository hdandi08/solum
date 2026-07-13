# Home CTA Batch — Design

Date: 2026-07-13
Status: Approved (Harsha, from Manus CRO brief 2026-07-13 with corrections; "lets build rest")

## Background

Funnel data (ours + Manus, consistent): engaged home visitors rarely click through to /buy
(65 kits-section viewers → 8 clicks in our Fri–Sun window; Manus: 118 engaged → 10). The kit cards
already carry value maths (£99/£133 struck-through worth). Manus items adopted with corrections;
their TTFB claim (measured false: 40–160ms live) and post-product-grid placement (only 17 people
reach the grid vs 65 at kits) were rejected/moved.

## Changes (all homepage/FullSite unless stated)

### 1. StickyKitBar (new component, mobile only)
- Fixed bottom bar, 56px + safe-area inset, background #08090B, border-top 1px rgba(46,109,164,0.55),
  z-index 180 (below IAB banner 250 / overlays 400).
- Shows only on ≤768px, after scrollY > 90vh, hidden while #kits is in viewport (IntersectionObserver).
- Left: kit prices from data (`GROUND £65 · RITUAL £85` — derived from KITS, never hardcoded).
- Right: Bebas button "Get Your Kit →" → smooth-scroll to #kits.
- Events: `sticky_bar_shown` (once per pageview), `sticky_bar_cta_clicked`.
- While shown, add `body.has-kitbar` and offset the FounderChat floating button above the bar.

### 2. Kits section urgency + trust (KitComparison)
Below the kits grid, using the existing (currently unused) `.kits-footnote` style:
- "First batch · only 250 kits made. Next batch £75 and £95." (matches the /buy batch-2 price commitment)
- Trust row beneath: 🚚 Free UK delivery · ✓ 14-day returns · 🔒 Secured by Stripe (mirrors /buy trust strip).

### 3. HomeCTABand upgrade (after RitualInAction)
Replace the single backwards-scrolling "Start the ritual · from £65 → #kits" link with a conversion band:
- Keep heading "Ten minutes a day. Everything changes." and `id="ritual-cta"`.
- Value line: "£133 of product · you pay £85. Tools last 6 to 12 months." (numbers from kits.js, not hardcoded)
- Two buttons: primary "Buy RITUAL · £85" → /buy?kit=ritual; ghost "Start with GROUND · £65" → /buy?kit=ground.
  Both fire `ctaband_buy_clicked` { kit } + `trackAddToCart(kit)` (same contract as kit-card CTAs) then navigate.
- Trust row beneath buttons (same as change 2).

### 4. Hero value anchor
Below the CTA/offer chip, an always-visible line: "£133 of product · kits from £65"
(13px, Barlow Condensed, values computed from kits.js). Persists when the delivery offer chip expires.

### 5. /kit/ redirects (App.jsx)
`/kit/:kitId` route: ground/ritual → `<Navigate to="/buy?kit=…" replace />`; anything else → NotFoundPage.
Fixes soft-404s from old ad/bio links.

## Constraints
- Copy: no em/en dashes, never "soap", min 13px body / 11px labels, brand palette only.
- All prices/worths derived from `KITS`/`kitWorth()` — RITUAL worth is £133, GROUND £99; never claim "9 products".
- No behaviour changes to existing kit-card CTAs or section tracking ids.

## Rejected from Manus brief
- TTFB/hosting work (false measurement; static SPA on CloudFront, 40–160ms).
- Conversion block after product grid (moved to kits section + CTA band where traffic actually is).
