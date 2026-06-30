# Reconciled Meta/TikTok Ads Plan — Design Spec

**Date:** 2026-06-30
**Status:** Design (not yet implemented)
**Supersedes nothing** — extends [`2026-06-27-conversion-led-growth-system`](2026-06-27-conversion-led-growth-system-design.md) and [`2026-06-26-tracking-retargeting-program`](2026-06-26-tracking-retargeting-program-design.md).

## Context

A Meta-internal LLM produced a generic "4-Week Meta Ads Launch Strategy" for a men's bodycare brand (SOLUM). It is a sound zero-to-sales ramp but written for assumptions SOLUM does not meet: ~£100/day budget and ≥50 purchasers for lookalikes. SOLUM's reality: **~£35/day** (£20–50 band), **near-zero purchase history**, **one-time only** (subscription does not launch until Phase 3, ~2 months out), **direct-to-checkout** flow (no cart; `/buy` is the checkout page on real Stripe).

This spec reconciles the two into **one plan**: our budget-matched spine, the doc's good tactics folded in, the doc's premium-budget machinery deferred behind explicit triggers.

## Decisions (locked with user, 2026-06-30)

- **Outcome:** reconcile into one plan.
- **Budget:** ~£35/day for the next 4 weeks.
- **Sequencing:** use the doc's warm-the-pixel-first sequencing as the timeline.
- **Cold optimization event:** keep our custom `QualifiedVisit` (NOT the doc's `AddToCart`/Purchase) — at £35/day only `QualifiedVisit` is frequent enough to exit learning. Purchase optimization needs ~50 events/week ≈ £1,400/week at our CAC; impossible at ~£245/week.

## Event taxonomy

### Current state (verified in code)

Client helpers in `web/src/lib/analytics.js`; Purchase CAPI in `supabase/functions/stripe-webhook/index.ts`.

| Funnel stage | Action | Meta (`fbq`) | TikTok (`ttq`) | Server CAPI |
|---|---|---|---|---|
| Product view | Land on `/buy` | `ViewContent` | `ViewContent` | — |
| **Add to cart** | **Click Buy Now (checkout begins)** | **MISSING** | only fires on `/buy` kit-card reselect (`BuyPage.jsx:876`), not on Buy Now | — |
| Begin checkout | Reach payment step | `InitiateCheckout` | `InitiateCheckout` + `AddPaymentInfo` | — |
| Place order | Pay click | — | `PlaceAnOrder` | — |
| Purchase | Payment confirmed | `Purchase` (`SuccessPage`) | `CompletePayment` (`SuccessPage`) | Meta `Purchase` + TikTok `CompletePayment`, `event_id` = Stripe PaymentIntent id, deduped |

Custom event on both pixels + PostHog: `QualifiedVisit` (`lib/qualifiedVisitTracker.js`) — fires once/session on a strong signal (PDP view OR ritual video ≥50%) OR (scroll ≥50% AND dwell ≥60s).

Homepage GROUND/RITUAL buy buttons currently fire **PostHog goals only** (`kit_cta_clicked` / `hero_cta_clicked` / `bottom_cta_clicked` via `trackGoal`/`capture`, which are PostHog-only — `hooks/useVariant.js:58`), then `navigate('/buy?kit=…')`. No pixel event.

### Required change — add `AddToCart` on Buy Now

Fire a standard `AddToCart` on **both** Meta and TikTok at the **Buy Now / homepage GROUND/RITUAL click** (the action that commits to a kit and enters the checkout flow). Include `content_id` = kit id, `content_name`, `value`, `currency: 'GBP'`, `content_type: 'product'`.

**Why here and not InitiateCheckout:** `InitiateCheckout` means "reached the payment step" (`analytics.js:54`). The homepage/Buy-Now click only navigates to `/buy` with nothing entered; most such clicks bounce. Firing IC there would (1) destroy the event's intent meaning, (2) poison any IC-based optimization toward clickers not buyers, (3) double-count against the real IC at the payment step and break funnel drop-off math, (4) violate the standard definition (a Buy-Now/product click is `AddToCart`). The standard event for that click is `AddToCart`.

**Why fire it even though we don't optimize on it at £35/day:** it (a) builds a high-intent retargeting pool from day 1, and (b) becomes the optimization target the moment weekly volume can sustain it.

TikTok's existing kit-card-select `AddToCart` (`BuyPage.jsx:876`) is mistimed relative to this mapping; resolve during implementation (move to the Buy Now click, or keep as a softer secondary — implementation plan to decide, default: fire ATC on Buy Now for both pixels and drop/retain the reselect one without double-firing per session).

## 4-week sequenced plan (~£35/day)

**Cross-cutting (do first):** ship the `AddToCart`-on-Buy-Now fix so signal collects from week 1.

**Week 1 — Signal building** (doc "warm the pixel"). One **Cold** campaign, ~£25–30/day, broad (men 18–45, UK), Advantage+ placements, 3–5 creatives. Optimize **`QualifiedVisit`** (reconciliation: replaces the doc's Traffic/LPV objective with our cheaper smarter event). Seed video-viewer + QualifiedVisit retargeting pools. Creative = our proven hook formula (personal, invisible consequence) rendered premium/proof-led per locked creative direction.

**Week 2 — Layer conversion** (doc ATC focus, adapted). Cold stays on `QualifiedVisit` (~£20/day). Add **Warm/Retarget** (~£10–15/day): video-viewers 50%+ + QualifiedVisit-14d, offer-led creative (free delivery), optimize **`AddToCart`** — viable on a warm pool even though not on cold at £35/day.

**Week 3 — Purchase optimization** (doc switch). Add **Hot/Convert** (~£10–15/day): retarget checkout abandoners + `InitiateCheckout`, optimize **Purchase** (CAPI feeds it reliably). Budget shifts to ~30/35/35 cold/warm/hot. **Skip ASC** (deferred — see triggers).

**Week 4 — Scale what works.** Adopt the doc's scaling rules verbatim: creative ROAS >2× → +20–30% every 2–3 days; ROAS <1× after 5 days → kill; CPA rising → add creatives, don't just raise spend; ASC outperforming manual → consolidate (only once ASC is live). Fresh creatives for fatigue. **Skip** subscription-angle creative and 1% lookalikes (deferred).

## Deferred triggers (when the doc's premium machinery turns on)

| Doc tactic | Turn on when |
|---|---|
| Advantage+ Shopping (ASC) | ≥30–50 purchases of pixel data exist |
| 1% Purchase Lookalike | ≥50 purchasers seeded |
| Subscription-angle creative | Phase 3 subscription launch (~2 months out) |
| Switch cold optimization `QualifiedVisit` → `AddToCart` → `Purchase` | weekly event volume for the next-deeper event sustainably crosses ~50/week |

## In scope vs out of scope

**In scope for the implementation plan that follows:**
- The `AddToCart`-on-Buy-Now code change (Meta + TikTok), including resolving the TikTok kit-card-select duplication.
- A campaign-setup runbook reflecting the 4-week sequence, budgets, audiences, and optimization events.

**Out of scope (already covered elsewhere or deferred):**
- Landing-tuning of `/` (FullSite) — owned by the 2026-06-27 growth-system spec §4.
- PostHog purchase-parity deploy — owned by the 2026-06-26 tracking program (Task 8).
- Creative production pipeline — owned by the creative-pipeline plan.
- ASC catalog/feed setup — deferred until the ASC trigger fires.

## Validation / success criteria

- `AddToCart` appears in Meta Events Manager and TikTok Events on Buy-Now clicks, deduped one-per-intent, distinct from `InitiateCheckout`.
- Funnel drop-off `ViewContent → AddToCart → InitiateCheckout → Purchase` is monotonic and interpretable in PostHog + both ad platforms.
- Cold campaign exits learning on `QualifiedVisit` within week 1 at ~£35/day.
- No regression: `InitiateCheckout` still fires only at the payment step; Purchase CAPI dedup intact.
