# Checkout stock handling: dev acceptance

## Scope of this first slice

Payment creation checks kit stock on the server. Zero stock returns `409 sold_out`;
missing/invalid inventory or a database failure returns `503 inventory_unavailable`.
Both cases stop before Stripe customer/payment creation. The four checkout creation
endpoints use the same gate, including the legacy subscription endpoints.

The buy page refreshes availability when details are submitted and handles a later
sold-out response while entering payment. Wallet checkout closes its payment sheet
and uses the same sold-out flow. If another kit is available, checkout offers it
with its price and the product difference. Switching rechecks stock, preserves
buyer details, clears previous payment retry state and returns to details to review
the new kit. Wallet customers start a fresh payment for the newly selected kit.
Waitlist signup is optional and only starts after the customer clicks to join.
Waitlist confirmation requires a successful save
or an explicit existing-signup response. Failed signup offers retry and email
correction. Dev waitlist emails have a `[DEV]` subject prefix.

This is **not an inventory reservation system**. Two payable intents can still
compete for the last kit, and intents issued before stock runs out remain payable.
No stock is held or released by this change. Preorders, capacity/load tests,
physical-stock reconciliation and production rollout remain deferred.

## Manual dev test

Use https://dev.d3pa095gzazg3c.amplifyapp.com and `harsha@ecompilers.com` as
the customer email. Do not create a customer with the founder's bysolum address.
Use only Stripe test cards; Apple Pay must be checked on a supported physical device.

The initial dev snapshot on 1 November 2026 was GROUND 250 and RITUAL 250.
For manual acceptance, GROUND is temporarily set to zero on **dev only**, leaving
RITUAL available. Production counts are not changed.

1. Open `/buy?kit=ground`. Expect a RITUAL alternative with £85 one-time pricing.
   Enter details and continue: expect Sold Out, the same alternative and an
   optional GROUND waitlist. No signup or payment should happen automatically.
   Select **Switch to RITUAL · £85**: details must remain filled, the URL and
   selected kit must change to RITUAL, and its checkout must continue normally.
2. Return to sold-out GROUND and explicitly choose **Notify me when GROUND returns**.
   Expect a saved signup. Repeat with the same email. Expect the existing signup to be acknowledged,
   without another waitlist email.
3. Open `/buy?kit=ritual`. Expect normal details, delivery, and payment steps.
   Use Stripe's test card `4242 4242 4242 4242`, a future expiry and any CVC to
   manually complete the dev order. Verify its order confirmation and `[DEV]`
   customer/founder emails. This exercise creates a test order and can decrement
   dev RITUAL stock.
4. On a supported device, try Apple Pay for the sold-out GROUND kit. Expect the
   wallet to report unavailability, followed by the RITUAL alternative and optional
   GROUND waitlist. Switching must show the £85 RITUAL price and start a fresh
   wallet payment; no automatic payment or signup may happen.
5. Optionally block `join-waitlist` in browser developer tools and repeat GROUND.
   Expect a failure message, never “You're on the list”. Unblock and select
   **Try again**. **Change email** must return to editable details.

To restore GROUND after manual testing, use the **SolumDB-DEV** SQL editor
(project `rodvvmfzkyjsqbufkjbc`) after confirming no concurrent stock edits:

```sql
update public.kit_inventory
set available_count = 250, updated_at = now()
where kit_id = 'ground' and available_count = 0
returning kit_id, available_count;
```

Do not reset RITUAL to 250 after placing test orders without checking its current
state. No live inventory reconciliation is included here.

## Automated checks

```sh
npm --prefix web run test:unit
npm --prefix web run build
deno test --no-check --allow-env --allow-read --allow-net supabase/tests/checkout-stock.test.ts supabase/tests/waitlist.test.ts
cd web
npx playwright test --config playwright.stock.config.ts
```

Start Vite on port 4174 with dev public configuration first. Set `STOCK_TEST_URL`
to the dev site URL to run the browser suite against the deployed frontend.
Browser tests intercept checkout, waitlist and DNS requests, cover desktop and
mobile, and never create orders or send emails. Endpoint tests execute real
handlers with controlled database/Stripe/DNS/email transports.

The regular Playwright config is deliberately not used: its global setup and
teardown reset dev inventory and test data. The isolated stock suite does neither.

The next slice is atomic reservations, safe Stripe cancellation before release,
idempotent finalisation and concurrent last-kit/expiry tests. A read gate alone
must not be described as protection against overselling.
