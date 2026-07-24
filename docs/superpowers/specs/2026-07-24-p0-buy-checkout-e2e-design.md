# P0 `/buy` Checkout E2E Coverage — Design

> Created 2026-07-24. Scope: the CI-run Playwright suite in `web/e2e`.

## Goal

Exercise the active one-time `/buy` checkout through Stripe test mode, then
verify the customer-facing success page and the durable order effects created
by the Stripe webhook. Cover payment recovery without creating a charge.

## Decisions

- Preserve the GROUND test-card purchase (Stripe's `4242 4242 4242 4242`) as
  a documented skipped test while Stripe Link/Onelink is enabled in the test
  account; re-enable it once that external configuration is changed.
- Poll Supabase with the service-role client until the webhook creates the
  order; do not use arbitrary sleeps.
- Assert the paid order's payment-intent reference, `ground` kit,
  `first_box` type, £65 amount, and `first_batch` source; assert kit inventory
  becomes 249 after global setup seeds it to 250.
- Test `failed` and `canceled` redirect statuses directly on `/success`,
  including their retry URL. These are deterministic UI contracts and do not
  create Stripe objects.

## Out of Scope

- Wallet, Link, 3DS, and in-app-browser payment variants.
- Legacy `/checkout` tests and account-flow consolidation.
- Decline-card Stripe confirmation; the application redirects failures from
  `confirmPayment` rather than relying on a supplied redirect URL.

## Safety

- When re-enabled, the happy-path test is DEV-only and uses Stripe test mode;
  it creates no real charge. `global-setup.ts` clears `e2e+` test orders and
  resets kit inventory at the next test run.
