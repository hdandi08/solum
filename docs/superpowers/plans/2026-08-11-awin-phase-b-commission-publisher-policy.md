# AWIN Phase B — Commission and Publisher Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply SOLUM's approved 5% standard commission, preserve explicitly approved publisher exceptions, classify publishers consistently, and submit stable new/returning customer dimensions with every AWIN conversion.

**Architecture:** A server-only publisher-policy table records local categories, protected partners, and explicit exception metadata. Order history determines an immutable `NEW` or `EXISTING` commission group at enqueue time, while the AWIN Conversion API receives its separate `NEW` or `RETURNING` customer-acquisition enum.

**Tech Stack:** PostgreSQL/Supabase migrations and RPCs, Deno TypeScript, AWIN Conversion API, AWIN Commission Management UI, CSV audit artefacts.

## Global Constraints

- Standard programme commission is exactly 5%.
- Publisher-specific exceptions require an explicit publisher ID, approved rate, reason, and approval date.
- Commission-group codes are exactly `DEFAULT`, `NEW`, and `EXISTING`.
- AWIN `customerAcquisition` values are exactly `NEW` and `RETURNING`; `EXISTING` is never sent in that field.
- `NEW` means no earlier paid, non-cancelled SOLUM order before the current order.
- Skimlinks and partnerships routed through Skimlinks must be retained and marked protected.
- Publisher category is one of `editorial`, `creator`, `cashback_loyalty`, `comparison`, `subnetwork`, or `other`.
- Actual transaction commission imported from AWIN remains the reporting authority; policy rates are context only.
- No code or script may automatically terminate a publisher relationship.
- Production AWIN commission changes are external mutations and must be followed by read-back verification.

---

### Task 1: Create the server-only publisher policy registry

**Files:**
- Create: `supabase/migrations/20260811000002_awin_publishers.sql`
- Create: `supabase/functions/_shared/awinPublisherPolicy.ts`
- Create: `supabase/functions/_shared/awinPublisherPolicy.test.ts`

**Interfaces:**
- Produces table `public.awin_publishers` keyed by `publisher_id bigint`.
- Produces `normalizePublisherCategory(value): PublisherCategory`.
- Produces `protectPublisher(input): boolean`.
- Produces RPC `upsert_awin_publisher_policy(p_publisher_id bigint, p_publisher_name text, p_primary_region text, p_primary_type text, p_category text, p_retain_protected boolean, p_exception_rate_bps integer, p_exception_reason text, p_exception_approved_at date)` executable only by `service_role`.

- [ ] **Step 1: Write failing publisher-policy tests**

```ts
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { normalizePublisherCategory, protectPublisher, validateExceptionRate } from './awinPublisherPolicy.ts'

Deno.test('normalizes only the six reporting categories', () => {
  assertEquals(normalizePublisherCategory('editorial'), 'editorial')
  assertEquals(normalizePublisherCategory('unknown'), 'other')
})

Deno.test('protects every Skimlinks identity case-insensitively', () => {
  assertEquals(protectPublisher({ publisherName: 'Skimlinks', primaryType: 'Content' }), true)
  assertEquals(protectPublisher({ publisherName: 'Example', primaryType: 'Content' }), false)
})

Deno.test('requires approved exception metadata', () => {
  assertThrows(() => validateExceptionRate({ rateBps: 750, reason: '', approvedAt: '2026-08-11' }))
  assertEquals(validateExceptionRate({ rateBps: 750, reason: 'Launch editorial partner', approvedAt: '2026-08-11' }), 750)
})
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `deno test supabase/functions/_shared/awinPublisherPolicy.test.ts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the policy helpers**

```ts
export const PUBLISHER_CATEGORIES = [
  'editorial', 'creator', 'cashback_loyalty', 'comparison', 'subnetwork', 'other',
] as const

export function normalizePublisherCategory(value: unknown) {
  return PUBLISHER_CATEGORIES.includes(value as typeof PUBLISHER_CATEGORIES[number])
    ? value as typeof PUBLISHER_CATEGORIES[number]
    : 'other'
}

export function protectPublisher(input: { publisherName?: string; primaryType?: string }) {
  return /skimlinks/i.test(input.publisherName ?? '')
}

export function validateExceptionRate(input: { rateBps?: number; reason?: string; approvedAt?: string }) {
  if (!Number.isInteger(input.rateBps) || input.rateBps! < 0 || input.rateBps! > 10000) throw new Error('invalid exception rate')
  if (!input.reason?.trim()) throw new Error('exception reason is required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.approvedAt ?? '')) throw new Error('approval date is required')
  return input.rateBps!
}
```

