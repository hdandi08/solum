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
- **Server-side Purchase ALREADY BUILT** (commits `2c60d72`, `ec33a68`, `0f0fb61`): the Stripe webhook
  (`stripe-webhook/index.ts`) fires Meta CAPI (`sendMetaPurchaseEvent`, pixel `690345887768095`) and
  TikTok Events API (`sendTikTokPurchaseEvent`, pixel `D8NHU2RC77UCVEHVNJNG`) on payment success, with
  SHA-256 hashed email+phone and `event_id` = PaymentIntent id — matching the client's dedup key.
- Two PostHog dashboards built via API (Overview #776102, Deep Funnel #776101), all insights
  filtered to prod hosts `^(www\.)?bysolum\.(com|co\.uk)\.?$`.
- Baseline (30d, prod): $pageview 606 → buy_page_viewed 55 → checkout_initiated 5 → purchase 3, £345.

### Gaps found (review)
1. **`purchase` undercounts in PostHog only.** Client `purchase` fires only on `SuccessPage` mount
   (`SuccessPage.jsx:93`); lost if the buyer never lands on `/success`. BUT Meta/TikTok already get a
   reliable server-side Purchase from the webhook, so **only PostHog undercounts** — the webhook does
   not feed PostHog. Fix: webhook also POSTs to the PostHog capture API (server-side) for parity.
2. **No mid-checkout events** — nothing between `buy_page_viewed` and `checkout_initiated`
   (which only fires after the payment intent is created). The 55→5 collapse is unexplained.
3. **`checkout_initiated` inconsistent across express vs standard paths** (`BuyPage.jsx:506` vs `:715`)
   — uneven `method` prop and product-name passed to Meta.
4. **`section_viewed` only covers `<section id>` blocks** — un-id'd blocks are invisible to skip analysis.
5. **No on-site video drop-off** — `ritual_video_played` fires on play only.
6. **`QualifiedVisit` not instrumented** — the multi-signal engagement event.
7. **Pixel prod-gate loose** — `hostname.includes('bysolum')` should match the stricter dashboard regex.

## 3. Decisions (locked)

- Server-side Meta CAPI + TikTok Events API for Purchase **already built & dedup'd** — v1 server work is
  (a) feed PostHog from the webhook for parity, (b) optionally boost EMQ with `_fbp`/`_fbc`/`ttp`/`ttclid`.
- **`QualifiedVisit` = multi-signal, strong-or-accumulated** (client-side only; no email to match on).
  Fires when EITHER one **strong** signal occurs (viewed a **product detail page**, OR watched a
  **ritual video to ≥50%**), OR **accumulated engagement** is reached (scroll ≥50% **AND** dwell ≥60s).
  Rationale: a product-detail browser shows obvious intent on its own; a reader who spends >1 min and
  gets past half the page is a convertible visitor. A 3-second bouncer never trips it.
- Both Meta/Instagram and TikTok are live.
- **Audiences-only + checkout email** — no waitlist, no lead magnet. Email captured at checkout.
- **Axon removed** entirely. Waitlist `Lead`/`generate_lead` deprecated.
- Every event fires to **PostHog + Meta + TikTok** (PostHog is the source of truth for analysis;
  pixels are for optimisation/audiences).

## 4. Event architecture

| Event | Trigger | PostHog | Meta | TikTok | Server-side |
|---|---|---|---|---|---|
| `QualifiedVisit` (custom) | strong signal (product-detail view OR ritual video ≥50%) OR (scroll ≥50% AND dwell ≥60s) | ✅ | ✅ custom event | ✅ custom event | client only |
| `checkout_details_submitted` (new) | step 1 (name+email) passes validation | ✅ | — | — | client |
| `checkout_delivery_submitted` (new) | step 2 (address) passes validation | ✅ | — | — | client |
| `ViewContent` | `/buy` + product pages | ✅ | ✅ | ✅ | client |
| `InitiateCheckout` / `checkout_initiated` | payment intent created | ✅ | ✅ | ✅ | client |
| `Purchase` / `purchase` | Stripe `payment_intent.succeeded` (server) + SuccessPage (client) | ✅ client (existing) **+ NEW server capture for parity** | ✅ client + **server (built)** | ✅ client + **server (built)** | **`event_id` = PaymentIntent id** |
| `ritual_video_progress` (new) | 25/50/75/100% of ritual video | ✅ | — | — | client |
| ~~`Lead` (waitlist)~~ | — | deprecated | removed | removed | — |
| ~~Axon~~ | — | removed | — | — | — |

`event_id` for Purchase = Stripe PaymentIntent id, already passed to `fbPurchase`/`ttqCompletePayment`
as the dedup key. Server-side fires the same id so Meta/TikTok dedup the client + server pair.

### QualifiedVisit implementation notes
- A small client-side tracker watches: scroll %, a dwell timer, ritual-video progress, and
  product-detail-page views within the session.
- **Strong signals** fire immediately on occurrence: product-detail view, or ritual video ≥50%.
- **Accumulated** path fires when scroll ≥50% AND dwell ≥60s are both true.
- Fire **once per session** (sessionStorage guard) when the first qualifying condition is met.
- Record the trigger reason on the event: `capture('QualifiedVisit', { reason: 'product_detail' |
  'ritual_50' | 'scroll_dwell', dwell_s, scroll_pct })` — so we can tune thresholds later from data.
- Also send Meta (`fbq('trackCustom','QualifiedVisit')`) and TikTok (`ttq.track('QualifiedVisit')`).

## 5. Server-side tracking (current state + v1 work)

**Already built** in `stripe-webhook/index.ts` (do NOT rebuild):
- `sendMetaPurchaseEvent` → Meta CAPI, hashed email+phone, `event_id` = PI id, fires on payment success.
- `sendTikTokPurchaseEvent` → TikTok Events API (`CompletePayment`), hashed email+phone, `event_id` = PI id.
- Client `fbPurchase`/`ttqCompletePayment` use the same PI id, so Meta/TikTok dedup the client+server pair.

**v1 server-side work (small):**
1. **Verify** secrets (`META_CAPI_ACCESS_TOKEN`, `TIKTOK_EVENTS_ACCESS_TOKEN`) are set and the function is
   deployed on **both dev and prod**; confirm events arrive (Meta Events Manager / TikTok Events API logs).
2. **Feed PostHog from the webhook** — add a `sendPosthogPurchase()` that POSTs to the PostHog capture API
   (`https://eu.i.posthog.com/capture/`) so PostHog `purchase` reconciles with Stripe regardless of `/success`.
   Use a deterministic `$insert_id` = PI id (PostHog dedup) so it never double-counts with the client event.
3. **(Optional EMQ boost)** capture `_fbp`/`_fbc` (Meta) and `ttp`/`ttclid` (TikTok) cookies client-side,
   pass them into the PaymentIntent metadata at creation, and include them in the server events.
- Deploy edge function to **both dev and prod** in the same session (per project rule); never touch prod DB without per-op approval.

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
