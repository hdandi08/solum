# SOLUM — Tracking & Retargeting Program (Design Spec)

> Date: 2026-06-26 · Status: approved-in-principle, pending spec review
> Goal: instrument the right events across PostHog + Meta + TikTok, fix accuracy gaps,
> and structure a leads → retarget → sales ad program that compounds engaged audiences.

---

## 1. Why

Today the ad platforms (Meta/TikTok) are effectively **blind above `/buy`**. All top-of-funnel
intent (deep scroll, ritual watched, product viewed) lives only in PostHog, so the algorithms
can't optimise on it and we can't build retargeting audiences from it. The program is entirely
short-video-creative driven, so the people worth re-reaching are *video engagers and site
explorers* — exactly the signal currently discarded. We also lose 30–50% of conversions to
iOS/Safari/ad-blockers because there is no server-side tracking.

This spec fixes the instrumentation, routes every event to **PostHog + Meta + TikTok**, adds
server-side Purchase, and defines the campaign architecture that uses it.

## 2. Current state (audited 2026-06-26)

Live, accurate-as-far-as-they-go:
- PostHog: `scroll_depth`, `section_viewed` (homepage only), `faq_opened`, `kit_cta_clicked`,
  `ritual_selected`/`ritual_video_played`/`ritual_cta_clicked`, `product_page_viewed`/
  `product_card_clicked`, `buy_page_viewed`, `checkout_initiated`, `purchase`, `soldout_detected`,
  `hero_cta_clicked`, `bottom_cta_clicked`, `ab_assigned`.
