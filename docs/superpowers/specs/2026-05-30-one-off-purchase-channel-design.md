# One-Off Purchase Channel Design

**Date:** 2026-05-30  
**Status:** Approved — ready for implementation

---

## Context

Solum is launching with ~300 units. A subscription-first launch would cap sales at 100–120 people (one refill cycle only). Instead: sell 250 first boxes as one-time purchases, collect feedback, restock 1,000+ units, then launch subscription properly.

The `/buy` page is not a temporary workaround — it is a permanent channel that handles first-batch sales, TikTok sales, and gift purchases forever. The subscription checkout (`/checkout`) coexists permanently alongside it.

**Inventory split:** 250 units sold, 50 reserved for gifting and promotional use.

---

## Phase Plan

| Phase | Timing | What happens |
|-------|--------|-------------|
| 1 — First batch | Now | `/buy` live, homepage in first-batch mode, 250 one-time sales |
| 2 — Feedback | ~2 weeks post-delivery | Automated + manual email survey to all 250 buyers |
| 3 — Subscription launch | ~2 months after Phase 1 | Restock 1,000+ units, `/checkout` activated, homepage flips to subscription mode, first 250 buyers invited first |

---

## Section 1: `/buy` Page

### Route
New permanent route at `/buy`. The existing `/checkout` is untouched.

### Context via `?source=` param

| URL | Context | Price | Extra behaviour |
|-----|---------|-------|-----------------|
| `/buy` (no param) | First batch | £65 / £85 | Stock counter shown |
| `/buy?source=gift` | Gift purchase | £75 / £95 | Recipient name/email/message fields |
| `/buy?source=tiktok` | TikTok sale | £75 / £95 | Source tracked on order |

### Stock counter
- Calls `get-inventory-status` edge function on load
- Function enhanced to return `available_count` (integer) per kit alongside existing boolean
- Displays: *"X of 250 remaining"* — shown only when `source` is default (first batch)
- When count = 0 for a kit: card flips to "Sold Out", button disabled
- When both kits sold out: page shows email capture waitlist (no payment)

### Checkout flow
- Kit selector: GROUND (price) and RITUAL (price) cards — one-time prices only, no subscription language
- On select → calls new edge function `create-first-box-session`
- Redirects to Stripe Checkout (one-time payment mode, no recurring)
- On success → existing `/success` page (no changes needed)

### Post-Phase-1 state
When stock hits 0 naturally, `/buy` shows sold-out state. No redirect needed — `/buy?source=gift` and `/buy?source=tiktok` remain live for ongoing channels.

---

## Section 2: Homepage (`/`)

### Phase 1 mode (now)
- **Hero:** Copy updated to first-batch framing. Headline: scarcity + directness ("250 kits. No subscription required. Get yours."). CTA: → `/buy`
- **Kit section:** One-time prices shown (£65 / £85). Subscription pricing hidden. SOVEREIGN stays "Coming Soon."
- **Subscription section:** Hidden entirely during Phase 1.
- **Everything else:** Ritual section, product lineup, provenance — unchanged.

### Phase 2 flip (subscription launch)
Two changes only:
1. Hero CTA target: `/buy` → `/checkout`
2. Subscription section: unhidden
Kit prices update to subscription first-box pricing. Nothing else changes.

---

## Section 3: Backend — `create-first-box-session` Edge Function

New edge function, clean copy of `create-checkout-session` with:
- **Removed:** billing anchor logic, subscription setup, recurring price IDs
- **Added:** `source` param passed through → written to `orders.source` on webhook
- **Mode:** `mode: 'payment'` (Stripe one-time), not `mode: 'subscription'`
- **Metadata:** `kit_id`, `source`, `amount` passed in Stripe session metadata
- `orders.source` enum values: `first_batch` | `gift` | `tiktok_shop` | `website`

### `get-inventory-status` enhancement
Add `available_count` to response:
```
Before: { kits: { ground: true, ritual: true } }
After:  { kits: { ground: { available: true, count: 187 }, ritual: { available: true, count: 63 } } }
```

### Stripe webhook
`stripe-webhook` already handles `checkout.session.completed`. Extend to:
- Write `source` from session metadata to `orders.source`
- No subscription record created for one-time orders (skip subscription insert if `source !== 'website'` subscription mode)

---

## Section 4: Feedback Flow

Triggered ~14 days after estimated delivery date (order date + 2 days shipping + 14 days use).

### Automated (all 250 buyers)
- Resend email triggered by scheduled job or date calculation on `orders` table
- Subject: direct, personal — *"Quick question about your SOLUM kit"*
- Body: plain-text style (not branded template), 3–4 questions inline or Typeform link
- Tracked via Resend open/click events

### Manual follow-up (non-openers)
- Harsha reviews Resend dashboard at day 17 for non-openers
- Sends personal plain-text email from harsha@bysolum.co.uk
- No automation — manual send from email client

### Survey questions (to finalise separately)
1. Which kit did you order?
2. How often have you used it in the first 2 weeks?
3. What's working / what isn't?
4. Would you subscribe for monthly refills? (Yes / Maybe / No)
5. NPS: how likely to recommend?

### Subscription conversion email
Separate from feedback — sent at ~30 days post-delivery to all first-batch buyers:
*"Your refills are coming. Subscription launches [date] — you're first in line."*

---

## Section 5: New Projections

Old projections (`artefacts/solum-5year-projections.html`) are deprecated — modelled subscription-from-day-1.

New projections artefact: `artefacts/solum-5year-projections-v2.html`

Model structure:
- **Months 1–2:** One-time revenue only. 250 boxes × £65–£85 average. No recurring.
- **Month 3:** Subscription launches. Conversion rate from first-batch buyers applied (target: 40–60%).
- **Year 1+:** Standard subscription model resumes from converted base + new acquisition.

Three scenarios (conservative / base / optimistic) with updated churn, CAC, and LTV assumptions informed by first-batch feedback data.

---

## What Is Not Changing

- `/checkout` — subscription flow, completely untouched
- `/success` — works for both subscription and one-time (already generic)
- `/account`, `/ritual`, `/guide`, all other routes — untouched
- Stripe subscription price IDs — untouched
- Admin panel — existing views unchanged (orders will appear with `source` field once added)

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `web/src/pages/BuyPage.jsx` | Create — new one-time checkout page |
| `web/src/App.jsx` | Add `/buy` route |
| `web/src/pages/FullSite.jsx` (or homepage components) | Update hero copy + CTA, hide subscription section |
| `supabase/functions/create-first-box-session/index.ts` | Create — one-time Stripe session |
| `supabase/functions/get-inventory-status/index.ts` | Update — return count not just boolean |
| `supabase/migrations/` | Add `source` column to `orders` table |
| `artefacts/solum-5year-projections-v2.html` | Create — new projections artefact |
