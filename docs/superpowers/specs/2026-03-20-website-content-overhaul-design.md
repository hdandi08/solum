# SOLUM Website Content Overhaul — Design Spec

> **Spec:** 1 of 5
> **Scope:** ComingSoon.jsx and FullSite.jsx — product alignment, kit naming, pricing, subscription messaging, ritual copy correction
> **Reference:** `docs/superpowers/specs/2026-03-20-solum-platform-master-decisions.md`
> **File to modify:** `web/src/pages/ComingSoon.jsx`

---

## Goal

Update the coming soon website to reflect all decisions made on 2026-03-20: new kit names (GROUND · RITUAL · SOVEREIGN), updated product lineup (01–10), correct pricing, clear subscription model explanation with replenishment cadence, corrected ritual copy (viscose mitt weekend-only), and SOVEREIGN shown as Coming Soon.

---

## Changes Required

### 1. Kit Names + Pricing Section (new section)

Add a prominent kit comparison section showing all three tiers. This is the most important addition — the site currently has no pricing or kit comparison.

**GROUND — £55**
- First box: 8 products, everything to start the ritual
- Monthly sub: £38/mo
- Includes: Body Wash · Italy Towel Mitt · Back Scrub Cloth · Scalp Massager · Atlas Clay · Lotion · Bamboo Cloth
- Does not include: Argan Oil

**RITUAL — £85** *(recommended — most popular)*
- First box: 8 products including Argan Oil
- Monthly sub: £48/mo
- Everything in GROUND + Argan Body Oil
- Hero badge: "Most Popular"

**SOVEREIGN — £130** *(Coming Soon)*
- Not orderable at launch
- Replaces Italy Towel Mitt with hand-woven Turkish Kese Mitt
- Adds Beidi Black Soap
- Full 10-product system
- Display as "Coming Soon" with a badge — no buy button

**Kit comparison UI:**
- Three-column card layout on desktop, stacked on mobile
- RITUAL has a highlight border (steel blue) and "Most Popular" badge
- SOVEREIGN card is visually distinct — dimmed slightly, "Coming Soon" overlay badge, no CTA button
- Each card shows: kit name, price, monthly sub price, product list, CTA button (or Coming Soon badge)

---

### 2. Product Lineup Update

Update the `PRODUCTS` constant to reflect the full 10-product lineup:

```js
const PRODUCTS = [
  { num: '01', name: 'Body Wash' },
  { num: '02', name: 'Italy Towel Mitt' },
  { num: '03', name: 'Back Scrub Cloth' },
  { num: '04', name: 'Scalp Massager' },
  { num: '05', name: 'Atlas Clay Mask' },
  { num: '06', name: 'Argan Body Oil' },
  { num: '07', name: 'Body Lotion' },
  { num: '08', name: 'Bamboo Cloth' },
  { num: '09', name: 'Turkish Kese Mitt', comingSoon: true },
  { num: '10', name: 'Beidi Black Soap', comingSoon: true },
];
```

Products 09 and 10 render with a "Coming Soon" visual treatment in the pills — dimmed opacity, small "SOON" label.

---

### 3. Ritual Copy Correction

**Daily Ritual header:** Change time to "10 Minutes · Every Shower"
**Step 3 — Italy Towel Mitt:** Remove from daily ritual entirely.
**Weekly Ritual:** Keep Italy Towel Mitt. Add note: "Weekend use only — not daily. Viscose rayon is too aggressive for daily use."

Updated Daily Ritual steps (5 steps, products 01 03 04 07 08):
1. Scalp Massage · Product 04 — "Small firm circles, hairline to back. 2–3 minutes."
2. Body Wash · Product 01 — "Amino acid formula. No sulphates. Cleans without stripping."
3. Back Scrub Cloth · Product 03 — "Both handles, drape over shoulder, saw back and forth. The only way to reach your back."
4. Bamboo Cloth · Product 08 — "For sensitive areas. Nothing left uncleaned."
5. Body Lotion · Product 07 — "Within 3 minutes of towelling. Skin absorbs 70% more moisture."