- Meta pixel (`fbq`): `Lead` (waitlist — to be deprecated), `ViewContent`/`InitiateCheckout`/`Purchase`.
- TikTok pixel (`ttq`): full commerce funnel (ViewContent→AddToCart→AddPaymentInfo→InitiateCheckout→PlaceAnOrder→CompletePayment).
- Axon (AppLovin): page_view + generate_lead — **to be removed entirely**.
- Two PostHog dashboards built via API (Overview #776102, Deep Funnel #776101), all insights
  filtered to prod hosts `^(www\.)?bysolum\.(com|co\.uk)\.?$`.
- Baseline (30d, prod): $pageview 606 → buy_page_viewed 55 → checkout_initiated 5 → purchase 3, £345.

### Gaps found (review)
1. **`purchase` is client-only and under-counts** — fires only on `SuccessPage` mount
   (`SuccessPage.jsx:93`); lost if the buyer never lands on `/success` (closed tab, redirect
   method failure). Affects PostHog *and* pixels.
2. **No mid-checkout events** — nothing between `buy_page_viewed` and `checkout_initiated`
   (which only fires after the payment intent is created). The 55→5 collapse is unexplained.
3. **`checkout_initiated` inconsistent across express vs standard paths** (`BuyPage.jsx:506` vs `:715`)
   — uneven `method` prop and product-name passed to Meta.
4. **`section_viewed` only covers `<section id>` blocks** — un-id'd blocks are invisible to skip analysis.
5. **No on-site video drop-off** — `ritual_video_played` fires on play only.
6. **`QualifiedVisit` not instrumented** — the multi-signal engagement event.
7. **Pixel prod-gate loose** — `hostname.includes('bysolum')` should match the stricter dashboard regex.

## 3. Decisions (locked)

- Server-side **Full CAPI** (Meta Conversions API) + **TikTok Events API**, with `event_id` dedup.
- **`QualifiedVisit` = multi-signal**: scrolled ≥50% **AND** (ritual video watched **OR** product
  viewed **OR** ≥60s dwell). Client-side only (browser engagement; no email to match on).
- Both Meta/Instagram and TikTok are live.
- **Audiences-only + checkout email** — no waitlist, no lead magnet. Email captured at checkout.
- **Axon removed** entirely. Waitlist `Lead`/`generate_lead` deprecated.
- Every event fires to **PostHog + Meta + TikTok** (PostHog is the source of truth for analysis;
  pixels are for optimisation/audiences).

## 4. Event architecture

| Event | Trigger | PostHog | Meta | TikTok | Server-side |
|---|---|---|---|---|---|
| `QualifiedVisit` (custom) | scroll ≥50% AND (ritual video watched OR product viewed OR ≥60s dwell) | ✅ | ✅ custom event | ✅ custom event | client only |
| `checkout_details_submitted` (new) | step 1 (name+email) passes validation | ✅ | — | — | client |
| `checkout_delivery_submitted` (new) | step 2 (address) passes validation | ✅ | — | — | client |
| `ViewContent` | `/buy` + product pages | ✅ | ✅ | ✅ | client |
| `InitiateCheckout` / `checkout_initiated` | payment intent created | ✅ | ✅ | ✅ | client |
| `Purchase` / `purchase` | Stripe `payment_intent.succeeded` (server) + SuccessPage (client) | ✅ (both) | ✅ | ✅ | **client + server, `event_id` = PaymentIntent id** |
| `ritual_video_progress` (new) | 25/50/75/100% of ritual video | ✅ | — | — | client |
| ~~`Lead` (waitlist)~~ | — | deprecated | removed | removed | — |
| ~~Axon~~ | — | removed | — | — | — |

`event_id` for Purchase = Stripe PaymentIntent id, already passed to `fbPurchase`/`ttqCompletePayment`
as the dedup key. Server-side fires the same id so Meta/TikTok dedup the client + server pair.

### QualifiedVisit implementation notes
- Compute client-side from existing signals: a small tracker that watches scroll %, a dwell timer,
  and whether a ritual video played / product viewed in the session.
- Fire **once per session** (sessionStorage guard) when the threshold is first crossed.
- Send to PostHog (`capture('QualifiedVisit', {...trigger reasons})`), Meta (`fbq('trackCustom','QualifiedVisit')`),
  TikTok (`ttq.track('QualifiedVisit')`).

## 5. Server-side tracking (CAPI + Events API)

- Host in the existing Supabase Stripe webhook function (already receives `payment_intent.succeeded`).
- On success, POST to:
  - Meta Conversions API — `Purchase` with hashed email (target EMQ ≥8.0), `event_id` = PI id, `fbp`/`fbc` if available.
  - TikTok Events API — `CompletePayment` with hashed email, `event_id` = PI id, `ttclid` if available.
- Secrets: Meta CAPI access token + pixel id; TikTok Events API access token + pixel id — into Supabase secrets.
- Deploy to **both dev and prod** in the same session (per project rule); never touch prod DB without per-op approval.
- Optional later: also send `Lead`/`InitiateCheckout` server-side. Out of scope for v1 — Purchase first (highest value).

## 6. Skip-zone instrumentation

- Add `checkout_details_submitted` + `checkout_delivery_submitted` to expose the in-form leak.
- Add `ritual_video_progress` (25/50/75/100) for video drop-off.
- Audit homepage so every meaningful block is a `<section id>` (or extend the observer to `[data-track]`).
- Keep `scroll_depth`/`section_viewed`; consider extending scroll tracking to product/ritual pages.

## 7. Campaign architecture (Meta + TikTok)

Consolidate to **3 campaigns per platform** (research: one bigger campaign learns better than many small):

1. **Cold / Leads** — Traffic or Lead-gen objective, optimise → `QualifiedVisit`. New reels weekly
   (existing champion/challenger). Exclude purchasers + existing engagers. ~20–30% of budget. Messaging L1–L2.
2. **Warm / Retarget** — audiences: watched ≥50% of a reel (on-platform engagement) + `QualifiedVisit`
   visitors (last 14d), exclude purchasers. Education / objection / ritual-demo creative. Messaging L3–L4.
3. **Hot / Convert** — audiences: `ViewContent`/`InitiateCheckout` + cart abandoners, optimise → `Purchase`.
   Offer + £10-back + social proof. Messaging L5.

Budget reality: at <£50/day, cold optimises on `QualifiedVisit` (low data requirement), NOT Purchase.
Purchase optimisation lives in the hot/retarget campaign once the pool is large enough. Healthy
retargeting frequency 3–5; refresh creative when it climbs.

## 8. PostHog dashboard updates

- Add to **Deep Funnel**: a true top-of-funnel funnel `QualifiedVisit → ViewContent → checkout_initiated → purchase`,
  and an in-checkout funnel `buy_page_viewed → checkout_details_submitted → checkout_delivery_submitted → checkout_initiated → purchase`.
- Add `ritual_video_progress` drop-off chart.
- Keep all insights filtered to the prod-host regex.

## 9. Success criteria

- Server-side Purchase live; PostHog `purchase` count reconciles with Stripe paid count (±small).
- Meta EMQ ≥8.0 on Purchase; TikTok event match quality healthy.
- `QualifiedVisit` firing on prod, populating warm audiences on both platforms.
- In-checkout funnel reveals the real 55→5 drop point.
- 3-campaign structure live on both platforms with correct exclusions.

## 10. Out of scope (v1)

- Lead magnet / quiz (decided against — audiences-only).
- Server-side Lead/InitiateCheckout (Purchase first).
- Subscription-funnel events (subscription launches ~2 months out — separate spec).
