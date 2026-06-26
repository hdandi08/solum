# SOLUM — Meta + TikTok Ads Campaign Runbook

> Created: 2026-06-26 · Applies to: Meta Ads Manager + TikTok Ads Manager
> Owner: Harsha Dandi · Platform: bysolum.co.uk

---

## Overview

This runbook defines the 3-campaign structure on both Meta and TikTok: Cold/Leads → Warm/Retarget → Hot/Convert. The architecture uses `QualifiedVisit` — a custom multi-signal engagement event — as the top-of-funnel optimisation signal, then retargets engaged visitors, and converts high-intent abandoners.

**Core principle:** At <£50/day total, cold campaigns must optimise on `QualifiedVisit`, not `Purchase`. The Purchase pool is too small for the algorithm to learn from. Purchase optimisation is reserved for the Hot/Convert campaign once a real audience exists.

**Budget split (total daily budget):**
| Campaign | Share |
|---|---|
| Cold / Leads | 20–30% |
| Warm / Retarget | 30–40% |
| Hot / Convert | 30–40% |

---

## Events Reference

These are the events now instrumented. Both platforms receive every event relevant to them:

| Event | Trigger | PostHog | Meta | TikTok | Server-side |
|---|---|---|---|---|---|
| `QualifiedVisit` | Product detail viewed, OR ritual video ≥50%, OR scroll ≥50% + dwell ≥60s (once/session) | ✅ | ✅ `trackCustom` | ✅ `track` | Client only |
| `ViewContent` | `/buy` + product pages | ✅ | ✅ | ✅ | Client |
| `InitiateCheckout` | Payment intent created | ✅ | ✅ | ✅ | Client |
| `Purchase` | Stripe `payment_intent.succeeded` (server) + SuccessPage (client) | ✅ | ✅ (client + CAPI) | ✅ (client + Events API) | Dedup key = PaymentIntent id |
| `checkout_details_submitted` | Step 1 (name/email) validated | ✅ | — | — | PostHog only |
| `checkout_delivery_submitted` | Step 2 (address) validated | ✅ | — | — | PostHog only |
| `ritual_video_progress` | 25/50/75/100% of ritual video | ✅ | — | — | PostHog only |

Mid-funnel events (`checkout_details_submitted`, `checkout_delivery_submitted`, `ritual_video_progress`, `scroll_depth`, `section_viewed`) are PostHog-only — they are for internal analysis, not ad platform optimisation.

---

## Messaging Ladder

Apply the messaging layer to creative based on campaign temperature:

| Layer | Label | Use in |
|---|---|---|
| L1 | Wrong — "you're doing it wrong" | Cold creative |
| L2 | Why — the mechanism / education | Cold creative |
| L3 | Fix — the system / how SOLUM solves it | Warm creative |
| L4 | Proof — ritual demo / objection handling | Warm creative |
| L5 | Identity — offer, social proof, belonging | Hot creative |

---

---

# PART 1 — META ADS MANAGER

---

## Step 1 — Create Custom Audiences (Meta)

Navigate to: **Ads Manager → Audiences → Create Audience → Custom Audience**

Create these four audiences before building any campaigns:

