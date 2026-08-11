# AWIN Phase D — Secure Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated AWIN performance and reconciliation area to the existing secure SOLUM admin application.

**Architecture:** Server-only reporting views encode financial definitions and one-order-one-revenue semantics. A dedicated `admin-awin` Edge Function applies admin role/MFA/origin checks and returns a strict presentation contract; React validates that contract and renders summary, publisher, commission-group, reconciliation, and health views.

**Tech Stack:** PostgreSQL views, Supabase Edge Functions/Deno, React 19, Vite, Vitest, existing SOLUM admin auth and manual Amplify deployment.

## Global Constraints

- The dashboard is hosted only in the isolated admin application.
- Reuse `authorizeAdminRequest`, the admin response envelope, admin origins, role checks, and AAL2/MFA requirements.
- Browser code never queries AWIN tables or AWIN APIs directly.
- Browser responses exclude raw `awc`, customer email, API tokens, provider bodies, and full Stripe metadata.
- Stripe/SOLUM orders are gross-revenue and refund authorities.
- AWIN transaction data supplies status, actual commission, and network fee.
- Each `order_id` contributes gross revenue at most once.
- Pending, approved, declined, deleted, and unavailable values remain distinguishable.
- Missing network fee is displayed as unavailable, never `£0.00`.
- Skimlinks rows show a protected-retain marker.
- All filters are server-applied and validated.
- Production verification is read-only; never place orders or mutate AWIN from the dashboard.

---

### Task 1: Create server-only AWIN reporting views

**Files:**
- Create: `supabase/migrations/20260811000005_awin_admin_reporting.sql`
- Create: `supabase/functions/_shared/awinReporting.ts`
- Create: `supabase/functions/_shared/awinReporting.test.ts`

**Interfaces:**
- Produces views `admin_awin_order_reconciliation_v`, `admin_awin_publisher_daily_v`, `admin_awin_commission_group_daily_v`, and `admin_awin_data_quality_v`.
- Produces `calculatePublisherMetrics(input): PublisherMetrics` for unit-verified formulas mirrored by SQL.

- [ ] **Step 1: Write failing formula tests**

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { calculatePublisherMetrics } from './awinReporting.ts'

Deno.test('calculates revenue once and keeps unavailable fee null', () => {
  assertEquals(calculatePublisherMetrics({
    clicks: 10,
    matchedOrders: [{ orderId: 'o1', grossPence: 8500 }, { orderId: 'o1', grossPence: 8500 }],
    approvedCommissionPence: 425,
    networkFeePence: null,
    refundPence: 0,
  }), {
    orders: 1,
    gross_revenue_pence: 8500,
    commission_pence: 425,
    network_fee_pence: null,
    net_revenue_pence: null,
    conversion_rate: 0.1,
    aov_pence: 8500,
    publisher_epc_pence: 42.5,
  })
})

