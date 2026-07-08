# Homepage Compress + Ads Pivot — Design

Date: 2026-07-08 · Approved by Harsha in session ("yes build and deploy")

## Context

External Meta+CRO review (30-day window) diagnosed: campaign optimises QualifiedVisit
(70 QV, 3 AtC, 0 purchases from £138.82) and the homepage buries kits/price ~6 folds
deep. Verified against current code: /buy friction + trust-signal points already fixed
(July 7); homepage order and kit-card density still true. Harsha's decisions today:

1. **Kill QV as the optimisation event** — pivot to AddToCart + Purchase, £50/day.
   QV stays as an analytics/audience-pool event only. (Overrides the July 7 "keep QV
   campaign" decision.)
2. **Land ad traffic on a compressed homepage** (not a dedicated LP, not /buy).
3. Hero CTA keeps "Fix My Shower Routine" copy but scrolls to `#kits` (no /buy jump).
4. Kit cards: collapse contents behind the toggle on desktop too + one-line value
   frame at the price block.
5. Campaign structure: ~£35/day cold prospecting optimised AddToCart (landing `/`) +
   ~£15/day warm retarget optimised Purchase (landing `/buy`, free-delivery offer).

## Homepage changes (web/src/pages/FullSite.jsx + components)

New order (mobile price visible ~fold 3, page ~24 → ~15 folds):

1. Nav / TrustBar / Hero / Marquee — unchanged except hero CTA → `#kits`
2. ProblemSection — desktop padding 100→64px (already has See the Kits CTA)
3. **KitComparison** (moved up from position 6)
   - contents collapsed behind the existing toggle at ALL widths (was mobile-only)
   - value line under price: `Complete {n}-piece system · tools last 6–12 months`
   - outcome-led chooser copy replaces the long taglines (approved via preview):
     GROUND — "PROPERLY CLEAN, HEAD TO TOE." + "The complete clean: daily wash,
     exfoliation, back, scalp + the weekly clay reset."
     RITUAL — "NOT JUST CLEAN. PROPERLY FED." + "Everything in GROUND + the weekly
     argan oil finish that feeds your skin. Where most men start."
     (`chooser` field added to kits.js; `outcome` was already in the data)
4. Reviews (moved below kits)
5. FrictionStrip → RitualInAction → ProductLineup → UnboxingFilm — unchanged
6. WhatSolumIs — demoted here; duplicate "shower only wets the surface" sub-intro cut
   (message survives once, in the problem payoff box)
7. FAQ — pulled up above the founder tail
8. FounderSection → FullBleedBand → CredibilityStrip → Provenance → CTASection — unchanged
9. **TruthSection deleted** (3rd repetition of dead-skin/bacteria message)
10. **All Father's Day logic removed** (Harsha, mid-build): Hero `?occasion=fathers-day`
    variant + CSS, FathersDayPopup (date-gated, dormant), FathersDayPage (never routed)

## QualifiedVisit

No retune needed: current `evaluateQualified` is milestone-based (product_detail,
ritual_50, unboxing_50, ritual_multi, offer_reached = kits in view + 20s dwell) — no
raw scroll% rule. Kits moving up makes offer_reached easier; acceptable since QV is
now analytics/pool-definition only.

## Measurement

No A/B (traffic too thin). Ship straight; compare 5 ad days before/after on: kit
`section_viewed` rate, `add_to_cart`, buy-page arrivals, purchases.

## Meta Ads changes (manual, Ads Manager — Harsha)

- New cold ad set/campaign: optimise **AddToCart**, £35/day, land `/` with
  `utm_source=fb&utm_medium=paid`, 3 proven videos, feed-biased.
- New warm ad set: optimise **Purchase**, £15/day, audiences = QV custom event pool +
  video viewers + site visitors 30d, land `/buy`, free-delivery creative.
- Turn off the QualifiedVisit-optimised ad set once the new ones are live.
- Purchase CAPI already live server-side (stripe-webhook). AddToCart/InitiateCheckout
  remain client-pixel only — CAPI relay for those is OUT OF SCOPE here (candidate
  follow-up).

## Out of scope

- Dedicated ad landing page, /buy changes, real reviews swap, PayPal flip,
  AtC/IC CAPI relay, TikTok.