- [ ] **Step 4: Create the table and guarded RPC**

The migration defines:

```sql
create table public.awin_publishers (
  publisher_id bigint primary key,
  publisher_name text not null,
  primary_region text,
  primary_type text,
  category text not null default 'other'
    check (category in ('editorial','creator','cashback_loyalty','comparison','subnetwork','other')),
  relationship_status text not null default 'active',
  retain_protected boolean not null default false,
  standard_rate_bps integer not null default 500 check (standard_rate_bps between 0 and 10000),
  exception_rate_bps integer check (exception_rate_bps between 0 and 10000),
  exception_reason text,
  exception_approved_at date,
  awin_tags jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (exception_rate_bps is null and exception_reason is null and exception_approved_at is null)
    or
    (exception_rate_bps is not null and length(trim(exception_reason)) > 0 and exception_approved_at is not null)
  )
);
```

Enable RLS and revoke direct `anon`/`authenticated` access. The RPC refuses any update that changes `retain_protected` from true to false when the name contains `Skimlinks`.

- [ ] **Step 5: Verify the migration and policy tests**

Run:

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts
supabase db lint --linked
supabase db push --dry-run
```

Expected: tests pass and the dry run contains only the new table/RPC/grants.

- [ ] **Step 6: Commit the policy registry**

```bash
git add supabase/migrations/20260811000002_awin_publishers.sql supabase/functions/_shared/awinPublisherPolicy.ts supabase/functions/_shared/awinPublisherPolicy.test.ts
git commit -m "feat: add AWIN publisher policy registry"
```

---

### Task 2: Import current publishers into a reviewable policy artefact

**Files:**
- Create: `scripts/awin/publisher-policy.mjs`
- Create: `scripts/awin/publisher-policy.test.mjs`
- Create: `scripts/awin/fixtures/publishers.json`
- Create: `artefacts/awin-publisher-policy.csv`
- Create: `docs/awin-publisher-policy.md`

**Interfaces:**
- Consumes AWIN `GET /advertisers/129171/publishers` with OAuth Bearer token.
- Produces CSV columns `publisher_id,publisher_name,primary_region,primary_type,category,retain_protected,standard_rate_bps,exception_rate_bps,exception_reason,exception_approved_at,decision`.
- `decision` is one of `retain`, `review`, or `end_manually`; scripts never execute the last action.

- [ ] **Step 1: Write failing categorisation and CSV tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { publisherPolicyRow, renderPublisherPolicyCsv } from './publisher-policy.mjs'

test('protects and categorises Skimlinks', () => {
  assert.deepEqual(publisherPolicyRow({ id: 100, name: 'Skimlinks', primaryRegion: 'UK', primaryType: 'Content' }), {
    publisher_id: 100,
    publisher_name: 'Skimlinks',
    primary_region: 'UK',
    primary_type: 'Content',
    category: 'subnetwork',
    retain_protected: true,
    standard_rate_bps: 500,
    exception_rate_bps: '',
    exception_reason: '',
    exception_approved_at: '',
    decision: 'retain',
  })
})

test('quotes CSV fields safely', () => {
  assert.match(renderPublisherPolicyCsv([{ ...publisherPolicyRow({ id: 1, name: 'A, Ltd' }) }]), /"A, Ltd"/)
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `node --test scripts/awin/publisher-policy.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic default classification**

Use these name/type rules in order:

1. name contains `skimlinks` → `subnetwork`, protected, retain;
2. primary type contains `cashback`, `loyalty`, or `reward` → `cashback_loyalty`;
3. primary type contains `comparison` → `comparison`;
4. primary type contains `content`, `editorial`, or `blog` → `editorial`;
5. primary type contains `influencer`, `social`, or `creator` → `creator`;
6. otherwise → `other`, decision `review`.

