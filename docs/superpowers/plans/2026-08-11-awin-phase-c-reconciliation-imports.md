# AWIN Phase C — Reconciliation Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import AWIN transactions, publishers, and daily performance into server-only tables and reconcile every transaction to exactly one canonical SOLUM order.

**Architecture:** A read-only AWIN API client uses OAuth Bearer authentication and a shared conservative rate limiter. An authenticated scheduled Edge Function fetches bounded windows, normalises monetary values to pence, upserts immutable network identifiers, and runs database reconciliation views keyed by Stripe PaymentIntent `orderRef`.

**Tech Stack:** Supabase/PostgreSQL, Deno Edge Functions, AWIN advertiser APIs, OAuth Bearer token, pg_cron/pg_net, Deno tests and SQL linting.

## Global Constraints

- Advertiser ID is exactly `129171`.
- Reporting APIs use `Authorization: Bearer <AWIN_API_TOKEN>`.
- Never put `accessToken` in the query string even where legacy documentation permits it.
- Shared request ceiling is 18 calls per minute, below AWIN's 20 calls/minute/user limit.
- Transaction fetch windows are at most 31 days and use `timezone=UTC`.
- SOLUM `orders.amount_pence` is the revenue authority; AWIN sale value is a comparison field.
- Money is stored as integer pence and currency as an uppercase ISO code.
- One AWIN transaction ID is one row; one SOLUM order is counted once regardless of provider duplicates.
- API tokens and raw provider bodies are never persisted or logged.
- Network fee is nullable and must remain unavailable—not zero—when AWIN omits it.
- Imports are read-only against AWIN; no transaction validation or publisher mutation API is called.
- Production backfill and scheduling require explicit deployment approval and use read-only AWIN endpoints only.

---

### Task 1: Create transaction, performance, and sync-run storage

**Files:**
- Create: `supabase/migrations/20260811000004_awin_reconciliation.sql`
- Create: `supabase/functions/_shared/awinMoney.ts`
- Create: `supabase/functions/_shared/awinMoney.test.ts`

**Interfaces:**
- Produces tables `awin_transactions`, `awin_publisher_performance_daily`, and `awin_sync_runs`.
- Produces `decimalToPence(value, currency): number | null` and `normalizeAwinStatus(value): 'pending' | 'approved' | 'declined' | 'deleted' | 'unknown'`.

- [ ] **Step 1: Write failing money/status tests**

```ts
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { decimalToPence, normalizeAwinStatus } from './awinMoney.ts'

Deno.test('converts AWIN decimal values to integer pence', () => {
  assertEquals(decimalToPence(85, 'GBP'), 8500)
  assertEquals(decimalToPence('12.34', 'gbp'), 1234)
  assertEquals(decimalToPence(null, 'GBP'), null)
  assertThrows(() => decimalToPence('12.345', 'GBP'))
})

Deno.test('normalizes transaction statuses without guessing', () => {
  assertEquals(normalizeAwinStatus('approved'), 'approved')
  assertEquals(normalizeAwinStatus('confirmed'), 'approved')
  assertEquals(normalizeAwinStatus('unexpected'), 'unknown')
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinMoney.test.ts`

Expected: FAIL because `awinMoney.ts` does not exist.

- [ ] **Step 3: Implement strict money and status normalisation**

Parse only finite numbers or strings matching `/^-?\d+(\.\d{1,2})?$/`. Use string splitting rather than floating-point multiplication for storage conversion. Return `null` only for absent optional values.

- [ ] **Step 4: Create the server-only reconciliation tables**

`awin_transactions` includes:

