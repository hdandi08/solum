# Shipping Schedule & Billing Transparency — Design Spec

> Created: 2026-03-25

## Overview

Show customers exactly when their first box ships and when subscription charges hit — on our checkout page and on Stripe's hosted checkout. Replace the current vague "ships 1st of each month" copy with computed specific dates.

---

## Shipping & Billing Model

### First Box
- Ships every **Monday** (one dispatch run per week)
- If today is Monday, dispatches next Monday (not same day — packing time)
- Arrives ~3 days after dispatch (Royal Mail Tracked 48)

### Subscription Refills
- Charged on the **25th** of each month
- Ships on the **28th**
- Arrives by the **1st–3rd** of the following month

### First Billing Anchor Rule
Based on the next Monday dispatch date:

| Dispatch day of month | First subscription charge |
|---|---|
| ≤ 7th | 25th of **same** month (≥15 days gap from arrival) |
| > 7th | 25th of **next** month (≥18 days gap from arrival) |

This ensures every customer has at least 2 weeks between receiving their first box and being charged for their refill.

---

## Date Calculation Logic

Same algorithm in both frontend (JS) and edge function (TS). Duplicated, not shared.

```
nextMondayDispatch(today):
  day = today.getDay()           // 0=Sun, 1=Mon, ..., 6=Sat
  daysUntil = (day === 1) ? 7 : (1 + 7 - day) % 7
  return today + daysUntil days

arrivalDate(dispatchDate):
  return dispatchDate + 3 days

firstBillingDate(dispatchDate):
  if dispatchDate.getDate() <= 7:
    return new Date(year, month, 25)      // same month
  else:
    return new Date(year, month + 1, 25)  // next month

refillShipDate(billingDate):
  return new Date(billingDate.getFullYear(), billingDate.getMonth(), 28)

refillArrivalDate(billingDate):
  // Always "1st of the month after billing" — cleaner than ship+3 which varies by month length
  return new Date(billingDate.getFullYear(), billingDate.getMonth() + 1, 1)
```

---

## Changes Required

### 1. Edge Function — `create-checkout-session/index.ts`

**Replace** the current `trial_end` billing deferral with `billing_cycle_anchor` + `proration_behavior: 'none'`.

Current (wrong — shows "trial" language to customer):
```typescript
subscription_data: {
  trial_end: billingAnchor,
  metadata: { ... }
}
```

New:
```typescript
subscription_data: {
  billing_cycle_anchor: Math.floor(firstBillingDate.getTime() / 1000),
  proration_behavior: 'none',
  metadata: { ... }
}
```

**Add** shipping date to first box product description (created fresh per session, so dynamic dates are safe):
```typescript
product_data: {
  name: `SOLUM ${kit.name} — First Box`,
  description: `Ships ${formatDate(dispatchDate)} · Arrives by ${formatDate(arrivalDate)}`
}
```

**Add** refill schedule to Stripe session `custom_text`:
```typescript
custom_text: {
  submit: {
    message: `First refill charged ${formatDate(billingDate)} · ships ${formatDate(refillShipDate)} · arrives by ${formatDate(refillArrivalDate)}`
  }
}
```

Date format throughout: `"Mon 6 Apr"` / `"Thu 9 Apr"` / `"1 May"` — short, unambiguous.

### 2. Checkout Page — `web/src/pages/CheckoutPage.jsx`

**Add** date calculation at the top of the component (client-side, same logic as edge function).

**Replace** the current price-sub / price-day lines in the right panel:

Current:
```
then £48/mo · ships 1st of each month
That's £1.58 a day
```

New:
```
Ships [Mon D MMM] · Arrives by [D MMM]

then £48/mo
Charged [D MMM] · Ships [D MMM] · Arrives by [D MMM]

That's £X.XX a day
```

Two visual blocks — first box timing and refill timing — separated clearly. The `co-price-day` per-day line stays below.

### 3. Subscription Section — `web/src/components/SubscriptionSection.jsx`

**Append** to the existing `sub-footnote` block:

> First box ships the next Monday after you order. Refills are charged on the 25th and arrive by the 1st of each month.

Static text only — no dynamic dates needed here.

---

## What Does NOT Change

- Stripe product names (`SOLUM RITUAL — First Box`, `SOLUM RITUAL — Monthly Refill`)
- Monthly price reuse logic (lookup key pattern)
- Lead capture in Supabase
- All other checkout page UI (form fields, promise block, product list, upgrade nudge)
- All other website sections

---

## Format Helper

```
formatShort(date):  "Mon 6 Apr", "Thu 9 Apr", "28 Apr", "1 May"
```

Use `toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })` for dispatch/arrival, and `{ day: 'numeric', month: 'short' }` for charge/ship/arrive dates.
