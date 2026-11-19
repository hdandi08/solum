# Multiple-kit checkout implementation plan

> **For agentic workers:** Implement the approved dev-only phase with test-driven changes. Use the parallel-agent workflow for the isolated frontend and Edge Function scopes; the primary agent owns SQL, integration and release. Do not edit another worker's owned files.

**Goal:** Allow 1–5 GROUND/RITUAL kits in one dev checkout, one payment and one address, retaining a simple default one-kit experience.

**Architecture:** Optional inline quantities submit a canonical items array to the existing first-box endpoint. Multi-kit requests use an immutable database attempt, an atomic quantity reservation and one paid-order transaction that creates order lines and one pending fulfillment unit per physical kit. Single-kit and subscription paths remain compatible. Admin fulfillment is guarded and deferred.

**Stack:** Existing React/Vite, Stripe PaymentIntents, Supabase Edge Functions and Postgres. No basket service or new provider.

**Spec:** artefacts/2026-11-19-multiple-kits-design.md (approved in conversation, including the one-parcel-per-kit and admin-later follow-ups).

## Global constraints

- Dev only: Supabase rodvvmfzkyjsqbufkjbc and Amplify dev. No master push, production function/migration/secret/admin deployment, or shared Amplify routing changes.
- One delivery address; each physical kit is a separate parcel; current £65/£85 unit pricing and free UK delivery.
- At most five kits total; server rejects invalid quantities, unsupported kit types and price tampering. Duplicate kit entries normalize before the limit is enforced.
- Default one-kit UI stays familiar. Reveal editing only behind Add another kit. No discounts or subscription changes.
- No real carrier labels, production tests, or unsolicited external messages. Test provider behavior through mocks/dev fixtures.
- Preserve attribution, express/card flows, retry/expiry protection and both buy-page entry experiences.

## Interfaces and ownership

### Browser contract (frontend worker owns web/ only)

- Requests retain legacy kit_id and add items only when total quantity >1: `items: [{kit_id:'ground',quantity:1},{kit_id:'ritual',quantity:2}]`, sorted by kit_id. No client prices are authoritative.
- Multi-kit success response extends existing payInfo with `checkout_flow:'multi_kit_v1'`, `order_items:[{kit_id,quantity,unit_amount_pence,line_amount_pence}]`, `total_quantity`, canonical `amount_pence`, existing reservation timestamps and client_secret.
- Backend metadata uses `checkout_flow:'multi_kit_v1'` and `multi_kit_attempt_id`. Every caller retains existing source/UTM/campaign/affiliate fields.
- Frontend feature gate is `VITE_MULTI_KIT_CHECKOUT_ENABLED==='true'` AND the exact DEV Supabase URL AND a test Stripe publishable key. Local preview can use this only with the dev backend. No query parameter can enable it on production.
- A pure web/src/lib/kitOrder.js module owns normalization, quantities, totals, display labels and persisted checkout selection. Extend payment receipt/redirect recovery so the complete item list survives and its total matches Stripe's verified amount.

### Database contract (primary worker owns migrations and DB integration tests)

Migration: supabase/migrations/20261119000001_multi_kit_checkout.sql.

- `checkout_multi_attempts`: id UUID, request_key unique, stripe_customer_id, immutable canonical items JSONB, total_quantity, amount_pence, created_at, stripe_payment_id unique nullable. Service-role-only RLS.
- `orders`: add checkout_version nullable, kit_quantity default 1, shipping_address JSONB nullable, currency default gbp. Multi-kit rows have checkout_version=multi_kit_v1 and kit_id NULL.
- `order_items`: order_id, kit_id, quantity, unit_amount_pence, line_amount_pence, refunded_quantity default 0; unique(order_id,kit_id). Service-role-only RLS. Kit references permit isolated fixture kits; only preparation accepts real GROUND/RITUAL inputs.
- `order_fulfillment_units`: id, order_id, order_item_id, kit_id, unit_number, status pending/cancelled, unique(order_item_id,unit_number). No carrier labels yet. Service-role-only RLS.
- `checkout_reservations`: allow kit_id NULL for new multi-kit rows and add items_snapshot JSONB. Legacy rows keep existing behavior.
- RPC `prepare_multi_kit_attempt(p_request_key text,p_items jsonb,p_stripe_customer_id text)` returns `{id,items,total_quantity,amount_pence,created_at,stripe_customer_id}`. Normalize/validate real kit IDs, integer counts, fixed prices; immutable request-key binding rejects different snapshots.
- RPC `reserve_multi_kit_stock(p_attempt_id uuid,p_resource_id text)` binds one Stripe resource to its attempt and atomically reserves every requested kit quantity. Return `{state,expires_at}` or `{state:'sold_out',kit_id,available_count}`. Replays return the original reservation and cannot acquire a new hold after release.
- Replace `settle_checkout_reservation(text,text)` with quantity-aware settlement for items_snapshot, preserving legacy single-kit branches and consumed/released terminal semantics.
- RPC `finalise_multi_kit_order(p_attempt_id uuid,p_payment_id text,p_customer_id uuid,p_amount_pence integer,p_address jsonb,p_source text)` verifies snapshot/held-or-consumed reservation and performs one transaction for order, immutable address, item rows, fulfillment units, reservation consumption and summed component stock/ledger deductions. Return `{id,created_at,customer_id,items,total_quantity,amount_pence,shipping_address}`. Replays return the same order; fail mismatched money/resource/customer bindings. Require a valid GB shipping address.
- Extend `restock_checkout_inventory(uuid)` for unshipped multi-kit full refunds: exact quantity restoration once, component ledger restoration where previously deducted, cancelled units and refunded item quantities. Preserve legacy behavior; reconcile the existing checkout_full_refunds marker when it precedes order creation.
- Add a database guard preventing legacy parent-order dispatch/tracking/label updates on multi-kit orders while fulfillment is deferred.
- Locks use deterministic kit/product ordering and the existing payment/refund advisory-lock namespace. All security-definer functions set empty search_path and grant execution only to service_role.

