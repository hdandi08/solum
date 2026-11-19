# Multiple-kit production rollout

User authorized migration and production publication on 19 November 2026, with the admin parcel interface deferred.

## Database and checkout backend

Production target is explicitly Supabase gvfptmjluxpngfjendbi. Applied the three prerequisite reservation migrations (20261101000001–3) and multi-kit migration 20261119000001 in one transaction, with migration history recorded. Existing first-box payment references had no duplicates. No inventory reset was performed.

The database persists the immutable checkout attempt, reservation snapshot, paid order, kit quantities and prices, delivery address, Stripe reference, component allocations/shortfalls and one pending fulfillment unit per physical kit. New tables reject anonymous access. A database trigger plus admin/parcel/carrier guards block unsupported multi-kit dispatch.

Deployed checkout creation endpoints, stripe-webhook, create-sendcloud-parcel, sendcloud-webhook, release-checkout-reservation and checkout-reservation-worker. Public/protected function authentication settings were verified. Production pairs the exact project with live Stripe credentials/resources; DEV pairs its exact project with test credentials/resources. Already-issued payments remain processable when new multi-kit creation is disabled.

CHECKOUT_RESERVATIONS_ENABLED and MULTI_KIT_CHECKOUT_ENABLED are enabled on production. A dedicated worker credential is held in Vault and the Edge environment, never in source control. Exactly one checkout-reservation-worker-prod minute schedule is active. Authenticated worker health returned zero failures; scheduled runs succeeded.

Pre-activation read-only Stripe audit found 18 unpaid intents (8 RITUAL, 10 GROUND), all awaiting a payment method, and no hosted sessions. They were adopted into normal 12-minute holds under the same advisory lock used by payment finalization. An already-accounted paid order cannot be deducted again. A second audit/adoption after enabling backend reservations found the same 18 resources. Available counts changed from RITUAL 187/GROUND 69 to 179/59 solely for these holds; normal cleanup returns unpaid stock only after confirming cancellation. No verification charge or direct cancellation was made. The adoption script fails closed on hosted sessions and insufficient stock.

## Storefront and verification

Storefront target is Amplify d3pa095gzazg3c master, AWS account 798470762256, eu-west-2. The production frontend flag is enabled at branch level, preserving existing branch settings and inherited live production configuration. Promote the verified source to dev and master and confirm Amplify success before declaring the storefront live.

- Frontend: 333 unit tests, build with 25 prerendered pages, scoped lint and whitespace checks.
- Production-mode mocked browsers: 38 desktop/mobile cases, including card/wallet, quantities, mixed orders, stock limits, safe edits, 320px layout and refresh recovery.
- Flag-disabled recovery: six DEV, production and unrecognized-environment cases.
- Backend: 84 checkout/reservation/webhook/email/fulfillment tests plus two read-only production audit tests; affected handlers typecheck.
- Independent review found no Critical/Important blockers after closing the pre-activation unpaid-resource window.
- Live production negative probes reject over-limit, unknown-kit and client-priced requests before a payment resource or multi-kit attempt is created.

No live charge, carrier label or unsolicited verification email is part of acceptance. Admin must still gain per-parcel display, labels, dispatch/tracking and partial return/refund support.

## Disable new multiple-kit orders

Set MULTI_KIT_CHECKOUT_ENABLED=false explicitly on production, run scripts/multi-kit/configure-prod-checkout.mjs --disable, then rebuild master. Leave reservations, schema, webhook, release endpoint and cleanup worker in place for existing attempts and paid orders. Do not manually restore stock or delete paid records.
