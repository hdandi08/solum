# E2E Checkout Safety and Card-Only Flow Design

**Date:** 2026-07-30
**Status:** Approved for implementation planning
**Scope:** SOLUM Playwright safety, worktree configuration, checkout payment methods, analytics isolation, test-data cleanup, and the real development checkout test

## Context

SOLUM has two Playwright suites:

- `web/e2e`, which is the suite run by `buildspec.yml` and includes the current `/buy` checkout coverage.
- `tests/e2e`, an older repository-level suite that can still be run independently.

The `web/e2e` suite passes from the main checkout when its ignored `.env.test` and `.env.local` files are present. An isolated Git worktree does not inherit those files, so Vite can start without the Supabase anonymous key and render a blank application. That produces many misleading selector timeouts rather than one configuration error.

The complete Stripe purchase test is currently skipped because Stripe Link/OneLink interferes with the controlled terms checkbox in headless Chromium. The customer-facing `/buy` page also presents a separate `ExpressCheckoutElement` for Apple Pay, Google Pay, Link and PayPal before the normal details form.

E2E execution must never target production. Development E2E traffic must also avoid polluting marketing analytics, sending customer or admin messages, or leaving test orders in the development database.

## Goals

1. Make the Playwright environment deterministic in the main checkout and isolated Git worktrees.
2. Make both Playwright suites fail before any browser, web server or database mutation if the target is not the exact development environment.
3. Make `/buy` card-only by removing express wallets and configuring Stripe PaymentIntents for card payments only.
4. Restore the complete Stripe test-card checkout test against the development environment.
5. Prevent automated browser traffic and Stripe test-mode payments from reaching analytics, advertising or messaging systems.
6. Remove development E2E records and restore inventory after every normal test run, including runs with test failures.

## Non-Goals

- No E2E, smoke or synthetic browser execution against `bysolum.co.uk`.
- No live Stripe payment testing.
- No production Supabase reads or writes.
- No mocking of the complete purchase path; the restored checkout test must exercise Stripe test mode, the development webhook and the development database.
- No reintroduction of Apple Pay, Google Pay, Link, PayPal or another express method in this change.
- No changes to product pricing, delivery pricing, order attribution or Awin commission rules.

## Safety Invariants

These requirements are non-negotiable and fail closed:

1. `E2E_TARGET` must equal `dev`.
2. The browser origin must be one of:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `https://dev.d3pa095gzazg3c.amplifyapp.com`
3. The Supabase origin must equal:
   - `https://rodvvmfzkyjsqbufkjbc.supabase.co`
4. Any other website or Supabase origin is rejected, including SOLUM production.
5. A local Vite-backed run must have a Stripe publishable key beginning with `pk_test_`.
6. The checkout E2E must assert that the created PaymentIntent reports `livemode: false` before entering card details.
7. Safety errors may name the rejected variable or origin but must never print service-role keys, Stripe keys, client secrets or other secret values.
8. The guard must run while Playwright configuration is evaluated, before `webServer` or `globalSetup`.
9. The mutating global setup must invoke the same guard again immediately before it seeds or deletes development data.
10. Production rejection is tested with pure unit tests and fail-fast configuration checks. Verification must never make a request to a production service.

## Architecture

### 1. Shared target-safety guard

A dependency-free repository module will own the exact allowlist and validation rules. Both Playwright configurations will call it:

- `web/playwright.config.ts`
- `tests/e2e/playwright.config.ts`

The interface accepts an explicit object rather than reading global state internally, so unit tests can cover development, local, missing and production cases without changing the process environment:

```ts
assertSafeE2ETarget({
  target,
  baseURL,
  supabaseURL,
  stripePublishableKey,
  localServer,
});
```

The function returns normalized safe origins or throws an actionable error. It never performs network access.

### 2. Worktree environment discovery

The web Playwright configuration must load environment values before defining `webServer`.

Precedence, from highest to lowest:

1. Existing process variables, including CodeBuild SSM injection.
2. `.env.test` and `.env.local` in the current `web` checkout.
3. Missing values only from `.env.test` and `.env.local` in the main Git worktree.

The main worktree is derived from `git rev-parse --path-format=absolute --git-common-dir`; no secret file is copied, symlinked, committed or logged. Failure to discover the main worktree is allowed only when all required values already exist in the process or current checkout.

`web/.env.test.example` will document `E2E_TARGET=dev`. `buildspec.yml` will provide the same non-secret marker explicitly while continuing to read the development URL and service-role key from the existing `/solum/test/*` parameters.

The global setup will consume the already validated environment. It will retain its defense-in-depth validation before creating the development Supabase admin client.

### 3. Card-only `/buy` checkout

The customer path becomes:

```text
Kit selection → Details → Delivery → Stripe card payment → Success
```

The following are removed from `BuyPage`:

- `ExpressCheckoutElement`
- Apple Pay, Google Pay, Link and PayPal availability and event handling
- The express skeleton, consent and “or pay by card” separator
- The express-specific in-app-browser blocking gate
- Wallet-specific checkout messaging that would no longer be true
- Express-only state and analytics events

