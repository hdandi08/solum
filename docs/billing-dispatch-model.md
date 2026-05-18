# SOLUM — Billing & Dispatch Model

> Last updated: May 2026. Reference before changing any checkout, webhook, or dispatch logic.

---

## Dispatch Days

Two dispatch windows per week:

| Order placed | Cutoff | Ships | Arrives (RM Tracked 48) |
|---|---|---|---|
| Mon 12:01 PM → **Wed 12:00 PM** | Wednesday noon | **Thursday** | Saturday |
| Wed 12:01 PM → **Sun 12:00 PM** | Sunday noon | **Monday** | Wednesday |
| Sun 12:01 PM → Wed 12:00 PM | Wednesday noon | **Thursday** | Saturday |

Royal Mail Tracked 48 delivers Monday–Saturday. Saturday counts as a working day — no surcharge.

---

## First Box Billing

- Charged **immediately** at checkout (one-time price)
- First box contains: one of each SKU — tools + consumables (250ml body wash, lotion, etc.)
- 250ml body wash ≈ 35 days at daily use — refill arrives day 34, right on time

---

## Subscription Billing — 30-Day Rolling

**Rule:** First recurring charge = **30 days from the purchase date**. Every 30 days after that.

No fixed anchor date. No cliff. Every customer gets exactly 30 days between purchase and first charge, regardless of when in the month they join.

### Why 30-day rolling (not 1st of month)

The 1st-of-month model created a gap cliff: customers who bought on day 18+ waited 40+ days for their first refill. That means extra consumables in the first box (logistics nightmare) or customers running out. 30-day rolling solves this completely — the gap is always exactly 30 days.

### Refill Schedule (per customer)

| Event | Timing |
|---|---|
| Purchase | Day 0 |
| First box dispatched | Next Thu or Mon dispatch window |
| First box arrives | 2 days after dispatch |
| First refill charged | Day 30 (midnight) |
| Refill dispatched | Day 32 (2 days after charge) |
| Refill arrives | Day 34 (RM Tracked 48 from dispatch) |
| Second refill | Day 60 — and so on |

One 250ml body wash per box. At daily use that's ~35 days — the refill arrives on day 34, right as they finish it.

---

## Stripe Implementation

```typescript
// First charge = 30 days from now (midnight)
function getFirstChargeDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  d.setHours(0, 0, 0, 0)
  return d
}

// In create-checkout-session:
subscription_data: {
  trial_end: Math.floor(getFirstChargeDate().getTime() / 1000),
  // No billing_cycle_anchor — rolling 30-day intervals from trial_end
}
```

Stripe's `trial_end` defers the first charge to that timestamp, then bills every month (≈30 days) from that anchor. The monthly interval means subsequent charges are approximately every 30 days.

---

## Customer Messaging

At checkout (shown dynamically on the Stripe form):
> "Your first box ships [Thu/Mon date] and arrives by [arrival date] — no action needed. Your first refill is charged on [+30 days] (30 days from today), ships [+32 days], arrives by [+34 days]. Every 30 days after that."

In terms:
> Your first refill subscription charge occurs 30 days after your first order. After that, you are billed every 30 days. Cancel any time from your account.

---

## Courier

**Royal Mail Tracked 48 via Sendcloud**

- First box: 1.5–1.8kg → ~£3.00 per parcel via Sendcloud
- Refill: ~1kg → ~£2.70 per parcel via Sendcloud
- Saturday delivery included as standard (no surcharge)
- Thursday dispatch → arrives Saturday
- Monday dispatch → arrives Wednesday
- Sendcloud Lite plan: £7/month, no minimum volume

Upgrade to DPD direct account when volume reaches ~50 parcels/week.

---

## COGS Impact of 2× Body Wash in First Box

| Kit | Extra body wash COGS | New first box COGS | First box RRP | New GM |
|---|---|---|---|---|
| GROUND | +£3.20 | £19.55 | £65 | 69.9% (was 74.8%) |
| RITUAL | +£3.20 | £24.75 | £85 | 70.9% (was 72.4%) |
| SOVEREIGN | +£3.20 | £36.15 | £130 | 72.2% (was 74.7%) |

Monthly subscription margins unchanged. LTV impact is negligible — the extra £3.20 is recovered in month 1 COGS and reduces churn risk.