```sql
awin_transaction_id text primary key,
order_ref text,
order_id uuid references public.orders(id) on delete set null,
publisher_id bigint references public.awin_publishers(publisher_id) on delete set null,
transaction_date timestamptz not null,
click_date timestamptz,
status text not null check (status in ('pending','approved','declined','deleted','unknown')),
sale_amount_pence integer not null,
commission_pence integer not null,
network_fee_pence integer,
currency text not null check (currency ~ '^[A-Z]{3}$'),
commission_group text,
click_reference text,
raw_hash text not null,
first_seen_at timestamptz not null default now(),
last_synced_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

`awin_publisher_performance_daily` has unique `(performance_date, publisher_id, currency)` and integer fields for impressions, clicks, pending/confirmed/declined/bonus counts, values, and commissions. `network_fee_pence` is nullable.

`awin_sync_runs` stores `sync_type`, date range, cursor JSON, counts, API call count, outcome, sanitised error code, timestamps, and a `metadata jsonb` object that must not contain tokens or raw responses.

Enable RLS on all three tables; revoke all from `public`, `anon`, and `authenticated`; grant only `service_role`.

- [ ] **Step 5: Verify the schema**

Run:

```bash
deno test supabase/functions/_shared/awinMoney.test.ts
supabase db lint --linked
supabase db push --dry-run
```

Expected: tests pass; dry run adds only the new tables/indexes/grants.

- [ ] **Step 6: Commit import storage**

```bash
git add supabase/migrations/20260811000004_awin_reconciliation.sql supabase/functions/_shared/awinMoney.ts supabase/functions/_shared/awinMoney.test.ts
git commit -m "feat: add AWIN reconciliation storage"
```

---

### Task 2: Build the read-only AWIN advertiser API client

**Files:**
- Create: `supabase/functions/_shared/awinReportingApi.ts`
- Create: `supabase/functions/_shared/awinReportingApi.test.ts`

**Interfaces:**
- Produces `createAwinReportingClient({ token, fetchImpl, clock, wait }): AwinReportingClient`.
- Client methods: `getAccounts()`, `getPublishers()`, `getTransactions(query)`, and `getPublisherPerformance(query)`.
- Produces `RateGate` enforcing at most 18 starts in any rolling 60-second period.

Before enabling sync, call `GET https://api.awin.com/accounts` with the Bearer token and require advertiser account `129171` in the response. Then call a one-day publisher-performance query. If either returns `401` or `403`, record `AWIN_REPORTING_API_UNAVAILABLE` in the sync run and stop Phase C; do not substitute scraped UI data or invent financial metrics. Resolve account/API entitlement with AWIN before continuing.

- [ ] **Step 1: Write failing URL/auth/rate tests**

```ts
Deno.test('uses bearer auth and excludes token query parameters', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const client = createAwinReportingClient({
    token: 'secret-token',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
    clock: () => 0,
    wait: async () => {},
  })
  await client.getPublishers()
  assertEquals(calls[0].url, 'https://api.awin.com/advertisers/129171/publishers')
  assertEquals(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer secret-token')
  assertEquals(calls[0].url.includes('accessToken'), false)
})

Deno.test('verifies advertiser account access without mutating AWIN', async () => {
  const client = fixtureClient({ accounts: [{ accountId: 129171, accountType: 'advertiser' }] })
  const accounts = await client.getAccounts()
  assertEquals(accounts.some((account) => account.accountId === 129171 && account.accountType === 'advertiser'), true)
})

Deno.test('rejects transaction windows over 31 days', async () => {
  const client = fixtureClient()
  await assertRejects(() => client.getTransactions({
    start: '2026-01-01T00:00:00Z', end: '2026-02-02T00:00:00Z', dateType: 'transaction',
  }))
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinReportingApi.test.ts`

Expected: FAIL because the API client is missing.

- [ ] **Step 3: Implement exact endpoint builders**

Use:

```text
GET https://api.awin.com/advertisers/129171/publishers
GET https://api.awin.com/accounts
GET https://api.awin.com/advertisers/129171/transactions/?startDate=<ISO>&endDate=<ISO>&dateType=<transaction|validation|amendment>&timezone=UTC&showBasketProducts=false
GET https://api.awin.com/advertisers/129171/reports/publisher?startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>&dateType=transaction&timezone=UTC
```

Set `Accept: application/json`, a 10-second timeout, and `Authorization: Bearer ${token}`. Parse JSON only when content type is JSON. Map `401/403` to `AUTH_FAILED`, `429` to `RATE_LIMITED`, `5xx` to `PROVIDER_5XX`, and schema/JSON failures to `INVALID_PROVIDER_RESPONSE`.

- [ ] **Step 4: Implement the conservative shared rate gate**

Before each fetch, remove timestamps older than 60 seconds. If 18 timestamps remain, wait until the oldest is 60 seconds old plus 50 ms. Inject `clock` and `wait` so tests use virtual time.

- [ ] **Step 5: Verify the API client**

Run: `deno test supabase/functions/_shared/awinReportingApi.test.ts`