### Edge Functions (backend worker owns supabase/functions/ and Deno tests)

- Backend enabling requires `MULTI_KIT_CHECKOUT_ENABLED=true`, reservations enabled, exact DEV Supabase URL and a test Stripe secret. All requests with an items field are validated; multi-kit requests fail closed if disabled. Valid quantity-one requests can use the legacy route.
- `_shared/multiKitOrder.ts`: canonical item validation, dev feature guard, RPC wrappers, amount/address verification and multi-kit email display helpers. Preserve the RPC signatures above.
- First-box endpoint prepares an immutable attempt before creating a Stripe PaymentIntent, using a request fingerprint/idempotency key, then reserves stock before exposing its secret. Retry preserves the original Stripe customer/resource binding. Cancel unexposed failed resources, retaining unknown-outcome holds for reconciliation.
- Existing cleanup/release logic settles multi-item reservations through the quantity-aware RPC. Do not expose secret values in diagnostics.
- Paid webhook recognizes the multi-kit flow before the legacy kit_id filter. Resolve the trusted attempt, verify paid GBP amount and customer binding, then call finalise_multi_kit_order. Preserve the existing payment-event claim, attribution and email retry paths. One confirmation lists all order lines; one conversion reports the total and quantities. Do not masquerade mixed orders as an invented kit SKU.
- Guard create-sendcloud-parcel before any provider call for all orders with kit_quantity>1, even two of the same kit. Manual dispatch is guarded by SQL. Legacy sendcloud-webhook callbacks skip such orders rather than repeatedly mutating/failing them.
- Cancellation/full-refund processing uses quantity-aware restoration; never restock dispatched units just because a refund arrived.

## Review focus

1. Concurrency and atomic rollback when one requested kit is unavailable.
2. An edited or replayed attempt must never expose a payable stale total or re-acquire released stock.
3. One Stripe success/repeated webhook produces one order, exact lines and N pending parcels.
4. Express, card, refresh and redirect recovery must use the same quantities and verified total.
5. Legacy admin/carrier paths cannot accidentally fulfill a multi-kit order, and production feature gates stay off.

## Task 1 — establish backend and browser contracts

- [ ] Add failing tests for canonical input, duplicate normalization, max five, integer validation and real fixed prices; include 2 RITUAL + 1 GROUND = 23500p.
- [ ] Implement the isolated web model and backend validation helper, following the interfaces above.
- [ ] Verify invalid/unknown/fractional/negative/over-limit inputs, disabled-production requests and quantity-one compatibility.

## Task 2 — atomic persistence and reservations (primary)

- [x] Write DB integration fixtures that use unique synthetic kit/customer/product IDs and remove only their own records. No real kit count reset.
- [x] Implement the migration/RPCs. Test insufficient-stock rollback, concurrent last units, immutable attempts, resource mismatch, retry/release/paid ordering, product ledger and full-refund races.
- [x] Test RLS and manual fulfillment guards. Verify migration prerequisites on dev before applying; keep all live operations dev scoped.

## Task 3 — payment, webhook and fulfillment boundary (backend worker)

