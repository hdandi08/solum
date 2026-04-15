# Address Capture + Customer Portal — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Shipping address capture via Stripe, separate `addresses` table, custom `/account` portal with Supabase Auth magic link.

---

## 1. Overview

Two connected features:
1. **Address capture** — collect shipping address at Stripe Checkout (required), store in Supabase via webhook.
2. **Customer portal** — `/account` route on bysolum.co.uk. Magic link login. Customer can view subscription, update address, cancel.

---

## 2. Implementation Order

The following order is mandatory — later steps depend on earlier ones:

1. Create `customers`, `subscriptions`, `orders`, `events` migrations (the webhook already references these tables; they don't exist yet)
2. Create `addresses` migration
3. Update `create-checkout-session` Edge Function (add `shipping_address_collection`)
4. Update `stripe-webhook` Edge Function (extract + store address)
5. Create `update-address` Edge Function
6. Create `cancel-subscription` Edge Function
7. Build `AccountPage.jsx` + add route

---

## 3. Address Capture

### Stripe Checkout Session
Add `shipping_address_collection` to the `create-checkout-session` Edge Function:

```ts
shipping_address_collection: {
  allowed_countries: ['GB'],
},
```

Stripe enforces the address before payment completes. No UI changes to the pre-Stripe checkout form.

### Webhook — `checkout.session.completed`
Extend existing handler to extract shipping details after the `customers` row is created.

**Null guard is required:** `session.shipping_details` may be null for sessions created before this change was deployed. If null, log a warning and skip the address insert — do not throw.

```ts
const sd = session.shipping_details;
if (sd) {
  // insert into addresses
} else {
  console.warn('No shipping_details on session', session.id);
}
```

Fields to extract when present:
- `sd.name`
- `sd.address.line1`
- `sd.address.line2`
- `sd.address.city`
- `sd.address.postal_code`
- `sd.address.country`

**Idempotency:** Before inserting, check whether an address row already exists for this `customer_id` sourced from this `stripe_session_id`. If a row exists, skip the insert. (Add `stripe_session_id text` column to `addresses` for this check.)

### Address Updates (Portal)
When customer updates address via portal:
1. Set all existing `addresses` rows for that customer to `is_current = false`
2. Insert new row with `is_current = true`
3. Call `stripe.customers.update({ shipping: { address, name } })` to keep Stripe in sync

### No address on file
If a customer has no address row (purchased before this feature was added), Panel 2 shows "No shipping address on file — please add one." The update form works identically (there are no existing rows to flip to `is_current = false`).

---

## 4. Database Schema

### Migration 1: Core tables (must run first)

`customers`, `subscriptions`, `orders`, `events` — these are already referenced in the existing webhook handler but their migrations were never created. Create them now. Schema matches what the webhook code expects (inferred from handler).

Add one extra column to `customers`: `supabase_user_id uuid` (nullable, populated on first portal login — see Section 5).

### Migration 2: `addresses` table

```sql
CREATE TABLE addresses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stripe_session_id text,
  name              text NOT NULL,
  line1             text NOT NULL,
  line2             text,
  city              text NOT NULL,
  postcode          text NOT NULL,
  country           text NOT NULL DEFAULT 'GB',
  is_current        boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON addresses (customer_id, is_current);
CREATE UNIQUE INDEX ON addresses (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
```

The unique index on `stripe_session_id` ensures idempotent webhook inserts.

---

## 5. Customer Portal — Auth

### Technology
Supabase Auth, email OTP (magic link). No passwords.

### Supabase Dashboard Config (manual, done by Harsha)
- **Authentication → URL Configuration**
- Site URL: `https://bysolum.co.uk`
- Redirect URLs: add `https://bysolum.co.uk/account`
- Email template (Authentication → Email Templates → Magic Link): customise copy to SOLUM brand

### Identity Bridge: `supabase_user_id` on `customers`
Supabase Auth users (`auth.users`) are separate from `customers`. We link them via `customers.supabase_user_id`:

- On first portal login (after magic link is clicked), `onAuthStateChange` fires with the session
- We look up the customer by `email` from the JWT claims
- We write `auth.user.id` into `customers.supabase_user_id` for that customer (one-time operation)
- All subsequent Edge Function calls resolve `customer_id` via `supabase_user_id` from the JWT — not by email

This means Edge Functions always do:
```ts
const userId = jwt.sub; // Supabase auth user UUID
const { data: customer } = await supabase
  .from('customers')
  .select('id, stripe_customer_id')
  .eq('supabase_user_id', userId)
  .single();
```

### Login Flow
1. Customer visits `/account`
2. `supabase.auth.getSession()` on mount — if session exists, go to dashboard
3. No session → show login form
4. Customer enters email → we check `customers` table for that email
5. Not found → "No account found for this email"
6. Found → call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://bysolum.co.uk/account' } })`
7. Show "Check your email — we've sent you a login link"
8. Customer clicks link → lands on `/account` → Supabase processes token from URL hash
9. `onAuthStateChange` fires → session established
10. Look up customer by email → write `supabase_user_id` if not already set → render dashboard

### Session Management
- `supabase.auth.getSession()` on mount restores session
- Sign out button calls `supabase.auth.signOut()`

---

## 6. Customer Portal — UI

### Route
`/account` — added to `App.jsx` router.

### Page States
- **Loading** — checking session on mount (brief, no flash)
- **Unauthenticated** — login form
- **Authenticated** — dashboard

### Login Form
- Email input
- "Send login link" button
- Post-submit: confirmation message state
- SOLUM brand styling (matches CheckoutPage)

### Dashboard
Three panels, stacked vertically:

**Panel 1 — Subscription**
- Kit name (GROUND / RITUAL / SOVEREIGN)
- Status badge: ACTIVE / CANCELLING / CANCELLED / PAUSED / PAST DUE
- `PAST DUE` shown in red with message: "Your last payment failed — please update your payment method"
- Next billing date (from `subscriptions.current_period_end`)
- Months active
- Read-only

**Panel 2 — Shipping Address**
- If address exists: display current address (`WHERE is_current = true`)
- If no address: "No shipping address on file — please add one"
- "Update address" / "Add address" button → expands inline form
- Form fields: Name, Line 1, Line 2 (optional), City, Postcode
- Country: shown as "United Kingdom" label, not editable
- Save → calls `update-address` Edge Function → UI updates inline

**Panel 3 — Cancel Subscription**
- Only shown if status is ACTIVE or CANCELLING
- If CANCELLING: show "Your subscription is set to cancel on [date]. No further boxes will be sent."
- If ACTIVE: "Cancel subscription" button → confirmation step:
  > "Your subscription will remain active until [date]. After that, no further boxes will be sent."
- "Yes, cancel" → calls `cancel-subscription` Edge Function → panel updates to CANCELLING state
- "Keep my subscription" → dismisses confirmation

---

## 7. New Edge Functions

### `update-address`
- Auth-gated: validate Supabase JWT, resolve `customer_id` via `supabase_user_id`
- Body: `{ name, line1, line2, city, postcode }`
- Set all existing `addresses` rows `is_current = false` for that customer (safe even if zero rows exist)
- Insert new `addresses` row with `is_current = true`
- Call `stripe.customers.update({ shipping: { name, address: { line1, line2, city, postal_code: postcode, country: 'GB' } } })`
- Return updated address row

### `cancel-subscription`
- Auth-gated: validate Supabase JWT, resolve `customer_id` via `supabase_user_id`
- Look up subscription: `WHERE customer_id = x AND status = 'active'`
- Call `stripe.subscriptions.update(stripe_subscription_id, { cancel_at_period_end: true })`
- Read `subscription.current_period_end` from the Stripe response (Unix timestamp → ISO string)
- Update `subscriptions.status = 'cancelling'` in Supabase
- Return `{ cancel_at: <ISO string> }`

---

## 8. Files to Create / Modify

| File | Action |
|------|--------|
| `supabase/migrations/20260322000000_create_core_tables.sql` | Create — customers (+ supabase_user_id), subscriptions, orders, events |
| `supabase/migrations/20260322000001_create_addresses.sql` | Create |
| `supabase/functions/create-checkout-session/index.ts` | Add `shipping_address_collection` |
| `supabase/functions/stripe-webhook/index.ts` | Extract + store address on `checkout.session.completed` (with null guard + idempotency) |
| `supabase/functions/update-address/index.ts` | Create |
| `supabase/functions/cancel-subscription/index.ts` | Create |
| `web/src/pages/AccountPage.jsx` | Create — login form + dashboard |
| `web/src/App.jsx` | Add `/account` route |

---

## 9. Out of Scope

- Pause subscription
- Update payment method (Stripe Customer Portal if needed later)
- Multiple shipping addresses
- Non-GB addresses
- Email notifications on address change or cancellation
