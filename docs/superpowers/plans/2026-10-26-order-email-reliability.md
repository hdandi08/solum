# Order Email Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live first-box confirmation and founder emails observable, retry-safe, and independent of an optional customer email.

**Architecture:** Persist one delivery status for each of the two order-created emails on `orders`. The Stripe webhook calls a shared coordinator that only sends unrecorded messages and records each accepted provider response. Resend HTTP failures escape to Stripe for retry, while stable provider idempotency keys prevent duplicate sends during retries.

**Tech Stack:** Supabase Postgres migrations, Supabase Edge Functions (Deno/TypeScript), Stripe webhooks, Resend HTTP API, Deno tests.

**Spec:** `docs/superpowers/specs/2026-10-26-order-email-reliability-design.md`

## Global Constraints

- Stripe test-mode purchases must not send customer, founder, AWIN, or analytics side effects.
- Live customer confirmation sender remains `SOLUM <no-reply@orders.bysolum.co.uk>`.
- Live founder notification recipient remains `harsha@bysolum.com`.
- Do not expose secret values in source, logs, commits, or test output.
- Development is deployed and verified before production.

## Review Focus

- A customer email is absent: founder notification still sends while customer confirmation remains pending.
- Customer confirmation succeeds and founder notification fails: replay sends only the founder notification.
- Resend returns a non-2xx response: the webhook returns a failure for Stripe retry.
- A webhook replay sees an existing order: it resumes pending messages instead of returning early.
- Repeated delivery attempts carry a deterministic but distinct Resend idempotency key per message role.

### Task 1: Persist and coordinate first-box order emails

**Files:**
- Create: `supabase/migrations/20261026000001_order_email_delivery_state.sql`
- Create: `supabase/functions/_shared/orderEmailDelivery.ts`
- Create: `supabase/functions/_shared/orderEmailDelivery.test.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`

**Interfaces:**
- Produces `deliverOrderEmailNotifications(input)` for the webhook.
- Produces persisted `orders.customer_confirmation_email_sent_at` and `orders.admin_notification_email_sent_at` status fields.

- [ ] **Step 1: Write failing coordinator tests**

Cover the missing customer-email, partial-failure/replay, and already-sent cases using an in-memory delivery state.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `deno test --no-check supabase/functions/_shared/orderEmailDelivery.test.ts`

Expected: FAIL because the coordinator module does not exist.

- [ ] **Step 3: Implement the minimal shared coordinator and delivery-state migration**

The coordinator sends the customer message only when an email is available, always sends the founder message when pending, and records each result only after the sender resolves.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `deno test --no-check supabase/functions/_shared/orderEmailDelivery.test.ts`

Expected: PASS.

### Task 2: Make Resend responses actionable in every live first-box route

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`
- Test: `supabase/functions/_shared/orderEmailDelivery.test.ts`

**Interfaces:**
- Consumes: `deliverOrderEmailNotifications(input)` from Task 1.
- Produces: live webhook failures when Resend rejects a required message, enabling Stripe retry.

- [ ] **Step 1: Write a failing provider-response test**

Prove a rejected Resend response does not become a sent delivery record.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `deno test --no-check supabase/functions/_shared/orderEmailDelivery.test.ts`

Expected: FAIL because the rejected-response behavior is not implemented.

- [ ] **Step 3: Wire the coordinator into each live first-box handler**

Validate Resend responses, use deterministic customer and founder idempotency keys, persist the returned Resend IDs, and resume delivery for existing orders. Keep test-mode guards unchanged.

- [ ] **Step 4: Run focused and related tests**

Run: `deno test --no-check supabase/functions/_shared/orderEmailDelivery.test.ts supabase/functions/_shared/purchaseSafety.test.ts`

Expected: PASS.

### Task 3: Verify and roll out safely

**Files:**
- Modify: none expected

- [ ] **Step 1: Run the full project verification commands**

Run the repository's Supabase Deno test suite and the web build; inspect the final diff.

- [ ] **Step 2: Apply migration and deploy `stripe-webhook` to development**

Verify the deployment reports active status and the delivery-state schema is present.

- [ ] **Step 3: Apply the same migration and deploy `stripe-webhook` to production**

Only after development verification; confirm active deployment status and report the live test procedure.
