# Multiple-kit DEV release

## Scope and operation

The kit card supports 1–5 GROUND/RITUAL kits, one payment, one address and free UK delivery. Visible quantity buttons sit directly below the price, followed by an outlined Add GROUND/RITUAL button. Repeated quantities retain the product photo; mixed orders expose quantity buttons on each line. Each physical kit creates a separate pending fulfillment unit. Single-kit checkout remains compatible. Admin fulfillment is intentionally deferred: label creation, manual dispatch and legacy carrier callbacks cannot mark a multi-kit order fulfilled.

Targets are explicitly DEV: Supabase rodvvmfzkyjsqbufkjbc; Amplify app d3pa095gzazg3c, branch dev, region eu-west-2. The local CLI remains linked to production and must not be used with implicit --linked database commands. No master push, production function/secret/migration/admin deployment or shared Amplify-rule change is part of this release.

## Applied backend changes

- Migration 20261119000001 recorded in DEV history. Immutable checkout attempts, quantity reservations, order lines, shipping snapshots, per-kit fulfillment units, component allocations and audited fulfillment guards are present.
- Deployed DEV functions: create-first-box-payment-intent, stripe-webhook, create-sendcloud-parcel, sendcloud-webhook. Existing worker/release endpoints already settle through the quantity-aware database function.
- Existing checkout-reservation-worker-dev cron is active every minute and remains in place.
- Backend MULTI_KIT_CHECKOUT_ENABLED is enabled on DEV. It also requires reservations enabled, exact DEV project URL and test Stripe credentials. Already-paid dev multi resources can finalize even if creation is subsequently disabled.
- Frontend VITE_MULTI_KIT_CHECKOUT_ENABLED is enabled on the dev branch only, preserving all other environment variables. Its gate additionally requires the exact DEV URL and test publishable key. Saved dev payment recovery remains safe if new multi checkout is switched off; production recovery is blocked.

## Validation

- Frontend: 332 unit tests across 45 files; actual dev-configured build passes with all 25 public pages prerendered; scoped ESLint and whitespace checks pass.
- Browser: 38 mocked desktop/mobile scenarios plus four flag-disabled DEV/production-rejection scenarios pass. These cover card/wallet, both entry experiences, repeated/mixed quantities, totals, stock limits, preserved details, storage/redirect recovery, busy-state controls, unavailable alternatives and safe retirement. The visible controls are checked at 320px, including direct edits after wallet holds and rejection while a payment is processing.
- Backend: 217 tests pass; affected handlers and worker/release paths typecheck. Provider transports are mocked.
- Database: rollback-only transaction suite passes before and after migration. Separate isolated concurrency fixtures prove one winner across 12 requests for the last mixed units, deterministic locks, exact-once replay/release and consumed-stock protection. Legacy reservation concurrency, refunds, expiry and permissions still pass. No real kit stock reset or provider label was used; fixture records were cleaned up.
- Deployed DEV endpoint, with feature still off at that point, returned expected 409 for disabled requests and 400 for over-limit, unknown-kit and client-price inputs before any provider resource or hold was created.
- A separate read-only code review found no remaining Critical/Important issues after fixes for own-held-stock availability, wallet-to-card fallback, stale URL items, warm entry history and flag-off recovery. Address display is in the confirmation email; browser receipt storage retains its existing no-buyer-PII pattern.

No live paid checkout, real carrier label or unsolicited external message was used for acceptance. The provider completion paths are covered by mocks, and real database transaction behavior by DEV fixtures.

## Disable new multi-kit checkout if needed

1. Disable backend creation only, explicitly on DEV:
   `supabase secrets set MULTI_KIT_CHECKOUT_ENABLED=false --project-ref rodvvmfzkyjsqbufkjbc --profile supabase`
2. Disable the dev frontend build flag with `node scripts/multi-kit/configure-dev-preview.mjs --disable`, then rebuild/deploy dev. This preserves other branch variables and never touches master.
3. Keep Stripe webhook handling, the reservation cleanup worker and the schema in place for already-issued resources. Do not manually return held stock, delete paid orders or drop the migration to roll back the UI.

Existing dev attempts recover their recorded totals even when creation is disabled. A processing or completed payment refuses retirement; a successfully cancelled old multi attempt can return to a single-kit checkout. Cleanup releases quantities only after Stripe confirms an unpayable resource.

## Next phase

Admin must display and fulfill each parcel unit, print/retry individual labels, handle partial dispatch/delivery and support explicit per-kit return/refund actions before any production rollout is considered. Production remains on the existing single-kit release.