- [x] Extend mocked endpoint/webhook tests before implementing first-box multi-kit creation, replay and paid finalization.
- [x] Implement Stripe idempotency, reservation/release compatibility, full item confirmations and quantity-aware conversion events.
- [x] Add mocked tests for label rejection before carrier calls and ignored legacy callbacks.
- [x] Run relevant Deno tests, type checks and existing first-box/reservation/webhook/attribution regressions. No real emails/labels.

## Task 4 — inline checkout and receipt (frontend worker)

- [ ] Add tests for editor state, stock/limit constraints, cancel/apply behavior and preserved one-kit layout.
- [ ] Implement Add another kit, inline controls, grouped confirmation, totals, separate-parcel note, and all mobile/desktop/IAB displays.
- [ ] Carry items through card/express creation, retry/redirect storage, success view and single-purchase analytics. Freeze edits while payment is processing and safely retire old attempts before quantity changes.
- [ ] Run unit/build checks and targeted browser tests of both kit types and entry experiences. Preserve existing tracking and checkout fields.

## Task 5 — integration, independent review and dev release (primary)

- [ ] Integrate worker changes; inspect diffs and run full frontend + relevant backend/DB suites.
- [ ] Review multi-kit side effects with a fresh reviewer; fix important findings and re-run relevant checks.
- [ ] Deploy only dev migrations/functions/flags, with verified DEV/test configuration and protected worker reconciliation. Keep real labels/messages out of acceptance.
- [ ] Test multi-kit dev order creation with isolated fixtures and cleanup; verify single-kit compatibility and disabled fulfillment guards.
- [ ] Commit and push dev only. Report the dev URL, meaningful validation and the deferred admin boundary. Do not merge/push master.

## Execution ledger

- 19 Nov 2026: resumed at the user's request. Approved design and scope read; existing codex/buy-paid-traffic-dev checkout selected. Production/master remains outside scope.
- Ruling: maintain the existing sellable kit inventory authority; component stock is quantity-aware bookkeeping, not a new storefront availability policy.
- Ruling: request/response item fields and RPC names above form the integration contract for disjoint workers. Avoid a new shared cross-runtime package; server price validation is authoritative.
- Ruling: stale component counters cannot veto a paid order whose sellable kit stock was reserved. order_component_allocations records required, actually deducted and shortfall quantities; inventory_transactions records actual movements. Unshipped refunds restore only quantities actually deducted, so a shortage cannot invent stock. The order exposes inventory_reconciliation_required for the later admin phase.
- Dev prerequisite check: reservations, attempts and full-refund tables are present; checkout-reservation-worker-dev is active every minute. The CLI's linked ref is production, so all database work uses an explicit rodvvmfzkyjsqbufkjbc management transport.
- Database RED: prepare_multi_kit_attempt did not exist before the new migration. GREEN in a rollback-only dev transaction: canonical totals, immutable attempts, all-or-nothing quantities, paid replay, three parcel units, address immutability, audited manual dispatch rejection, refund-before-order, worker ordering, component shortfalls and role permissions.
- Applied migration 20261119000001 to DEV only, recorded in Supabase migration history. The same transactional suite passed on the committed schema; 12 concurrent fixture buyers correctly produced one winner for the last mixed units, and concurrent retry/release/consumption tests passed. Existing legacy reservation concurrency/refund/expiry/permission tests also pass. Fixture rows were removed; no real kit count reset.
- Backend regression: fresh 217 tests pass; backend worker also typechecked first-box, Stripe webhook, carrier label/callback, reservation worker and release endpoints. Provider transports mocked.
- Independent review found an Important own-held-stock frontend issue: public availability excludes the buyer's existing hold. The frontend worker reproduced red and fixed refresh-after-release and wallet-to-card retirement ordering, with browser regressions. Warm-entry state preservation is also being tested.
- Ruling: the success view retains the existing no-buyer-PII receipt-storage pattern; the full immutable shipping address appears in the server confirmation email, while the success view explains the one-address/separate-parcel order. This avoids adding address data to the browser's payment receipt cache.
- Final review: no remaining Critical/Important findings. Own-held inventory, warm entry state, stale alternative-kit query and flag-off DEV recovery are fixed and covered by browser regressions; production saved-multi recovery remains blocked.
- Final verification: frontend 332 unit tests, 32 desktop/mobile mocked checkout scenarios, four flag-off/prod guard scenarios; backend 217 tests; actual DEV-environment build prerenders 25 pages. Affected code lint/typechecks and git diff --check pass.
- Deployed four Edge Functions to the explicit DEV project; invalid live DEV requests fail before provider/stock actions. Enabled backend and Amplify dev-only preview flags. Frontend Git release remains the last step; production/master is unchanged.