Updated Weekly Ritual steps (5 steps, products 02 04 05 06 08):
1. Deep Scalp Massage · Product 04 — "5 minutes, more pressure than daily."
2. Atlas Clay Mask · Product 05 — "Apply head to toe on damp skin. Leave 8–10 minutes."
3. Italy Towel Mitt · Product 02 — "Weekend use only. Firm slow strokes. Dead skin rolls off."
4. Bamboo Cloth · Product 08 — "For sensitive areas."
5. Argan Body Oil · Product 06 — "Stay damp. 10–15 drops pressed in. No lotion needed today."

---

### 4. Subscription Section Overhaul

Replace the current vague subscription section with a concrete explanation of what ships and when.

**Section headline:** "Your system on autopilot."

**Three-part replenishment story:**

**Every month:**
Body Wash · Body Lotion · Bamboo Cloth
→ "The daily essentials. Always there when you need them."

**Every 3 months:**
Italy Towel Mitt · Back Scrub Cloth · Atlas Clay · Argan Oil (RITUAL+)
→ "The tools and weekly ritual products. Refreshed before they degrade."

**Every 6 months:**
Scalp Massager
→ "Silicone nubs wear down. A fresh one ships automatically."

Show the pricing clearly:
- GROUND: £38/mo (billed monthly)
- RITUAL: £48/mo (billed monthly)

Add a note: "First box is a one-time purchase. Subscription starts with your second delivery. Cancel any time."

---

### 5. Marquee Update

Update marquee items to reflect new kit names and 10-product lineup:

```js
const MARQUEE_ITEMS = [
  'The Ritual Men Were Never Taught',
  'Ground · Ritual · Sovereign',
  '10 Minutes Daily · 18 Minutes Weekly',
  '10 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
  'UK · Korea · Morocco · Turkey',
  'Formulated for Men. Built to Last.',
];
```

---

### 6. Provenance Section

No structural changes needed. Minor copy update: the provenance section should reference Products 02 · 03 · 04 (Korea) without claiming manufacture in Korea — "Korean bathhouse tradition" framing stays as-is. This is already compliant.

Add Product 08 (Bamboo Cloth) — no specific origin section needed, can sit within the UK or general products.

---

### 7. Stats Section

Stats stay as-is — Week 1, Week 2, Week 3, Day 66 progression is strong and doesn't need changing.

---

### 8. CTA / Email Capture

No changes to Mailchimp integration. Update the offer text:

Current: "Sign up now → get 20% off your first kit at launch"
Updated: "Sign up now → get 20% off your first box at launch · GROUND from £44 · RITUAL from £68"

This makes the discount concrete and anchors the pricing.

---

## Visual / Style Rules

- All new sections follow existing CSS patterns in ComingSoon.jsx (inline `<style>` block)
- Colour palette: --black #08090B, --steel-blue #2E6DA4, --sky-blue #4A8FC7, --bone #F0ECE2
- Fonts: Bebas Neue (headings), Barlow Condensed (body)
- SOVEREIGN card: use `opacity: 0.6` on the card content with a Coming Soon badge overlay
- "Most Popular" badge on RITUAL: steel blue background, bone text, Barlow Condensed 700
- Mobile breakpoint: 768px — all grid sections collapse to single column

---

## File Output

| File | Change |
|---|---|
| `web/src/pages/ComingSoon.jsx` | Primary file — all changes |
| `web/src/pages/FullSite.jsx` | Update product constants and kit names to match |
| `CLAUDE.md` | Update product lineup section — Product 08 is Bamboo Cloth, add 09 + 10 |

---

## What This Spec Does NOT Cover

- Checkout flow (Spec 3)
- Actual subscription management (Spec 4)
- Payment integration (Spec 3)
- Backend / database (Spec 2)
- Discount code redemption UI (Spec 5)
- Account / portal pages (Spec 4)