The details form is rendered directly for all supported browsers. The normal `PaymentElement`, terms checkbox and existing success handling remain.

`create-first-box-payment-intent` will create PaymentIntents with:

```ts
payment_method_types: ['card']
```

Its non-secret response will include `livemode: pi.livemode` so the E2E can prove it received a Stripe test-mode intent before entering payment details. The browser does not use that field for normal customer behavior.

### 4. Analytics and messaging isolation

Browser analytics must be disabled when `navigator.webdriver === true`. The disabled state applies to:

- PostHog initialization, capture and identification
- Meta browser pixel and CAPI relay helpers
- TikTok browser helpers
- Google Ads conversion helpers
- The early-hit beacon and delayed advertising scripts in `web/index.html`
- The Awin MasterTag

The Awin MasterTag is currently an unconditional script tag. It will be replaced
with a small loader that runs only for the exact SOLUM production hostname and
only when `navigator.webdriver !== true`. Development and automated browsers
must not request the MasterTag.

Normal browsers retain current behavior.

The Stripe webhook must treat `livemode === false` as a core-data-only purchase:

- It may create development customers, orders, addresses and inventory events required by the E2E.
- It must not send customer confirmation emails.
- It must not send admin order notifications.
- It must not send Meta CAPI, TikTok Events API, PostHog purchase or Awin conversion events.

Awin already fails closed for non-live PaymentIntents; the centralized side-effect gate makes the same rule explicit for the remaining integrations and messaging paths. The guard applies to PaymentIntent and Checkout Session purchase branches so another test-mode path cannot bypass it.

### 5. Development data lifecycle

Development data operations will be shared by setup and teardown:

- Before the suite: remove prior `e2e+` leads, customers and orders, then set GROUND and RITUAL inventory to 250.
- After the suite: remove `e2e+` leads, customers and orders again, then restore both inventories to 250.

Playwright `globalTeardown` performs the post-run cleanup after passing or failing tests. A process kill can prevent teardown, so the next run’s setup remains a recovery mechanism.

Stripe retains the transaction in its test-mode dashboard. Test and live Stripe data are separated by Stripe and no live payment is created.

## Real Checkout E2E

The currently skipped test will be enabled and remain development-only. It will:

1. Open `/buy?kit=ground`.
2. Complete Details and Delivery.
3. Capture the `create-first-box-payment-intent` response.
4. Assert `livemode === false`.
5. Assert the checkout presents card payment without the removed express checkout.
6. Enter Stripe test card `4242 4242 4242 4242`.
7. Accept Terms and Privacy.
8. Submit the payment and wait for `/success`.
9. Assert the success URL identifies GROUND, `first_batch` and a PaymentIntent reference.
10. Poll the development database for the paid first-box order.
11. Assert the development customer, amount, source, status and inventory deduction.
12. Allow global teardown to delete the E2E records and restore inventory.

The test keeps its extended timeout because Stripe webhook delivery is asynchronous. It must not be replaced with a mocked payment response.

## Error Handling

- Missing worktree env values: fail during Playwright configuration with the missing variable names and setup instructions.
- Rejected origin or target: fail during configuration with “E2E production/unknown target blocked.”
- Non-test local Stripe key: fail during configuration before Vite starts.
- Live PaymentIntent returned to the checkout test: stop before card entry or payment submission.
- Setup or teardown database failure: fail with the operation name and Supabase error message, without credentials.
- Stripe or webhook timeout: preserve Playwright trace, screenshot and video for diagnosis; teardown still attempts cleanup.

## Testing Strategy

### Unit and fail-fast tests

- Development Amplify + development Supabase + `E2E_TARGET=dev` passes.
- Localhost + development Supabase + `pk_test_` passes.
- `bysolum.co.uk` is rejected.
- An unknown Amplify host is rejected.
- The production Supabase project is rejected.
- Missing `E2E_TARGET` is rejected.
- A local `pk_live_` key is rejected.
- The external-side-effect helper returns false for test mode and true for live mode.
- Automated browser analytics detection returns disabled for WebDriver and enabled for a normal browser.
- Development and WebDriver page loads do not request PostHog, Meta, TikTok, Google Ads or Awin scripts.

### Integration verification

1. Run unit tests and server-side pure tests.
2. Run the complete `web/e2e` suite in the configured main checkout.
3. Confirm the real checkout test is passed, not skipped.
4. Create a disposable Git worktree with no `.env.test` or `.env.local`.
5. Run the complete `web/e2e` suite there and prove main-worktree env discovery works.
6. Run a configuration-only command with a production base URL and confirm it exits before a browser, server or global setup starts.
7. Run the production build.
8. Confirm the working tree contains no Playwright reports, screenshots, videos or test-result changes.

## Rollout

This work is committed to `dev` only. It is not deployed to production as part of implementation or verification. The development E2E environment remains:

- Site: `https://dev.d3pa095gzazg3c.amplifyapp.com`
- Supabase project: `rodvvmfzkyjsqbufkjbc`
- Stripe: test mode only

Production remains outside the E2E allowlist and has no override flag.
