# P0 `/buy` Checkout E2E Coverage — Implementation Plan

> **For implementation:** work only in `web/e2e`; do not change `/checkout`.

**Goal:** make the CI suite verify a real successful one-time order and the
recovery UI for failed or cancelled payment redirects.

**Architecture:** reuse the existing browser helpers for checkout entry,
provide a narrowly-scoped Supabase service-role test helper, and poll the
webhook-created database state after the success redirect. Recovery checks
remain route-level UI tests.

### Task 1: Add an admin database test helper

**Files:**
- Create: `web/e2e/helpers/supabase-admin.ts`

1. Load the same local test environment files as global setup.
2. Create a non-persistent Supabase service-role client, accepting either
   `VITE_SUPABASE_URL` or `SUPABASE_URL`.
3. Fail clearly if the URL or service key is unavailable.

### Task 2: Promote the successful purchase smoke test

**Files:**
- Modify: `web/e2e/buy-flow.spec.ts`

1. Make form helpers return the generated email for later database correlation.
2. Replace the skipped purchase test with the full two-step flow, test card,
   terms acknowledgement, and success redirect checks.
3. Poll for the webhook-created order and assert its immutable purchase
   contract and the seeded inventory decrement.

### Task 3: Add payment recovery contracts

**Files:**
- Modify: `web/e2e/buy-flow.spec.ts`

1. Add direct `/success` coverage for `redirect_status=failed`.
2. Add direct `/success` coverage for `redirect_status=canceled`.
3. Assert each message and its `/buy?kit=ground&resume=1` retry target.

### Task 4: Verify

1. Run `npx playwright test --list` to type-check and collect the suite.
2. Run static checks and the unit suite available in `web`.
3. Run the browser flow through the in-app browser because this sandbox cannot
   launch Playwright's bundled Chromium; record that limitation explicitly.
4. Run `git diff --check` and inspect the diff, preserving unrelated edits.