Expected: all endpoint, auth, timeout, window, and rate tests pass.

- [ ] **Step 6: Commit the API client**

```bash
git add supabase/functions/_shared/awinReportingApi.ts supabase/functions/_shared/awinReportingApi.test.ts
git commit -m "feat: add read-only AWIN reporting client"
```

---

### Task 3: Normalise AWIN publishers, transactions, and performance rows

**Files:**
- Create: `supabase/functions/_shared/awinImport.ts`
- Create: `supabase/functions/_shared/awinImport.test.ts`
- Create: `supabase/functions/_shared/fixtures/awin-transactions.json`
- Create: `supabase/functions/_shared/fixtures/awin-performance.json`
- Create: `supabase/functions/_shared/fixtures/awin-publishers.json`

**Interfaces:**
- Produces `normalizePublisher(raw): AwinPublisherUpsert`.
- Produces `normalizeTransaction(raw): AwinTransactionUpsert`.
- Produces `normalizePublisherPerformance(raw, date): AwinPerformanceUpsert`.
- Produces `stableRawHash(value): Promise<string>` using sorted JSON keys and SHA-256.

- [ ] **Step 1: Write failing fixture-normalisation tests**

```ts
Deno.test('normalizes an AWIN transaction to pence and stable IDs', async () => {
  const row = await normalizeTransaction({
    id: 999,
    orderRef: 'pi_123',
    publisherId: 77,
    transactionDate: '2026-08-10T12:00:00Z',
    status: 'approved',
    saleAmount: { amount: 85, currency: 'GBP' },
    commissionAmount: { amount: 4.25, currency: 'GBP' },
    networkFee: { amount: 1.28, currency: 'GBP' },
    commissionGroupCode: 'NEW',
  })
  assertEquals(row.awin_transaction_id, '999')
  assertEquals(row.sale_amount_pence, 8500)
  assertEquals(row.commission_pence, 425)
  assertEquals(row.network_fee_pence, 128)
})

Deno.test('keeps omitted network fee null', async () => {
  const row = await normalizeTransaction(transactionWithoutNetworkFee)
  assertEquals(row.network_fee_pence, null)
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinImport.test.ts`

Expected: FAIL because the import module is missing.

- [ ] **Step 3: Implement strict normalisers**

The normalisers require identity, date, status, value, commission, and currency fields. Quarantine rather than partially insert rows missing required data. Publisher import maps `id`, `name`, `primaryRegion`, and `primaryType`; it sets Skimlinks category/protection through `awinPublisherPolicy.ts` and preserves existing manual category/exception fields on upsert.

Publisher performance maps the official fields exactly: `impressions`, `clicks`, `pendingNo`, `pendingValue`, `pendingComm`, `confirmedNo`, `confirmedValue`, `confirmedComm`, `bonusNo`, `bonusValue`, `bonusComm`, `declinedNo`, `declinedValue`, `declinedComm`, `totalNo`, `totalValue`, `totalComm`, and `tags`.

- [ ] **Step 4: Verify fixture coverage and no sensitive persistence**

Run:

```bash
deno test supabase/functions/_shared/awinImport.test.ts supabase/functions/_shared/awinMoney.test.ts
rg -n 'accessToken|Authorization|Bearer|AWIN_API_TOKEN' supabase/functions/_shared/fixtures
```

Expected: tests pass; fixture secret scan returns no matches.

- [ ] **Step 5: Commit normalisers and fixtures**

```bash
git add supabase/functions/_shared/awinImport.ts supabase/functions/_shared/awinImport.test.ts supabase/functions/_shared/fixtures/awin-transactions.json supabase/functions/_shared/fixtures/awin-performance.json supabase/functions/_shared/fixtures/awin-publishers.json
git commit -m "feat: normalize AWIN reporting data"
```

---

### Task 4: Implement deterministic order reconciliation

**Files:**
- Modify: `supabase/migrations/20260811000004_awin_reconciliation.sql`
- Create: `supabase/functions/_shared/awinReconciliation.ts`
- Create: `supabase/functions/_shared/awinReconciliation.test.ts`

**Interfaces:**
- Produces state `matched | value_mismatch | awin_only | solum_only | duplicate_order_ref | currency_mismatch | awaiting_network`.
- Produces SQL view `awin_order_reconciliation_v` with one row per SOLUM order plus unmatched AWIN rows.
- Produces `classifyReconciliation(input): ReconciliationState`.

