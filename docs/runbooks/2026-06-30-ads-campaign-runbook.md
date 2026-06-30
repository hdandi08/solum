# Ads Campaign Runbook — Reconciled 4-Week Launch (2026-06-30)

Budget ~£35/day. Spine: our QualifiedVisit-cold strategy. Sequencing: doc's warm-pixel-first.
Cross-cutting prerequisite: AddToCart-on-Buy-Now is live (see plan 2026-06-30-reconciled-meta-ads-plan).

## Week 1 — Signal building
- 1 Cold campaign, ~£25–30/day, broad (men 18–45, UK), Advantage+ placements, 3–5 creatives.
- Optimize: QualifiedVisit. Seed video-viewer + QualifiedVisit retargeting pools.
- Creative: personal invisible-consequence hooks, premium/proof-led.

## Week 2 — Layer conversion
- Cold stays on QualifiedVisit (~£20/day).
- Add Warm/Retarget (~£10–15/day): video-viewers 50%+ + QualifiedVisit-14d, offer-led (free delivery),
  optimize AddToCart.

## Week 3 — Purchase optimization
- Add Hot/Convert (~£10–15/day): checkout abandoners + InitiateCheckout, optimize Purchase (CAPI feeds it).
- Budget ~30/35/35 cold/warm/hot. Skip ASC (deferred).

## Week 4 — Scale what works
- ROAS >2× → +20–30% every 2–3 days. ROAS <1× after 5 days → kill. CPA rising → add creatives, not spend.
- Fresh creatives for fatigue. Skip subscription angle + lookalikes (deferred).

## Deferred triggers
- ASC: at ≥30–50 purchases. 1% Purchase LAL: at ≥50 purchasers.
- Subscription-angle creative: at Phase 3 (~2 months). Switch cold optimization
  QualifiedVisit→AddToCart→Purchase as weekly volume for the next-deeper event crosses ~50/week.

## Event reference (what fires)
- ViewContent: /buy load. AddToCart: kit button click (Meta + TikTok, deduped once/kit/session).
- InitiateCheckout: payment step. Purchase/CompletePayment: success + server CAPI (event_id = Stripe PI id).