The script reads `AWIN_API_TOKEN`, sends `Authorization: Bearer <token>`, and writes no token or raw response to stdout. A `--fixture <path>` mode must generate the same CSV without network access for tests.

- [ ] **Step 4: Generate and review the artefact read-only**

Run:

```bash
node scripts/awin/publisher-policy.mjs --fixture scripts/awin/fixtures/publishers.json
node --test scripts/awin/publisher-policy.test.mjs
```

Then, with the AWIN token supplied through the shell secret environment, run the live read-only export. Review every `review` row manually. Do not mark a partnership `end_manually` solely because it has no sales; record the rationale in `docs/awin-publisher-policy.md`.

- [ ] **Step 5: Commit the policy snapshot**

```bash
git add scripts/awin/publisher-policy.mjs scripts/awin/publisher-policy.test.mjs scripts/awin/fixtures/publishers.json artefacts/awin-publisher-policy.csv docs/awin-publisher-policy.md
git commit -m "docs: add AWIN publisher policy snapshot"
```

---

### Task 3: Classify each conversion as new or existing at enqueue time

**Files:**
- Create: `supabase/migrations/20260811000003_awin_customer_classification.sql`
- Modify: `supabase/functions/_shared/awin.ts`
- Modify: `supabase/functions/_shared/awin.test.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`
- Modify: `supabase/functions/_shared/awinConversionApi.ts`
- Modify: `supabase/functions/_shared/awinConversionApi.test.ts`

**Interfaces:**
- Produces `classifyAwinCustomer(priorPaidOrderCount): { commissionGroup: 'NEW' | 'EXISTING'; customerAcquisition: 'NEW' | 'RETURNING' }`.
- Outbox stores both `commission_group` and `customer_acquisition` immutably. The additive migration adds `customer_acquisition` and its `NEW`/`RETURNING` check; it never edits the already-applied Phase A migration.

- [ ] **Step 1: Write failing customer-classification tests**

```ts
Deno.test('maps first order to NEW and repeat order to EXISTING/RETURNING', () => {
  assertEquals(classifyAwinCustomer(0), { commissionGroup: 'NEW', customerAcquisition: 'NEW' })
  assertEquals(classifyAwinCustomer(1), { commissionGroup: 'EXISTING', customerAcquisition: 'RETURNING' })
  assertEquals(classifyAwinCustomer(8), { commissionGroup: 'EXISTING', customerAcquisition: 'RETURNING' })
})

Deno.test('rejects invalid prior-order counts', () => {
  assertThrows(() => classifyAwinCustomer(-1))
  assertThrows(() => classifyAwinCustomer(Number.NaN))
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awin.test.ts supabase/functions/_shared/awinConversionApi.test.ts`

Expected: FAIL because `classifyAwinCustomer` and the new payload field are absent.

- [ ] **Step 3: Implement immutable classification**

```ts
export function classifyAwinCustomer(priorPaidOrderCount: number) {
  if (!Number.isSafeInteger(priorPaidOrderCount) || priorPaidOrderCount < 0) throw new Error('invalid prior order count')
  return priorPaidOrderCount === 0
    ? { commissionGroup: 'NEW' as const, customerAcquisition: 'NEW' as const }
    : { commissionGroup: 'EXISTING' as const, customerAcquisition: 'RETURNING' as const }
}
```

In the webhook, after the canonical order exists, count earlier orders for the same `customer_id` where `status = 'paid'`, `created_at < current order.created_at`, and `id <> current order.id`. Compute once and persist both values to the outbox. Retried webhooks upsert on `order_ref` without changing them.

The additive migration is exact:

```sql
alter table public.awin_conversion_outbox
  add column customer_acquisition text;

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_customer_acquisition_check
  check (customer_acquisition in ('NEW', 'RETURNING'));
```

Legacy `DEFAULT` rows may keep this field null. New Phase B rows must always supply it.

- [ ] **Step 4: Update the Conversion API payload**

For a new customer:

```json
{
  "customerAcquisition": "NEW",
  "commissionGroups": [{ "code": "NEW", "amount": 85.00 }]
}
```

For an existing customer:

