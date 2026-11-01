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

## Stock recovery analytics

Dashboard: https://eu.posthog.com/project/166881/dashboard/1075274

Production and DEV charts use explicit host filters. Browser event counts are
operational signals, not the authoritative lead count: blockers, ad blockers,
closed tabs and retries can affect them. Contact records remain in Supabase
`leads` after an explicit waitlist signup. This flow submits only name, email,
optional phone and the kit-specific source; it does not submit delivery addresses.
An existing waitlist record is acknowledged without creating another lead.

Events: `soldout_viewed` (once per kit per page mount), `soldout_detected`
(checkout blocked), `soldout_kit_switched`, `soldout_waitlist_attempted`,
`soldout_waitlist_saved`, `soldout_waitlist_failed`. Saved responses carry
`result=created|existing`. New events include environment and checkout flow.
Contact fields and raw error messages are excluded from these custom payloads.
Existing analytics identification/session-recording behaviour is unchanged.
New events begin on deployment; no historical backfill. Kit switches are not
purchases. The Data Catalog scope is unavailable through the current connector;
these charts are operational, not approved canonical metrics.

For manual analytics acceptance on dev, use a normal browser (automated browsers
suppress analytics), open sold-out GROUND, switch to RITUAL, then separately join
the GROUND waitlist. Confirm the events appear in the DEV charts and the lead in
Supabase. Repeating signup should produce `result=existing`, not another lead.

## Reservation rollout (dev only, 1 November 2026)

The next slice adds a **12-minute server-backed hold** when payment starts, for
both card and express checkout. Browsing/details alone do not reserve stock.
The browser displays the returned deadline; refresh does not extend it. Editing
buyer/delivery details first cancels the owned payment and releases its hold,
then keeps the form filled for the replacement attempt. On expiry, payment is
disabled and **Check availability again** starts recovery without deleting details.

The cleanup worker runs every minute. It returns stock only after Stripe confirms
cancellation/Checkout expiry; processing payments remain held. Direct card
payments requiring authentication get five additional minutes before cancellation.
The worker may release stock after the displayed countdown ends, because it must
first obtain a definitive Stripe result. Duplicate worker/webhook/refund delivery
cannot adjust the count twice. Full refunds arriving before order creation are
persisted and reconciled during finalisation. Hosted asynchronous payments only
fulfil when paid. Subscription creation uses durable payment-to-subscription links.

`CHECKOUT_RESERVATIONS_ENABLED` gates creation; cleanup and finalisation remain
active for existing holds even if the flag is turned off. Do not turn the flag off
as a complete oversell-safe rollback while held/payable resources exist. Production
rollout, capacity testing, preorder and physical-stock reconciliation remain deferred.

Current deployment: dev Amplify job **337**, commit `80b66df`, succeeded.
Reservations are enabled on dev. Both GROUND and RITUAL were already at 250
when this rollout was checked; no real-kit count was reset. The earlier GROUND=0
fixture described above is historical. Live-service smoke tests acquired and
released their own RITUAL holds, leaving it at 250.

Manual checks:
1. Use RITUAL on dev and `harsha@ecompilers.com`. Continue to payment and confirm
   **Your kit is reserved for 12:00** counts down. Refresh: timer must continue.
2. Select **Wrong? Edit** or **Back to delivery**. Details remain filled. Continuing
   creates a fresh payment after the old one is cancelled/released.
3. Let the timer expire without payment. Pay must be disabled. Select **Check
   availability again** and continue with the retained details.
4. Complete a separate dev test card payment. Confirm one order, one kit consumed,
   and customer/founder `[DEV]` confirmations. A successful payment must not be
   restocked when its original timer expires. A real Apple Pay device test is
   still required; automated browser tests do not authenticate a wallet.
5. The sold-out alternative/waitlist path is covered by the isolated automated
   tests. Both live dev kits are currently available. Waitlist contact fields
   remain name, email and optional phone.

Automated validation includes disposable database fixture kits (12 simultaneous
requests for one unit), duplicate reserve/release/finalisation/refund, full refund
before order creation, unique first-box payment and anon/authenticated permission
checks. Tests remove only their own fixture records and never reset real kit stock.
Run the isolated browser config; regular Playwright setup still resets dev stock.

New DB objects: `checkout_reservations`, `checkout_attempts`,
`checkout_full_refunds`, `checkout_subscription_links`; all service-role-only.
Attempts store a request hash, server timestamp and Stripe customer ID, not buyer
contact/address fields. Reservation rows store resource IDs, kit, state and deadline.
The operational stock dashboard remains a separate client event view, not the
reservation accounting ledger.

Deployment evidence: 220 frontend unit tests and build passed; 67 checkout,
reservation, refund/subscription helper, email and AWIN checks passed, plus five
wallet/shipping regression checks and five signed-webhook lifecycle checks. All 34 isolated desktop/mobile browser tests
passed against the deployed dev site. Actual dev Stripe test intents proved same
request reuse, wrong-secret rejection, idempotent release, stale-attempt rejection
and worker expiry. Actual hosted test sessions proved retry reuse and expiry.
No payment was confirmed by those smoke tests. A complete card order and physical
Apple Pay acceptance remain manual checks before any production promotion.
The 359 audited legacy unpaid test intents were cancelled before activation;
none was processing. The authenticated dev cleanup cron is active every minute.
