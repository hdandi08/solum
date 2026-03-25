# Shipping Schedule & Billing Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show customers exact first-box ship/arrival dates and first subscription charge date on both our checkout page and Stripe's hosted checkout.

**Architecture:** Pure date-calculation functions duplicated in the edge function (Deno/TS) and the React checkout page (JS). Edge function passes computed dates into Stripe's product description and custom_text fields. Checkout page renders the same dates client-side.

**Tech Stack:** Deno (edge function), React/JSX (checkout page), Stripe Checkout API

---

## File Map

| File | Change |
|---|---|
| `supabase/functions/create-checkout-session/index.ts` | Add date helpers, replace `trial_end` with `billing_cycle_anchor` + `proration_behavior: 'none'`, add first-box description and session `custom_text` |
| `web/src/pages/CheckoutPage.jsx` | Add date helpers, update right-panel price display with specific ship/charge dates |
| `web/src/components/SubscriptionSection.jsx` | Append static shipping cadence sentence to footnote |

---

## Task 1: Update the edge function

**Files:**
- Modify: `supabase/functions/create-checkout-session/index.ts`

- [ ] **Step 1: Add date helper functions**

Add these pure functions at the top of the file, after the `corsHeaders` block (before `alertError`):

```typescript
// ── Shipping date helpers ──────────────────────────────────────────────────

/** Next Monday from today. If today is Monday, returns next week's Monday. */
function nextMondayDispatch(): Date {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntil = day === 1 ? 7 : (1 + 7 - day) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** First box arrives ~3 days after dispatch. */
function firstBoxArrival(dispatch: Date): Date {
  const d = new Date(dispatch);
  d.setDate(d.getDate() + 3);
  return d;
}

/**
 * First subscription billing date (25th).
 * If dispatch falls on or before the 7th → same month's 25th.
 * Otherwise → next month's 25th.
 * Ensures ≥15 days gap between first-box arrival and first charge.
 */
function firstBillingDate(dispatch: Date): Date {
  if (dispatch.getDate() <= 7) {
    return new Date(dispatch.getFullYear(), dispatch.getMonth(), 25);
  }
  return new Date(dispatch.getFullYear(), dispatch.getMonth() + 1, 25);
}

/** Refill ships on the 28th of the billing month. */
function refillShipDate(billing: Date): Date {
  return new Date(billing.getFullYear(), billing.getMonth(), 28);
}

/** Refill arrives by the 1st of the month after billing. */
function refillArrivalDate(billing: Date): Date {
  return new Date(billing.getFullYear(), billing.getMonth() + 1, 1);
}

/** "Mon 6 Apr" format for dispatch/arrival. */
function fmtDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "25 Apr" format for charge/ship/arrive dates. */
function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
```

- [ ] **Step 2: Compute dates inside the request handler**

After the line `const kit = KIT_PRICES[kit_id!];` (around line 55), add:

```typescript
// Shipping & billing schedule
const dispatch     = nextMondayDispatch();
const arrival      = firstBoxArrival(dispatch);
const billing      = firstBillingDate(dispatch);
const refillShip   = refillShipDate(billing);
const refillArrive = refillArrivalDate(billing);
```

- [ ] **Step 3: Add description to the first-box price**

The first-box price is created fresh each session (line ~92). Update `product_data` to include a description:

```typescript
const firstBoxPrice = await stripe.prices.create({
  currency: 'gbp',
  unit_amount: kit.first_box_pence,
  product_data: {
    name: `SOLUM ${kit.name} — First Box`,
    description: `Ships ${fmtDay(dispatch)} · Arrives by ${fmtDay(arrival)}`,
  },
});
```

- [ ] **Step 4: Replace `trial_end` with `billing_cycle_anchor`**

Find the current `subscription_data` block (around line 125):

```typescript
// REMOVE this:
subscription_data: {
  trial_end: billingAnchor,
  metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
},
```

Replace with:

```typescript
subscription_data: {
  billing_cycle_anchor: Math.floor(billing.getTime() / 1000),
  proration_behavior: 'none',
  metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
},
```

Also remove the old `billingAnchor` calculation block (~lines 112–116):

```typescript
// DELETE these lines:
const now = new Date();
const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
const monthsAhead = daysLeftInMonth < 15 ? 2 : 1;
const billingAnchor = Math.floor(new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1).getTime() / 1000);
```

- [ ] **Step 5: Add `custom_text` to the Stripe session**

Add `custom_text` to the `stripe.checkout.sessions.create` call, after `cancel_url`:

```typescript
custom_text: {
  submit: {
    message: `First refill charged ${fmtDate(billing)} · ships ${fmtDate(refillShip)} · arrives by ${fmtDate(refillArrive)}`,
  },
},
```

- [ ] **Step 6: Verify the full updated session create call looks correct**

The `stripe.checkout.sessions.create` call should now look like:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customer.id,
  mode: 'subscription',
  line_items: [
    { price: firstBoxPrice.id,  quantity: 1 },
    { price: monthlyPrice.id,   quantity: 1 },
  ],
  subscription_data: {
    billing_cycle_anchor: Math.floor(billing.getTime() / 1000),
    proration_behavior: 'none',
    metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
  },
  shipping_address_collection: {
    allowed_countries: ['GB'],
  },
  custom_text: {
    submit: {
      message: `First refill charged ${fmtDate(billing)} · ships ${fmtDate(refillShip)} · arrives by ${fmtDate(refillArrive)}`,
    },
  },
  success_url,
  cancel_url,
  metadata: { kit_id, first_name, last_name, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
});
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/create-checkout-session/index.ts
git commit -m "feat: shipping dates in Stripe checkout — billing_cycle_anchor on 25th, first-box description, custom_text refill schedule"
```

---

## Task 2: Update the checkout page

**Files:**
- Modify: `web/src/pages/CheckoutPage.jsx`

- [ ] **Step 1: Add date helpers to the component file**

Add these functions near the top of `CheckoutPage.jsx`, after the `CSS` constant and before the `export default function CheckoutPage()` line:

```javascript
// ── Shipping date helpers ──────────────────────────────────────────────────