- [ ] **Step 1: Write failing reconciliation-state tests**

```ts
Deno.test('classifies exact and duplicate matches without multiplying revenue', () => {
  assertEquals(classifyReconciliation({ order: { amountPence: 8500, currency: 'GBP' }, transactions: [{ amountPence: 8500, currency: 'GBP' }], ageMinutes: 10 }), 'matched')
  assertEquals(classifyReconciliation({ order: { amountPence: 8500, currency: 'GBP' }, transactions: [{ amountPence: 8500, currency: 'GBP' }, { amountPence: 8500, currency: 'GBP' }], ageMinutes: 10 }), 'duplicate_order_ref')
})

Deno.test('uses the ingestion grace period before solum_only', () => {
  assertEquals(classifyReconciliation({ order: { amountPence: 8500, currency: 'GBP' }, transactions: [], ageMinutes: 2 }), 'awaiting_network')
  assertEquals(classifyReconciliation({ order: { amountPence: 8500, currency: 'GBP' }, transactions: [], ageMinutes: 31 }), 'solum_only')
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinReconciliation.test.ts`

Expected: FAIL because the reconciliation module is missing.

- [ ] **Step 3: Implement classification with a 30-minute grace period**

Use exact GBP pence comparison in Phase C. The function checks, in order: AWIN-only, duplicate order reference, awaiting grace, SOLUM-only, currency mismatch, value mismatch, then matched.

- [ ] **Step 4: Implement the SQL view and safe order join**

Join `awin_transactions.order_ref = orders.stripe_payment_id`. Aggregate AWIN rows per `order_ref` before joining. The view exposes `awin_transaction_count`, `awin_transaction_ids`, actual commission/fee totals, and `reconciliation_state`; `gross_revenue_pence` comes from one `orders.amount_pence` value regardless of transaction count.

Do not grant the view to `anon` or `authenticated`.

- [ ] **Step 5: Verify SQL and logic**

Run:

```bash
deno test supabase/functions/_shared/awinReconciliation.test.ts
supabase db lint --linked
supabase db push --dry-run
```

Expected: tests pass and the migration remains additive.

- [ ] **Step 6: Commit reconciliation logic**

```bash
git add supabase/migrations/20260811000004_awin_reconciliation.sql supabase/functions/_shared/awinReconciliation.ts supabase/functions/_shared/awinReconciliation.test.ts
git commit -m "feat: reconcile AWIN transactions to orders"
```

---

### Task 5: Build the authenticated AWIN sync function

**Files:**
- Create: `supabase/functions/awin-sync/index.ts`
- Create: `supabase/functions/awin-sync/config.toml`
- Create: `supabase/functions/_shared/awinSync.ts`
- Create: `supabase/functions/_shared/awinSync.test.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Function consumes `AWIN_API_TOKEN` and `AWIN_SYNC_SECRET`.
- Request body: `{ mode: 'publishers' | 'transactions' | 'performance' | 'reconcile'; start?: string; end?: string; date_type?: 'transaction' | 'validation' | 'amendment' }`.
- Response contains counts and run ID only.

- [ ] **Step 1: Write failing orchestration tests**

```ts
Deno.test('transaction sync upserts rows and completes the run', async () => {
  const result = await runAwinSync({
    request: { mode: 'transactions', start: '2026-08-10T00:00:00Z', end: '2026-08-10T23:59:59Z', date_type: 'transaction' },
    api: fixtureApi({ transactions: [transactionFixture] }),
    store: fixtureStore(),
  })
  assertEquals(result.outcome, 'succeeded')
  assertEquals(result.rows_read, 1)
  assertEquals(result.rows_upserted, 1)
})

