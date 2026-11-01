# Checkout Reservations Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Steps use checkboxes for tracking.

**Goal:** Real 12-minute checkout holds, safe automatic release and a truthful timer, on dev only.

**Architecture:** Postgres atomically binds a stock decrement to an unconfirmed Stripe resource before that resource is exposed. A worker cancels or expires unpaid resources before releasing holds; webhooks atomically consume holds for paid orders. Feature flag keeps rollout gated.

**Tech Stack:** Existing Supabase Postgres/Edge Functions, Stripe, React, Deno and Vitest/Playwright.

**Spec:** docs/superpowers/specs/2026-11-01-checkout-reservations-design.md

## Global Constraints
- Dev only; no production deployment or stock resets.
- Twelve-minute holds; five-minute authentication grace; processing never time-released.
- Name, email and optional phone for explicit waitlist; reservation rows contain no contacts.
- Preserve wallet shipping fix, affiliate attribution and order email behaviour.
- No preorders or physical inventory reconciliation.

## Review Focus
- Worker cancellation racing with successful payment must not release purchased stock.
- Lost API responses and retries must not double-decrement or double-release.
- Existing-order webhook replay must finish inventory accounting.
- Refresh, background tabs and authentication must not reset a timer or interrupt processing.
- All four payment entry points and pre-rollout payable resources must be covered at activation.

### Task 1: Atomic reservation state and inventory finalisation
**Files:** new supabase/migrations/20261101000001_checkout_reservations.sql; new supabase/tests/reservations-dev.mjs.
**Interfaces:** reserve_checkout_stock(kit,resource,kind) returns state and expires_at; settle_checkout_reservation(resource,outcome) atomically consumes/releases; finalise_checkout_inventory(order,resource) sets deduction flag without second decrement; restock_checkout_inventory(order) increments once. Service-role only.
- [x] Write failing SQL integration assertions for last-unit reserve, duplicate reserve, consume/release race, replay and refund using disposable fixture kits, never real kit counts.
- [x] Run against dev and observe missing RPC failure.
- [x] Implement table, constraints, indexes and RPCs; all state/count changes in a single transaction.
- [x] Apply only the new migration on dev; execute concurrency and role-permission tests; remove fixture rows.
- [x] Commit verified database slice.

### Task 2: Payment lifecycle and cleanup
**Files:** new supabase/functions/_shared/checkoutReservation.ts and test; four create payment/session endpoints; stripe-webhook; new checkout-reservation-worker/index.ts; config.toml.
**Interfaces:** reservePayment(db, resource, kind, kit) returns deadline or stock error; reconcileReservation(db,stripe,row) verifies Stripe before settlement; flag CHECKOUT_RESERVATIONS_ENABLED controls creation. Webhook accounting understands holds regardless of flag.
- [x] Write failing transport-controlled tests for canceled, succeeded, processing, requires_action grace, timeouts, session expiry and duplicate cleanup.
- [x] Implement helper, worker authentication and structured errors. Bind all four creation responses before exposing secret/URL, preserving existing read gate when feature disabled.
- [x] Integrate atomic order accounting on both existing/new orders; hosted subscription PI events must not duplicate session processing.
- [x] Run lifecycle and existing checkout/email/AWIN tests, then commit.

### Task 3: Timer and checkout recovery
**Files:** new web/src/lib/reservation.js and test; new reservation timer component; BuyPage, legacy checkout payment component, express checkout.
**Interfaces:** server reservation_expires_at; countdown uses absolute deadline; at expiry disable new confirmation and preserve details for retry; never reset on refresh.
- [x] Write failing tests for expiry, restoration, no-deadline compatibility and busy confirmation.
- [x] Implement concise accessible countdown, safe restart and stable retry request IDs.
- [x] Run unit suite, build and isolated desktop/mobile stock tests; commit.

### Task 4: Dev rollout and verification
**Files:** docs/dev-soldout-testing.md; deployment evidence.
- [x] Review whole change with a fresh reviewer and resolve important findings.
- [x] Deploy migration/webhook/worker/endpoints on dev with creation flag off; configure authenticated per-minute dev cleanup.
- [x] Audit pre-rollout dev unpaid resources and safely expire/cancel before activation, preserving succeeded/processing resources.
- [x] Enable dev reservation flag, deploy frontend from dev branch; exercise reserved unpaid test intents, cancellation/expiry and concurrency without changing real-kit baselines.
- [x] Confirm deployed jobs and document manual test steps plus measured limitations. Production remains unchanged.

Manual acceptance still required: complete a dev card order and an Apple Pay device payment before production promotion. No production deployment is included.