### A. QualifiedVisit — Last 14 Days
- Source: **Website**
- Event: `QualifiedVisit` (custom event — must appear in your pixel's event list)
- Lookback: **14 days**
- Name: `SOLUM | QV | 14d`

### B. QualifiedVisit — Last 30 Days
- Source: **Website**
- Event: `QualifiedVisit`
- Lookback: **30 days**
- Name: `SOLUM | QV | 30d`

### C. Video Viewers ≥50% (On-Platform)
- Source: **Video** (Instagram/Facebook engagement)
- Rule: People who watched **at least 50%** of any of your video posts/reels
- Lookback: **30 days**
- Name: `SOLUM | Video 50pct | 30d`
- Note: This captures Meta/Instagram reel engagers — no pixel required. Rebuild monthly with your latest reel library.

### D. ViewContent + InitiateCheckout — Last 14 Days
- Source: **Website**
- Rule: People who triggered `ViewContent` OR `InitiateCheckout` in the last 14 days
- Name: `SOLUM | VC+IC | 14d`

### E. Purchasers (Exclusion Only)
- Source: **Website**
- Event: `Purchase`
- Lookback: **180 days**
- Name: `SOLUM | Purchasers | 180d`
- Note: Use only as an exclusion. Never target this audience.

---

## Step 2 — Campaign 1: Cold / Leads (Meta)

**Purpose:** Push L1–L2 creative to new audiences; generate `QualifiedVisit` signal.

| Setting | Value |
|---|---|
| Objective | Traffic (optimise for **Landing Page Views**) or Conversions with `QualifiedVisit` as the conversion event |
| Optimisation event | `QualifiedVisit` (select under Conversions → Website → Custom Events) |
| Budget | ~20–30% of daily total — start with the Traffic objective if `QualifiedVisit` hasn't accumulated 50+ events in 7 days yet; switch to Conversions once it has |
| Audience | Broad — UK, Men 18–45. Interest layering optional; keep loose to let Meta optimise |
| **Exclusions** | `SOLUM | Purchasers | 180d` + `SOLUM | QV | 30d` (exclude warm, only reach new people) |
| Ad format | Reels (vertical video) |
| Placements | Advantage+ Placements (let Meta choose) |
| Creative rotation | Weekly champion/challenger — replace the losing reel each Friday; keep the winner running |

**Creative brief (L1–L2):**
- Hook: challenge the routine — "You shower every day and still have rough skin" (L1 Wrong)
- Body: explain the mechanism — dead skin barrier, sulphate damage, back never cleaned (L2 Why)
- CTA: "See the system → bysolum.co.uk"
- KPI to watch: CPV (cost per profile visit, existing metric) + `QualifiedVisit` conversion rate

---

## Step 3 — Campaign 2: Warm / Retarget (Meta)

**Purpose:** Re-engage video watchers and site explorers with L3–L4 education and ritual content.

| Setting | Value |
|---|---|
| Objective | Conversions → `ViewContent` or `InitiateCheckout` (move them down funnel) |
| Budget | ~30–40% of daily total |
| Audience | `SOLUM | Video 50pct | 30d` + `SOLUM | QV | 14d` (combine in one ad set) |
| **Exclusions** | `SOLUM | Purchasers | 180d` |
| Ad format | Reels + static carousel showing ritual steps |
| Frequency cap | Max 3–5 impressions/person/week. If frequency climbs above 6, refresh creative immediately |

**Creative brief (L3–L4):**
- L3 Fix: show the SOLUM ritual system — 10-min daily, 22-min weekly, all 7 products working together
- L4 Proof: ritual demo video (step-by-step), ingredient origins (Morocco clay, Korean mitt technique), "dead skin will roll off" moment
- CTA: "Start the ritual — GROUND kit from £65" or "RITUAL kit £85 — most popular"
- Highlight: GROUND £65 / RITUAL £85 (hero). Do not advertise SOVEREIGN (coming soon).

---

## Step 4 — Campaign 3: Hot / Convert (Meta)

**Purpose:** Convert high-intent abandoners who viewed products or started checkout.

| Setting | Value |
|---|---|
| Objective | Conversions → `Purchase` |
| Optimisation event | `Purchase` (standard event — server + client dedup already live) |
| Budget | ~30–40% of daily total |
| Audience | `SOLUM | VC+IC | 14d` (anyone who hit `/buy` or a product page but didn't buy) |
| **Exclusions** | `SOLUM | Purchasers | 180d` |
| Ad format | Static + short video (15–20s reminder) |
| Frequency cap | Max 5 impressions/person/week. Refresh creative at 6+ |
| Lookback window | 7-day click, 1-day view (conversion attribution) |

**Creative brief (L5):**
- L5 Identity: "You've seen the system. This is the kit that makes it real."
- Social proof pull quote or review
- £10-back mechanic if applicable (check `/buy` flow)
- Direct product shot: RITUAL kit (£85), one CTA: "Order at bysolum.co.uk"
- Urgency only if genuinely warranted (limited first batch)

**Purchase dedup note:** The Stripe webhook fires Meta CAPI with `event_id` = PaymentIntent id. The client `fbPurchase` also sends the same `event_id`. Meta will dedup them — you should see ~1 counted event per purchase in Meta Events Manager (Event Match Quality ≥8.0 is the target).

---

## Meta Budget + Frequency Rules Summary

| Rule | Detail |
|---|---|
| Cold optimisation signal | `QualifiedVisit` until pool grows; do NOT use `Purchase` at <£50/day total |
| Warm frequency | 3–5 impressions/person/week max; refresh creative when it hits 6 |
| Hot frequency | 3–5; refresh at 6 |
| Purchaser exclusion | Always on Cold + Warm. Never serve ads to people who already bought |
| Campaign consolidation | Keep to 3 campaigns total — one bigger campaign learns faster than four fragmented ones |
| Creative cadence | Weekly champion/challenger on Cold; refresh Warm/Hot monthly or when frequency spikes |

---

---

# PART 2 — TIKTOK ADS MANAGER

> **Terminology note:** TikTok uses "Custom Audience" (same term as Meta) but the interface and event setup differ. TikTok objectives differ from Meta — "Traffic" on TikTok = website visits; "Conversions" = a conversion event; "Product Sales" is a separate objective. TikTok's equivalent of Meta CAPI is the **TikTok Events API**.

---

## Step 1 — Create Custom Audiences (TikTok)

Navigate to: **TikTok Ads Manager → Assets → Audiences → Create Audience → Custom Audience**

### A. QualifiedVisit — Last 14 Days
- Source: **TikTok Pixel** (Website Traffic)
- Event: `QualifiedVisit` (custom event)
- Lookback: **14 days**
- Name: `SOLUM | QV | 14d`

### B. QualifiedVisit — Last 30 Days
- Source: **TikTok Pixel**
- Event: `QualifiedVisit`
- Lookback: **30 days**
- Name: `SOLUM | QV | 30d`

### C. Video Viewers ≥50% (On-Platform)
- Source: **TikTok Engagement** → Video Interactions
- Rule: Users who watched **50% or more** of your TikTok video(s)
- Lookback: **30 days**
- Name: `SOLUM | Video 50pct | 30d`
- Note: TikTok calls this an "Engagement Custom Audience." Build it from your published TikTok account videos. Minimum 1,000 users required before TikTok activates the audience.

### D. ViewContent + InitiateCheckout — Last 14 Days
- Source: **TikTok Pixel**
- Rule: Users who triggered `ViewContent` OR `InitiateCheckout` in the last 14 days
- Name: `SOLUM | VC+IC | 14d`

### E. Purchasers (Exclusion Only)
- Source: **TikTok Pixel**
- Event: `CompletePayment`
- Lookback: **180 days**
- Name: `SOLUM | Purchasers | 180d`
- Note: `CompletePayment` is TikTok's equivalent of Meta's `Purchase`. Server-side Events API fires this on payment success with `event_id` = PaymentIntent id.

---

## Step 2 — Campaign 1: Cold / Leads (TikTok)

**Purpose:** Reach new TikTok users with L1–L2 creative; build `QualifiedVisit` audience pool.

| Setting | Value |
|---|---|
| Objective | **Traffic** (optimise for Click/Landing Page View) initially; switch to **Conversions** → `QualifiedVisit` once the event has 50+ fires in 7 days |
| Optimisation event | `QualifiedVisit` (under Conversions → Custom Events) |
| Budget | ~20–30% of daily total |
| Audience | Broad UK, Men 18–45. TikTok's "Broad Audience" with no interest targeting performs well for cold — let the algorithm learn |
| **Exclusions** | `SOLUM | Purchasers | 180d` + `SOLUM | QV | 30d` |
| Ad format | TopView or In-Feed Ads using your Reels (9:16 vertical, ≤60s; first 3s must hook) |
| Placements | TikTok placement only (not Pangle) for brand safety at this stage |
| Creative rotation | Weekly champion/challenger — same cadence as Meta. One reel per ad group; replace loser weekly |

**Creative brief (L1–L2):** Same messaging direction as Meta — same reel assets work on both platforms. First 3 seconds are the hook (L1). Remaining time is L2 mechanism. CTA card at end: "bysolum.co.uk"

**TikTok-specific note:** TikTok's algorithm needs ~50 conversion events per ad group per week to exit the learning phase. If `QualifiedVisit` fires are below that, stay on Traffic objective temporarily and check back weekly.

---

## Step 3 — Campaign 2: Warm / Retarget (TikTok)

**Purpose:** Re-engage TikTok video engagers and site visitors with L3–L4 content.

| Setting | Value |
|---|---|
| Objective | Conversions → `ViewContent` or `InitiateCheckout` |
| Budget | ~30–40% of daily total |
| Audience | `SOLUM | Video 50pct | 30d` + `SOLUM | QV | 14d` |
| **Exclusions** | `SOLUM | Purchasers | 180d` |
| Ad format | In-Feed Ads — ritual demo videos, step-by-step, slightly longer (30–45s acceptable for warm audiences) |
| Frequency | Monitor in reporting; target 3–5 per user per week. TikTok doesn't have a native frequency cap per ad group — manage by audience size and budget |

**Creative brief (L3–L4):** Ritual demo (Daily 10-min sequence), ingredient origin stories (Morocco clay, Korean mitt technique, UK body wash). Product detail shots. CTA: "RITUAL kit — £85 — bysolum.co.uk"

**Audience size note:** TikTok requires a minimum ~1,000 users in a Custom Audience to activate it. If `QV | 14d` is too small initially, use `QV | 30d` or Video 50pct 30d as the seed and add `QV | 14d` once the pool grows.

---

## Step 4 — Campaign 3: Hot / Convert (TikTok)

**Purpose:** Convert abandoners who viewed the buy page or started checkout.

| Setting | Value |
|---|---|
| Objective | Conversions → `CompletePayment` (TikTok's equivalent of `Purchase`) |
| Optimisation event | `CompletePayment` (server-side Events API + client both active; dedup key = PaymentIntent id) |
| Budget | ~30–40% of daily total |
| Audience | `SOLUM | VC+IC | 14d` |
| **Exclusions** | `SOLUM | Purchasers | 180d` |
| Ad format | In-Feed Ads — short (15–20s), direct product + CTA |
| Creative brief | L5 Identity + social proof + direct offer. RITUAL kit £85 prominent. One clear CTA. |

**CompletePayment dedup note:** The Stripe webhook fires TikTok Events API (`CompletePayment`) with `event_id` = PaymentIntent id. The client `ttqCompletePayment` fires the same. TikTok deduplicates on `event_id`. Check TikTok Events Manager for "match quality" indicator — aim for healthy/good status.

---

## TikTok Budget + Frequency Rules Summary

| Rule | Detail |
|---|---|
| Cold optimisation signal | `QualifiedVisit` once ≥50 fires/week; Traffic objective until then |
| Warm frequency | Monitor reporting; budget-cap naturally limits frequency in small audiences |
| Hot frequency | Same; refresh creative if delivery slows or CPM rises sharply |
| Purchaser exclusion | Always exclude `SOLUM | Purchasers | 180d` from Cold + Warm |
| Campaign consolidation | 3 campaigns — same principle as Meta. Don't fragment budget |
| TikTok learning phase | ~50 conversion events/ad group/week to exit learning. If optimising on `QualifiedVisit` and event volume is low, stay on Traffic until volume builds |

---

---

# PART 3 — PRE-LAUNCH VERIFICATION CHECKLIST

Complete this checklist before activating any campaigns on either platform. Do not spend budget until all items are confirmed.

## A. Pixel / Event Verification

| Check | Meta | TikTok |
|---|---|---|
| Pixel fires on `/buy` (ViewContent) | Verify in Meta Pixel Helper browser extension | Verify in TikTok Pixel Helper extension |
| `QualifiedVisit` appears as a custom event | Meta Events Manager → Data Sources → your pixel → Test Events | TikTok Events Manager → your pixel → Test Events — trigger on-site then check |
| `QualifiedVisit` is selectable as an optimisation event | In campaign setup → Conversions objective → Conversion Event dropdown — must appear under Custom Events | Same path in TikTok campaign setup → Conversion Event |
| `InitiateCheckout` fires at payment intent creation | Events Manager test tab — go through checkout to payment step | Same |
| `Purchase` fires on success page | Trigger a test purchase with a Stripe test card — check Events Manager | Same — check for `PlaceAnOrder` + `CompletePayment` |

**BLOCKER:** If `QualifiedVisit` does not appear as a selectable optimisation event in either Ads Manager, do not launch that platform's Cold campaign. Run on Traffic objective only until the event accumulates ≥50 fires and the platform surfaces it.

## B. Server-Side Verification

| Check | Where to confirm |
|---|---|
| Meta CAPI Purchase visible in Events Manager | Events Manager → your pixel → Overview — look for "Server" source under Purchase events |
| Meta event dedup working | Events Manager → Purchase — "Deduplicated events" count should be ~0 (no double counting) |
| Meta Event Match Quality | Events Manager → Purchase → Event Match Quality — target ≥8.0 |
| TikTok Events API Purchase visible | TikTok Events Manager → your pixel → Real-time events — trigger a test purchase |
| TikTok CompletePayment match quality | Events Manager → Data Quality — should show "Good" or "Excellent" |
| `META_CAPI_ACCESS_TOKEN` secret set on Supabase edge function | Supabase dashboard → Edge Functions → stripe-webhook → Secrets |
| `TIKTOK_EVENTS_ACCESS_TOKEN` secret set | Same location |
| Edge function deployed to prod | Supabase dashboard → Edge Functions → stripe-webhook → confirm prod instance is latest version |

## C. Audience Readiness

| Check | Action |
|---|---|
| All 5 Meta custom audiences created | Audiences tab — all should show "Ready" status (may take 24–48h to populate) |
| All 5 TikTok custom audiences created | TikTok Audiences — "QV 14d" and "Video 50pct" may show "<1000" initially; wait for organic traffic to build them |
| Purchaser exclusion audiences confirmed | Spot-check by searching for `Purchasers | 180d` in each platform |

## D. Campaign Structure Confirmation

| Check | Meta | TikTok |
|---|---|---|
| 3 campaigns created (not more) | Cold, Warm, Hot — each separate campaign | Same |
| Purchasers excluded from Cold + Warm | Exclusion audience set at ad set level | Same |
| Warm excludes purchasers | Confirmed in exclusion section | Confirmed |
| Hot targets VC+IC only, excludes purchasers | Confirmed | Confirmed |
| Budget allocations set per split above | Cold 20–30%, Warm 30–40%, Hot 30–40% | Same |
| Cold optimisation event = QualifiedVisit (or Traffic if not yet available) | Confirmed | Confirmed |
| Hot optimisation event = Purchase / CompletePayment | Confirmed | Confirmed |

---

## Platform Terminology Quick Reference

| Concept | Meta term | TikTok term |
|---|---|---|
| Purchase conversion event | `Purchase` | `CompletePayment` |
| Server-side tracking | CAPI (Conversions API) | Events API |
| Audience from website traffic | Custom Audience (Website) | Custom Audience (Pixel Traffic) |
| Audience from video engagement | Custom Audience (Video) | Engagement Custom Audience |
| Budget-level control | Campaign Budget Optimisation (CBO) or Ad Set level | Campaign Budget (same concept) |
| Ad format | Reels / Stories / Feed | In-Feed Ads / TopView |
| Event match quality | Event Match Quality score (0–10) | Match Quality (Poor/Fair/Good/Excellent) |
| Learning phase | "Learning" status on ad set | "Learning" phase (≥50 events/week to exit) |

---

## Ongoing Maintenance

| Cadence | Action |
|---|---|
| Weekly (Friday) | Review Cold campaign: replace losing reel with new challenger; keep winner |
| Weekly | Check Warm/Hot frequency; pause ad sets with frequency >6 until creative is refreshed |
| Weekly | Check Meta EMQ on Purchase — flag if it drops below 8.0 |
| Monthly | Refresh video audience pools (rebuild `Video 50pct | 30d` with latest reel library) |
| Monthly | Review budget split: if Hot campaign is converting well, consider increasing its share |
| After every purchase batch | Verify purchaser exclusion audiences are updating (check audience size in Audiences tab) |

---

_SOLUM · Internal Use Only · bysolum.co.uk · Runbook v1 — 2026-06-26_