Deno.test('invalid windows fail before an API call', async () => {
  await assertRejects(() => runAwinSync({
    request: { mode: 'transactions', start: '2026-01-01T00:00:00Z', end: '2026-02-02T00:00:00Z', date_type: 'transaction' },
    api: fixtureApi(), store: fixtureStore(),
  }))
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinSync.test.ts`

Expected: FAIL because the sync module is missing.

- [ ] **Step 3: Implement run lifecycle and upserts**

Create `awin_sync_runs` row as `running`; process and upsert batches of 500; update counts after each batch; set `succeeded` with `completed_at` or `failed` with a sanitised error code. A failed page does not advance cursor metadata. Publisher upserts preserve manual policy fields. Transaction upserts preserve `first_seen_at` and update mutable AWIN status/value/commission fields.

- [ ] **Step 4: Implement the Edge Function boundary**

Require exact `Authorization: Bearer <AWIN_SYNC_SECRET>` with constant-time comparison. Reject browser CORS. Default windows:

- `transactions`: current UTC day minus 2 days through now, `date_type=transaction`;
- `performance`: previous complete UTC day;
- `publishers`: no dates;
- `reconcile`: database-only link refresh.

Set `verify_jwt = false` only for the dedicated secret boundary.

- [ ] **Step 5: Verify function tests and log safety**

Run:

```bash
deno test supabase/functions/_shared/awinReportingApi.test.ts supabase/functions/_shared/awinImport.test.ts supabase/functions/_shared/awinReconciliation.test.ts supabase/functions/_shared/awinSync.test.ts
rg -n 'console\.(log|error).*token|console\.(log|error).*response|accessToken=' supabase/functions/awin-sync supabase/functions/_shared
```

Expected: tests pass and unsafe-log scan returns no matches.

- [ ] **Step 6: Commit the sync function**

```bash
git add supabase/functions/awin-sync supabase/functions/_shared/awinSync.ts supabase/functions/_shared/awinSync.test.ts supabase/config.toml
git commit -m "feat: sync AWIN reporting data"
```

---

### Task 6: Schedule bounded syncs and perform a development backfill

**Files:**
- Create: `docs/awin-sync-runbook.md`
- Create: `scripts/awin/verify-sync.mjs`
- Create: `scripts/awin/verify-sync.test.mjs`
- Modify: `docs/manual-changes-log.md`

**Interfaces:**
- Produces read-only health verifier for sync-run summaries.
- Schedules: transactions every 30 minutes, publishers daily, performance daily, and validation/amendment reconciliation nightly.

- [ ] **Step 1: Write the failing health-verifier tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { assessSyncHealth } from './verify-sync.mjs'

test('flags stale transaction sync', () => {
  const health = assessSyncHealth({ now: '2026-08-11T12:00:00Z', lastTransactions: '2026-08-11T09:00:00Z', lastPerformance: '2026-08-10T06:00:00Z' })
  assert.equal(health.transactions, 'stale')
  assert.equal(health.performance, 'healthy')
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test scripts/awin/verify-sync.test.mjs`

Expected: FAIL because the verifier is missing.

- [ ] **Step 3: Implement health thresholds**

Mark transactions stale after 2 hours and daily performance stale after 36 hours. Return structured status only; do not fetch or print transaction rows.

- [ ] **Step 4: Document exact schedules**

The runbook defines:

```text
*/30 * * * *  transactions (now minus 2 days through now)
15 02 * * *   publishers
30 02 * * *   performance (previous complete UTC day)
00 03 * * *   validation (previous 31 days)
30 03 * * *   amendment (previous 31 days)
```

Use Supabase Scheduled Edge Functions/pg_cron with `AWIN_SYNC_SECRET` stored in Vault, not embedded in migration SQL or source control. The runbook includes commands to list, disable, and remove each named job.

- [ ] **Step 5: Backfill development in 31-day chunks**

Start with publishers, then transactions from programme start to now using non-overlapping UTC chunks, then the last 31 days of validation and amendment, then daily performance. After each chunk, verify the sync run succeeded before advancing. Re-running a completed chunk must leave row counts stable.

- [ ] **Step 6: Verify Phase C**

Run:

```bash
node --test scripts/awin/verify-sync.test.mjs
deno test supabase/functions/_shared/awinMoney.test.ts supabase/functions/_shared/awinReportingApi.test.ts supabase/functions/_shared/awinImport.test.ts supabase/functions/_shared/awinReconciliation.test.ts supabase/functions/_shared/awinSync.test.ts
supabase db lint --linked
git diff --check
```

Expected: all commands exit 0. Production remains untouched until separately approved.

- [ ] **Step 7: Commit the sync runbook**

```bash
git add docs/awin-sync-runbook.md scripts/awin/verify-sync.mjs scripts/awin/verify-sync.test.mjs docs/manual-changes-log.md
git commit -m "docs: add AWIN sync operations"
```