function getNextMondayDispatch() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntil = day === 1 ? 7 : (1 + 7 - day) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next;
}

function getFirstBoxArrival(dispatch) {
  const d = new Date(dispatch);
  d.setDate(d.getDate() + 3);
  return d;
}

function getFirstBillingDate(dispatch) {
  if (dispatch.getDate() <= 7) {
    return new Date(dispatch.getFullYear(), dispatch.getMonth(), 25);
  }
  return new Date(dispatch.getFullYear(), dispatch.getMonth() + 1, 25);
}

function getRefillShipDate(billing) {
  return new Date(billing.getFullYear(), billing.getMonth(), 28);
}

function getRefillArrivalDate(billing) {
  return new Date(billing.getFullYear(), billing.getMonth() + 1, 1);
}

function fmtDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
```

- [ ] **Step 2: Compute dates inside the component**

In `CheckoutPage()`, after the existing line:

```javascript
const ritualKit = KITS.find(k => k.id === 'ritual');
```

Add:

```javascript
const dispatch     = getNextMondayDispatch();
const arrival      = getFirstBoxArrival(dispatch);
const billing      = getFirstBillingDate(dispatch);
const refillShip   = getRefillShipDate(billing);
const refillArrive = getRefillArrivalDate(billing);
```

- [ ] **Step 3: Add CSS class for the refill detail line**

Inside the `CSS` constant, add after the `.co-price-day` rule:

```css
.co-price-refill{font-size:13px;color:var(--stone);font-weight:300;margin-top:3px;letter-spacing:.3px;}
```

- [ ] **Step 4: Replace the price display in the right panel**

Find the current price block in the JSX (right panel, around lines 258–263):

```jsx
// REMOVE this:
<div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
  <span className="co-price-main">£{kit.firstBoxPrice}</span>
  <span className="co-price-label">first box</span>
</div>
<div className="co-price-sub">then £{kit.monthlyPrice}/mo · ships 1st of each month</div>
<div className="co-price-day">That's £{perDay} a day</div>
```

Replace with:

```jsx
<div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
  <span className="co-price-main">£{kit.firstBoxPrice}</span>
  <span className="co-price-label">first box</span>
</div>
<div className="co-price-sub">Ships {fmtDay(dispatch)} · Arrives by {fmtDay(arrival)}</div>
<div style={{ marginTop: 14 }}>
  <span className="co-price-sub">then £{kit.monthlyPrice}/mo</span>
</div>
<div className="co-price-refill">Charged {fmtDate(billing)} · Ships {fmtDate(refillShip)} · Arrives by {fmtDate(refillArrive)}</div>
<div className="co-price-day">That's £{perDay} a day</div>
```

- [ ] **Step 5: Verify visually in the browser**

```bash
cd web && npm run dev
```

Open `http://localhost:5173/checkout?kit=ritual`. The right panel should show:

```
£85  first box
Ships Mon 6 Apr · Arrives by Thu 9 Apr

then £48/mo
Charged 25 Apr · Ships 28 Apr · Arrives by 1 May

That's £1.60 a day
```

Dates will vary based on today's date — confirm the logic is correct by checking:
- Dispatch is a Monday
- Arrival is dispatch + 3 days
- If dispatch day ≤ 7: billing is 25th of same month; otherwise 25th of next month
- Refill ships 28th of billing month, arrives 1st of month after

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/CheckoutPage.jsx
git commit -m "feat: show exact ship and charge dates on checkout page"
```

---

## Task 3: Update the subscription section

**Files:**
- Modify: `web/src/components/SubscriptionSection.jsx`

- [ ] **Step 1: Update the footnote**

Find the `sub-footnote` div (around line 92):

```jsx
// FIND:
<div className="sub-footnote">
  First box is a one-time purchase. Subscription starts with your second delivery.
  Cancel any time — no penalty, no phone calls.
</div>
```

Replace with:

```jsx
<div className="sub-footnote">
  First box is a one-time purchase. Subscription starts with your second delivery.
  Cancel any time — no penalty, no phone calls.
  First box ships the next Monday after you order — refills are charged on the 25th and arrive by the 1st of each month.
</div>
```

- [ ] **Step 2: Verify visually in the browser**

The subscription section footnote (left blue border block) should now read both the cancellation copy and the shipping cadence as one paragraph.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/SubscriptionSection.jsx
git commit -m "feat: add shipping cadence to subscription section footnote"
```

---

## Task 4: Deploy edge function

> **STOP — ask the user before running this step.** Per project rules, edge function deployments require explicit approval.

- [ ] **Step 1: Ask user to approve deployment, then run:**

```bash
supabase functions deploy create-checkout-session --project-ref gvfptmjluxpngfjendbi
```

- [ ] **Step 2: Test end-to-end in Stripe test mode**

Go to `/checkout?kit=ritual`. Fill in the form and proceed to Stripe. Verify:
1. The first-box line item shows the description `"Ships Mon D MMM · Arrives by D MMM"`
2. Below the pay button, `custom_text` shows `"First refill charged D MMM · ships D MMM · arrives by D MMM"`
3. No "trial" language anywhere on the Stripe page
4. The subscription in Stripe dashboard shows `billing_cycle_anchor` set to the correct 25th date

- [ ] **Step 3: Commit any fixes found during testing**