```json
{
  "customerAcquisition": "RETURNING",
  "commissionGroups": [{ "code": "EXISTING", "amount": 85.00 }]
}
```

Keep `DEFAULT` as a database/API fallback only for legacy rows whose classification cannot be recovered safely.

- [ ] **Step 5: Verify classification and regression suites**

Run:

```bash
deno test supabase/functions/_shared/awin.test.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/awinOutbox.test.ts
rg -n "customerAcquisition: 'EXISTING'|customer_acquisition.*EXISTING" supabase
```

Expected: tests pass; the invalid-enum scan returns no matches.

- [ ] **Step 6: Commit conversion classification**

```bash
git add supabase/migrations/20260811000003_awin_customer_classification.sql supabase/functions/_shared/awin.ts supabase/functions/_shared/awin.test.ts supabase/functions/stripe-webhook/index.ts supabase/functions/_shared/awinConversionApi.ts supabase/functions/_shared/awinConversionApi.test.ts
git commit -m "feat: classify AWIN customer acquisition"
```

---

### Task 4: Apply and verify the AWIN commission configuration

**Files:**
- Modify: `docs/awin-publisher-policy.md`
- Modify: `docs/manual-changes-log.md`
- Create: `artefacts/awin-commission-configuration.csv`

**Interfaces:**
- Consumes the approved 5% policy and reviewed publisher CSV.
- Produces a dated read-back record with columns `scope,identifier,name,rate_percent,effective_from,verified_at,verified_by`.

- [ ] **Step 1: Capture the current configuration before mutation**

In AWIN, export or transcribe the current Default commission group and all publisher-specific rates into `artefacts/awin-commission-configuration.csv`. Confirm Skimlinks appears in the retained publisher list before changing rates.

- [ ] **Step 2: Configure the three groups in Commission Management**

Apply:

- `DEFAULT` — 5%; fallback group.
- `NEW` — 5%; first paid order.
- `EXISTING` — 5%; returning customer order.

AWIN Access allows the mandatory Default plus two additional groups. Do not create a fourth group.

- [ ] **Step 3: Preserve only explicitly approved publisher overrides**

For each publisher-specific rate, require a matching non-empty `exception_rate_bps`, `exception_reason`, and `exception_approved_at` in the policy artefact. Leave all other publishers on 5%. Never remove or suspend Skimlinks.

- [ ] **Step 4: Read back the effective configuration**

Reload Commission Management and publisher-specific rate screens. Record the effective values and timestamp in the configuration CSV. Verify `DEFAULT`, `NEW`, and `EXISTING` each resolve to 5% for a non-exception publisher.

- [ ] **Step 5: Record the external mutation**

Update `docs/manual-changes-log.md` with date, advertiser `129171`, the three groups, 5% baseline, preserved exceptions, Skimlinks protection, and the operator who performed the read-back.

- [ ] **Step 6: Commit the verified record**

```bash
git add docs/awin-publisher-policy.md docs/manual-changes-log.md artefacts/awin-commission-configuration.csv
git commit -m "docs: record AWIN commission policy"
```

---

### Task 5: Verify Phase B end to end in development

**Files:**
- Modify: `docs/awin-publisher-policy.md`

**Interfaces:**
- Consumes Tasks 1–4.
- Produces a signed-off publisher and commission-policy checklist.

- [ ] **Step 1: Run local verification**

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts supabase/functions/_shared/awin.test.ts supabase/functions/_shared/awinConversionApi.test.ts
node --test scripts/awin/publisher-policy.test.mjs
supabase db lint --linked
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Verify fixture conversion groups**

Use development fixture customers: one with no prior paid order and one with a prior paid order. Assert outbox rows store `NEW/NEW` and `EXISTING/RETURNING` respectively, and retries do not change either row.

- [ ] **Step 3: Verify publisher protections**

Query `awin_publishers` with the service role and confirm every publisher name matching `Skimlinks` has `category = 'subnetwork'`, `retain_protected = true`, and `decision = retain` in the CSV.

- [ ] **Step 4: Commit final Phase B verification notes**

```bash
git add docs/awin-publisher-policy.md
git commit -m "docs: verify AWIN publisher policy"
```