Deno.test('returns unavailable ratios for zero denominators', () => {
  const result = calculatePublisherMetrics({ clicks: 0, matchedOrders: [], approvedCommissionPence: 0, networkFeePence: 0, refundPence: 0 })
  assertEquals(result.conversion_rate, null)
  assertEquals(result.aov_pence, null)
  assertEquals(result.publisher_epc_pence, null)
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinReporting.test.ts`

Expected: FAIL because the reporting module is missing.

- [ ] **Step 3: Implement canonical formulas**

Deduplicate matched orders by `orderId`. Keep gross customer receipts, accounting revenue, AWIN commissionable value, VAT, delivery, discounts, commission, fee, and refunds as distinct measures. Set affiliate net cash to null when actual network fee is unavailable. Use `approvedCommissionPence / clicks` for publisher EPC and customer-paid receipts divided by matched orders for AOV.

- [ ] **Step 4: Create reporting views**

`admin_awin_order_reconciliation_v` exposes:

```text
order_id, order_created_at, masked_order_ref, publisher_id, publisher_name,
publisher_category, retain_protected, submitted_commission_group,
reported_commission_group, customer_acquisition, customer_paid_pence,
discount_pence, delivery_pence, vat_pence, commissionable_pence,
awin_sale_amount_pence, voucher_code, commission_pence, network_fee_pence, refund_pence,
awin_status, delivery_state, reconciliation_state, last_synced_at
```

Mask the reference as `left(stripe_payment_id, 3) || '…' || right(stripe_payment_id, 6)`.

Publisher/group daily views aggregate unique `order_id` revenue and imported performance counts. Data-quality view returns freshness timestamps, oldest pending outbox time, dead-letter count, stale flags, duplicate mappings, AWIN-only count, and SOLUM-only count.

Revoke all views from `public`, `anon`, and `authenticated`; grant service-role access only.

- [ ] **Step 5: Verify views and formulas**

Run:

```bash
deno test supabase/functions/_shared/awinReporting.test.ts
supabase db lint --linked
supabase db push --dry-run
```

Expected: tests pass and database changes are additive.

- [ ] **Step 6: Commit reporting views**

```bash
git add supabase/migrations/20260811000005_awin_admin_reporting.sql supabase/functions/_shared/awinReporting.ts supabase/functions/_shared/awinReporting.test.ts
git commit -m "feat: add AWIN admin reporting views"
```

---

### Task 2: Define and validate the admin AWIN response contract

**Files:**
- Create: `supabase/functions/_shared/adminAwin.ts`
- Create: `supabase/functions/_shared/adminAwin.test.ts`

**Interfaces:**
- Produces `parseAdminAwinRequest(value): AdminAwinQuery`.
- Produces `buildAdminAwinResponse(input): AdminAwinResponse`.
- Request: `{ start_date, end_date, status?, publisher_id?, category?, commission_group?, customer_type?, reconciliation_state?, page?, page_size? }`.

- [ ] **Step 1: Write failing filter and redaction tests**

```ts
Deno.test('accepts the canonical 30-day filter query', () => {
  assertEquals(parseAdminAwinRequest({
    start_date: '2026-07-12', end_date: '2026-08-11', status: 'approved', page: 1, page_size: 50,
  }), {
    startDate: '2026-07-12', endDate: '2026-08-11', status: 'approved',
    publisherId: null, category: null, commissionGroup: null,
    customerType: null, reconciliationState: null, page: 1, pageSize: 50,
  })
})

Deno.test('rejects oversized ranges and unknown filters', () => {
  assertThrows(() => parseAdminAwinRequest({ start_date: '2025-01-01', end_date: '2026-08-11' }))
  assertThrows(() => parseAdminAwinRequest({ start_date: '2026-08-01', end_date: '2026-08-11', category: 'unknown' }))
})

Deno.test('response contains no sensitive attribution fields', () => {
  const response = buildAdminAwinResponse(fixtureInput())
  const serialized = JSON.stringify(response)
  assertEquals(/awc|api_token|customer_email|stripe_metadata/i.test(serialized), false)
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/adminAwin.test.ts`

Expected: FAIL because the model module is missing.

- [ ] **Step 3: Implement strict request parsing**

Allow date ranges from 1 through 366 days. Validate:

- status: `pending | approved | declined | deleted | unknown`;
- category: the six publisher categories;
- group: `DEFAULT | NEW | EXISTING`;
- customer type: `NEW | RETURNING | UNKNOWN`;
- reconciliation state: the seven approved states;
- page: integer `>= 1`;
- page size: `25 | 50 | 100`.

- [ ] **Step 4: Implement the response shape**

```ts
type AdminAwinResponse = {
  summary: {
    orders: number
    gross_revenue_pence: number
    awin_sale_value_pence: number
    approved_count: number
    pending_count: number
    declined_count: number
    commission_pence: number
    network_fee_pence: number | null
    net_revenue_pence: number | null
    delivery_success_rate: number | null
    awin_only_count: number
    solum_only_count: number
  }
  publishers: AdminAwinPublisherRow[]
  commission_groups: AdminAwinCommissionGroupRow[]
  reconciliation: { rows: AdminAwinOrderRow[]; page: number; page_size: number; total: number }
  health: AdminAwinHealth
}
```

Network fee/net revenue remain null when any selected transaction lacks fee data.

- [ ] **Step 5: Verify the contract**

Run: `deno test supabase/functions/_shared/adminAwin.test.ts supabase/functions/_shared/awinReporting.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit the server contract**

```bash
git add supabase/functions/_shared/adminAwin.ts supabase/functions/_shared/adminAwin.test.ts
git commit -m "feat: define AWIN admin contract"
```

---

### Task 3: Build the authenticated `admin-awin` Edge Function

**Files:**
- Create: `supabase/functions/admin-awin/index.ts`
- Create: `supabase/functions/admin-awin/config.toml`
- Modify: `supabase/config.toml`
- Modify: `supabase/functions/_shared/adminAuth.test.ts`

**Interfaces:**
- Consumes `authorizeAdminRequest(req)` and `parseAdminAwinRequest(body)`.
- Produces the standard `{ data, request_id }` admin envelope.
- Method is POST only.

- [ ] **Step 1: Add failing auth/boundary tests**

Add cases verifying:

- unapproved origin → 403;
- non-admin role → 403;
- AAL1 session → 403;
- GET → 405;
- invalid filter → 400 `VALIDATION_FAILED`;
- valid POST → 200 and no sensitive keys.

- [ ] **Step 2: Run tests and verify failure**

Run: `deno test supabase/functions/_shared/adminAuth.test.ts supabase/functions/_shared/adminAwin.test.ts`

Expected: new admin-AWIN boundary expectations fail before the function exists.

- [ ] **Step 3: Implement server-filtered queries**

Use the service-role client only after authorization. Query the four reporting views with validated filters. Apply `.range(offset, offset + pageSize - 1)` only to the order-level table. Use `Promise.all` for summary, publishers, groups, reconciliation, and health; map any database error to public `ADMIN_AWIN_LOAD_FAILED` while logging only request ID and database error code.

- [ ] **Step 4: Register the function configuration**

Add the function to `supabase/config.toml`. Keep JWT verification enabled for the admin bearer token. Reuse existing CORS preflight handling and do not add wildcard origins.

- [ ] **Step 5: Verify Edge Function and contract tests**

Run:

```bash
deno test supabase/functions/_shared/adminAuth.test.ts supabase/functions/_shared/adminAwin.test.ts supabase/functions/_shared/awinReporting.test.ts
rg -n 'awc|AWIN_API_TOKEN|customer_email|stripe_metadata' supabase/functions/admin-awin
```

Expected: tests pass; sensitive-field scan returns no matches.

- [ ] **Step 6: Commit the admin service**

```bash
git add supabase/functions/admin-awin supabase/config.toml supabase/functions/_shared/adminAuth.test.ts
git commit -m "feat: add secure AWIN admin service"
```

---

### Task 4: Build the strict admin client model and formatting helpers

**Files:**
- Create: `admin/src/features/awin/model.js`
- Create: `admin/src/features/awin/model.test.js`
- Create: `admin/src/features/awin/format.js`
- Create: `admin/src/features/awin/format.test.js`

**Interfaces:**
- Produces `normalizeAwinDashboardPayload(value)`.
- Produces `formatPence(value)`, `formatRatio(value)`, and `formatFreshness(value, now)`.
- Produces `toAdminAwinRequest(filters)` for canonical server-filter bodies.

- [ ] **Step 1: Write failing client-contract tests**

```js
import { describe, expect, it } from 'vitest'
import { normalizeAwinDashboardPayload, toAdminAwinRequest } from './model'
import { formatPence, formatRatio } from './format'

it('keeps unavailable network fee distinct from zero', () => {
  const payload = fixturePayload()
  payload.summary.network_fee_pence = null
  expect(normalizeAwinDashboardPayload(payload).summary.network_fee_pence).toBeNull()
  expect(formatPence(null)).toBe('Unavailable')
  expect(formatPence(0)).toBe('£0.00')
})

it('rejects sensitive or malformed order rows', () => {
  const payload = fixturePayload()
  payload.reconciliation.rows[0].awc = 'secret'
  expect(() => normalizeAwinDashboardPayload(payload)).toThrow(/unexpected/i)
})

it('formats null ratios without implying zero performance', () => {
  expect(formatRatio(null)).toBe('—')
  expect(formatRatio(0.125)).toBe('12.5%')
})

it('builds the canonical server-filter request', () => {
  expect(toAdminAwinRequest({
    startDate: '2026-07-12', endDate: '2026-08-11', status: 'approved',
    publisherId: '', category: '', commissionGroup: 'NEW', customerType: 'NEW',
    reconciliationState: '', page: 1, pageSize: 50,
  })).toEqual({
    start_date: '2026-07-12', end_date: '2026-08-11', status: 'approved',
    publisher_id: undefined, category: undefined, commission_group: 'NEW',
    customer_type: 'NEW', reconciliation_state: undefined, page: 1, page_size: 50,
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --prefix admin test -- src/features/awin/model.test.js src/features/awin/format.test.js`

Expected: FAIL because the AWIN feature modules do not exist.

- [ ] **Step 3: Implement exact-shape validation**

Validate every required summary number, nullable fee/net fields, publisher rows, group rows, pagination, health timestamps, enum values, and masked order references. Reject any row containing keys outside the allowed contract so a server regression cannot silently expose sensitive fields.

Implement canonical request construction:

```js
export function toAdminAwinRequest(filters) {
  return {
    start_date: filters.startDate,
    end_date: filters.endDate,
    status: filters.status || undefined,
    publisher_id: filters.publisherId || undefined,
    category: filters.category || undefined,
    commission_group: filters.commissionGroup || undefined,
    customer_type: filters.customerType || undefined,
    reconciliation_state: filters.reconciliationState || undefined,
    page: filters.page,
    page_size: filters.pageSize,
  }
}
```

- [ ] **Step 4: Implement formatting**

Use `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`. `formatPence(null)` returns `Unavailable`; ratios use one decimal percentage; freshness returns `Healthy`, `Stale`, or `Never synced` from the server-provided health state rather than recalculating thresholds in React.

- [ ] **Step 5: Verify models**

Run: `npm --prefix admin test -- src/features/awin/model.test.js src/features/awin/format.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit client models**

```bash
git add admin/src/features/awin
git commit -m "feat: add AWIN admin data model"
```

---

### Task 5: Add the AWIN dashboard page and navigation

**Files:**
- Create: `admin/src/pages/AwinPage.jsx`
- Create: `admin/src/pages/AwinPage.test.jsx`
- Modify: `admin/src/App.jsx`
- Modify: `admin/src/components/Layout.jsx`
- Modify: `admin/src/admin.css`

**Interfaces:**
- Page calls `adminApi.request('admin-awin', { body: filters })`.
- URL route is `/awin`; navigation label is `AWIN`.
- Default query is the last 30 complete days plus current day.

- [ ] **Step 1: Write failing rendering tests**

Export `AwinPublisherTable`, `AwinHealthPanel`, and `AwinReconciliationTable` from the page. Use `renderToStaticMarkup` from `react-dom/server` plus `toAdminAwinRequest` tests to cover:

- summary renders unavailable network fee correctly;
- Skimlinks row shows `Protected`;
- zero-click rows show `—` for CVR/EPC;
- stale transaction sync displays a warning;
- filter changes send the canonical request;
- reconciliation pagination preserves filters;
- error response shows retry without leaking request internals.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --prefix admin test -- src/pages/AwinPage.test.jsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement filters and summary**

Render controls for date range, status, publisher, category, commission group, customer type, voucher, and reconciliation state. Summary cards show orders, customer-paid receipts, commissionable value, actual VAT, actual commission, network fee, affiliate net cash, delivery success, AWIN-only, and SOLUM-only counts. Tooltips must state that free/bundled delivery has no notional deduction and VAT is removed only from the confirmed effective date.

- [ ] **Step 4: Implement the four data sections**

Render:

1. publisher table with identity/category/protection, impressions, clicks, orders, CVR, AOV, EPC, revenue, commission, fee, net, status mix, customer mix, and exceptions;
2. commission-group table for `DEFAULT`, `NEW`, and `EXISTING`;
3. paginated order reconciliation table with masked references only;
4. health panel with last sync times, oldest pending item, dead letters, and warnings.

Use existing `.card`, `.table`, `.stat-card`, and responsive table patterns. Add AWIN-specific CSS only for filters, status chips, and warning banners.

- [ ] **Step 5: Register route and navigation**

Add `import AwinPage from './pages/AwinPage'`, `<Route path="awin" element={<AwinPage />} />`, and `{ to: '/awin', label: 'AWIN' }` in `NAV_ITEMS`.

- [ ] **Step 6: Verify admin tests and artifact**

Run:

```bash
npm --prefix admin test
npm --prefix admin run build
npm --prefix admin run verify:artifact
rg -n 'awc|AWIN_API_TOKEN|service_role|customer_email' admin/dist
```

Expected: tests/build/artifact verification pass; sensitive bundle scan returns no matches.

- [ ] **Step 7: Commit the dashboard UI**

```bash
git add admin/src/pages/AwinPage.jsx admin/src/pages/AwinPage.test.jsx admin/src/App.jsx admin/src/components/Layout.jsx admin/src/admin.css
git commit -m "feat: add AWIN admin dashboard"
```

---

### Task 6: Deploy and verify the dashboard development-first

**Files:**
- Modify: `docs/admin-amplify-deployment.md`
- Modify: `docs/manual-changes-log.md`

**Interfaces:**
- Consumes all Phase D outputs.
- Produces development deployment evidence and a production read-only checklist.

- [ ] **Step 1: Run the full local verification set**

```bash
deno test supabase/functions/_shared/adminAuth.test.ts supabase/functions/_shared/adminAwin.test.ts supabase/functions/_shared/awinReporting.test.ts
npm --prefix admin test
npm --prefix admin run build
npm --prefix admin run verify:artifact
supabase db lint --linked
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Deploy development only**

Apply the reporting migration to the development project, deploy `admin-awin` to development, build the development admin artifact with development Supabase variables, verify the archive, and deploy it to the existing Amplify `dev` branch using `docs/admin-amplify-deployment.md`.

- [ ] **Step 3: Perform development acceptance**

Sign in with an admin+AAL2 account and verify filters, summary arithmetic, Skimlinks protection marker, unavailable network fee, pagination, stale warnings, and request-error recovery. Use fixture/imported development data only; do not create a production-like payment.

- [ ] **Step 4: Record production safeguards**

Update the deployment runbook: production promotion requires explicit approval, migration/function/admin artifact deployment in that order, and only read-only acceptance against existing real data. It must explicitly prohibit production checkout E2E, synthetic conversions, refunds, dispatches, partner removals, commission changes, and manual outbox retries during acceptance.

- [ ] **Step 5: Commit deployment documentation**

```bash
git add docs/admin-amplify-deployment.md docs/manual-changes-log.md
git commit -m "docs: add AWIN dashboard deployment checks"
```
