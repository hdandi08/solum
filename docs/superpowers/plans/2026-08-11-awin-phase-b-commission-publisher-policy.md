# AWIN Phase B — Dynamic Commission and Publisher Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import AWIN's commission configuration and publisher assignments into a secure dynamic rate matrix, protect Skimlinks, and keep customer acquisition independent from transaction commission groups.

**Architecture:** AWIN commission groups, publisher rate sets, per-group rate values, publishers, and publisher assignments are normalized as server-only data. The nominal expected commission is inferred from `(publisher rate-set assignment, transaction commission-group code)`, while actual imported AWIN transaction commission remains financially authoritative. Checkout continues to emit `DEFAULT` until a separately approved deterministic order/product rule selects another imported group.

**Tech Stack:** PostgreSQL/Supabase migrations and RLS, Deno TypeScript, Node.js test runner, AWIN read-only exports/API data, CSV/JSON audit artefacts.

**Spec:** `docs/superpowers/specs/2026-08-11-awin-reconciliation-dashboard-design.md`

## Global Constraints

- Advertiser ID is exactly `129171`.
- Current programme standard is 10%; approved direct premium partners are intended to resolve to 15% only after their rate matrix and assignment are read back.
- Commission-group codes are dynamic uppercase identifiers matching `^[A-Z0-9_]{1,50}$`; do not model them as a closed TypeScript or SQL enum.
- Customer acquisition is exactly `NEW` or `RETURNING` and is never inferred from a commission-group code.
- Current checkout submissions remain `DEFAULT`; publisher ID, category, and `awc` never select a transaction group.
- Nominal rate inference requires both the publisher's rate-set assignment and the transaction group.
- Actual commission imported from AWIN remains the financial reporting authority.
- Skimlinks publisher IDs `78888`, `181013`, and `2573975` are protected and externally managed; scripts cannot schedule rate changes or end partnerships.
- No code or script automatically approves, terminates, or changes an AWIN partnership or commission.
- All new policy tables deny `anon` and `authenticated`; only `service_role` can access them.
- Migrations are additive and ordered after applied Phase A migration `20260812000002`.
- No production checkout E2E, synthetic transaction, AWIN conversion, or commission-mutation test is permitted.

---

### Task 1: Add the dynamic commission-policy domain and secure schema

**Files:**
- Create: `supabase/functions/_shared/awinPublisherPolicy.ts`
- Create: `supabase/functions/_shared/awinPublisherPolicy.test.ts`
- Create: `supabase/migrations/20260813000001_awin_commission_policy.sql`

**Interfaces:**
- Produces `normalizeCommissionGroupCode(value: unknown): string`.
- Produces `normalizePublisherCategory(value: unknown): PublisherCategory`.
- Produces `classifyPublisher(input): { category; retainProtected; commercialTier; rateSource }`.
- Produces `inferNominalCommissionPence(input): number | null`.
- Produces tables `awin_commission_groups`, `awin_commission_rate_sets`, `awin_commission_rate_values`, `awin_publishers`, and `awin_publisher_rate_assignments`.

- [ ] **Step 1: Write failing domain tests**

Create tests that establish the public API before the module exists:

```ts
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyPublisher,
  inferNominalCommissionPence,
  normalizeCommissionGroupCode,
  normalizePublisherCategory,
} from "./awinPublisherPolicy.ts";

Deno.test("accepts dynamic uppercase AWIN group codes", () => {
  assertEquals(normalizeCommissionGroupCode("DEFAULT"), "DEFAULT");
  assertEquals(normalizeCommissionGroupCode("KIT_RITUAL_2027"), "KIT_RITUAL_2027");
  assertThrows(() => normalizeCommissionGroupCode("premium"), TypeError);
  assertThrows(() => normalizeCommissionGroupCode("BAD-CODE"), TypeError);
});

Deno.test("protects all three verified Skimlinks publisher IDs", () => {
  for (const publisherId of [78888, 181013, 2573975]) {
    assertEquals(classifyPublisher({ publisherId, publisherName: "renamed" }), {
      category: "subnetwork",
      retainProtected: true,
      commercialTier: "externally_managed",
      rateSource: "skimlinks_managed",
    });
  }
});

Deno.test("category never grants a premium commercial tier", () => {
  assertEquals(
    classifyPublisher({
      publisherId: 900001,
      publisherName: "Editorial Example",
      primaryType: "Editorial Content",
    }),
    {
      category: "editorial",
      retainProtected: false,
      commercialTier: "standard",
      rateSource: "awin_assignment",
    },
  );
  assertEquals(normalizePublisherCategory("Influencers"), "creator");
});

Deno.test("infers percentage and fixed commission from rate-set/group values", () => {
  assertEquals(inferNominalCommissionPence({
    commissionablePence: 7083,
    commissionType: "percentage",
    rateBps: 1000,
  }), 708);
  assertEquals(inferNominalCommissionPence({
    commissionablePence: 7083,
    commissionType: "fixed",
    fixedAmountPence: 1500,
  }), 1500);
  assertEquals(inferNominalCommissionPence({
    commissionablePence: 7083,
    commissionType: null,
  }), null);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts
```

Expected: FAIL with `Module not found` for `awinPublisherPolicy.ts`.

- [ ] **Step 3: Implement the minimal policy module**

Use these exact exported types and rules:

```ts
export const PUBLISHER_CATEGORIES = [
  "editorial",
  "creator",
  "cashback_loyalty",
  "comparison",
  "subnetwork",
  "other",
] as const;

export type PublisherCategory = typeof PUBLISHER_CATEGORIES[number];
export type CommercialTier = "standard" | "premium" | "externally_managed";
export type RateSource = "awin_assignment" | "skimlinks_managed" | "approved_exception";

const COMMISSION_GROUP_CODE = /^[A-Z0-9_]{1,50}$/;
const SKIMLINKS_IDS = new Set([78888, 181013, 2573975]);
```

`normalizeCommissionGroupCode` trims nothing and rejects any non-canonical input. `classifyPublisher` uses verified Skimlinks IDs before name/type heuristics. Non-Skimlinks editorial/creator records remain `standard` until explicit approval metadata is imported. Percentage inference uses `Math.round(commissionablePence * rateBps / 10_000)` and validates PostgreSQL-safe integers; fixed inference returns the validated fixed amount.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts
deno lint supabase/functions/_shared/awinPublisherPolicy.ts supabase/functions/_shared/awinPublisherPolicy.test.ts
```

Expected: all tests pass and lint exits 0.

- [ ] **Step 5: Add failing static migration-contract tests**

Extend `awinPublisherPolicy.test.ts` to load `../../migrations/20260813000001_awin_commission_policy.sql` and assert:

```ts
const sql = await Deno.readTextFile(
  new URL("../../migrations/20260813000001_awin_commission_policy.sql", import.meta.url),
);

for (const table of [
  "awin_commission_groups",
  "awin_commission_rate_sets",
  "awin_commission_rate_values",
  "awin_publishers",
  "awin_publisher_rate_assignments",
]) {
  assertEquals(sql.includes(`create table public.${table}`), true);
}
assertEquals(sql.includes("check (code ~ '^[A-Z0-9_]{1,50}$')"), true);
assertEquals(sql.includes("revoke all on table public.awin_publishers from public, anon, authenticated"), true);
assertEquals(sql.includes("grant select, insert, update, delete on table public.awin_publishers to service_role"), true);
```

- [ ] **Step 6: Run the static test and verify RED**

Run the focused Deno test again.

Expected: FAIL because the migration file is absent.

- [ ] **Step 7: Create the normalized migration**

The migration must implement these exact relationships:

```sql
create table public.awin_commission_groups (
  code text primary key check (code ~ '^[A-Z0-9_]{1,50}$'),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text,
  condition_summary text,
  active boolean not null default true,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awin_commission_rate_sets (
  rate_set_key text primary key check (rate_set_key ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  source_id text,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  active boolean not null default true,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`awin_commission_rate_values` has primary key `(rate_set_key, commission_group_code)`, foreign keys to both parent tables, `commission_type` in `percentage|fixed`, and a check requiring exactly one of `rate_bps` or `fixed_amount_pence`. Percentage basis points are `0..10000`; fixed pence is `0..2147483647`; fixed rows require `currency = 'GBP'`, percentage rows require null currency.

Use exact rate-set keys `program-standard` for display name `Program Standard Commission Rates` and `solum-premium` for display name `Solum Premium`.

`awin_publishers` is keyed by positive `publisher_id bigint` and has these exact policy columns in addition to lifecycle timestamps:

```sql
publisher_name text not null,
primary_region text,
primary_type text,
category text not null,
relationship_status text not null
  check (relationship_status ~ '^[a-z][a-z0-9_]{0,49}$'),
retain_protected boolean not null default false,
commercial_tier text not null,
rate_source text not null,
commission_rate_set_key text references public.awin_commission_rate_sets(rate_set_key),
exception_reason text,
exception_approved_by text,
exception_approved_at timestamptz,
awin_tags jsonb not null default '[]'::jsonb
  check (jsonb_typeof(awin_tags) = 'array'),
source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$')
```

`publisher_name`, non-null `primary_region`, non-null `primary_type`, `exception_reason`, and `exception_approved_by` must be trimmed; publisher/type/region/approver lengths are `1..200`, and reason length is `1..1000`. Category uses the six exact values, commercial tier uses the three exact values, and rate source uses the three exact values from the shared module. A `premium` tier requires non-empty reason/approver, approval timestamp, `rate_source = 'approved_exception'`, and a rate-set key. Non-premium rows require all exception metadata null.

Create `guard_awin_publisher_protection()` as a `before update` trigger. It raises SQLSTATE `22023` if a row with `retain_protected = true` would become false or if its positive publisher ID would change. No import/upsert RPC is introduced in Task 1; Task 4 uses service-role table DML and this trigger remains the invariant boundary.

`awin_publisher_rate_assignments` stores `(publisher_id, rate_set_key, effective_from)` with nullable `effective_to`, state `current|scheduled|historical`, source hash, and a partial unique index allowing one `current` assignment per publisher. Create `guard_awin_publisher_assignment_overlap()` as a `before insert or update` trigger. It takes `pg_advisory_xact_lock(new.publisher_id)`, then rejects another assignment for the same publisher whose half-open interval `[effective_from, effective_to)` overlaps the new interval; null `effective_to` means infinity. It excludes `old` on update and raises SQLSTATE `23P01` on overlap.

All five tables are owned by `postgres`, have RLS enabled, revoke all access from `public`, `anon`, and `authenticated`, and grant table DML only to `service_role`. Seed the two observed groups (`DEFAULT`, `PREMIUM`), the two observed rate-set names, and the observed programme-standard values (`DEFAULT` = 1000 bps, `PREMIUM` = 1500 bps). Use these exact lowercase SHA-256 source hashes, derived from the displayed canonical strings with no trailing newline:

| Seed row | Canonical string | `source_hash` |
| --- | --- | --- |
| group `DEFAULT` | `awin-group:DEFAULT:2026-08-12` | `585ea6d58e1fcbbfbaf38d3b0eb1a9217f3a5c70c6617da4ead9c61b7719c187` |
| group `PREMIUM` | `awin-group:PREMIUM:2026-08-12` | `cdcfb67126966309c2dcefee986e3b3c25d41d7a12075fb671ab54339f3fb06f` |
| rate set `program-standard` | `awin-rate-set:program-standard:2026-08-12` | `6753418e9c6ebc0369d0240afa09279c3f78549771c611a8c6d5b4b42889b78e` |
| rate set `solum-premium` | `awin-rate-set:solum-premium:2026-08-12` | `b306cc59dece2a23c3ad5cdc5313ce297742a6066ec87c3300b4bee144e8ccc5` |
| standard/`DEFAULT` value | `awin-rate-value:program-standard:DEFAULT:1000:2026-08-12` | `d288363bdb1cf6146331a2e44ef662f106cb8abe06f0a955622ba63a1235a85e` |
| standard/`PREMIUM` value | `awin-rate-value:program-standard:PREMIUM:1500:2026-08-12` | `67c2a724d32eb6f2ea3de96757da5651a79b3928baf50067bdaecf6abc6e59ad` |

Do not fabricate any unverified `Solum Premium` matrix value. Task 2 derives future/imported source hashes as lowercase SHA-256 of recursively key-sorted compact JSON encoded as UTF-8; array order is preserved.

`classifyPublisher` consumes exactly:

```ts
export type PublisherClassificationInput = {
  publisherId: number;
  publisherName: string;
  primaryType?: string | null;
};
```

Validate a positive safe-integer publisher ID and a trimmed non-empty name. Apply classification in this order: verified Skimlinks ID or case-insensitive `skimlinks` name → protected `subnetwork`; primary type containing `cashback|loyalty|reward` → `cashback_loyalty`; `comparison` → `comparison`; `influencer|social|creator` → `creator`; `content|editorial|blog` → `editorial`; otherwise `other`. `normalizePublisherCategory` maps those same singular/plural/type-label synonyms, including `Influencers` → `creator`, and returns `other` for unknown input. Every non-Skimlinks classification returns standard/AWIN-assignment commercial metadata.

- [ ] **Step 8: Verify migration contracts and commit Task 1**

Run:

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts
deno check supabase/functions/_shared/awinPublisherPolicy.ts
deno fmt --check supabase/functions/_shared/awinPublisherPolicy.ts supabase/functions/_shared/awinPublisherPolicy.test.ts
deno lint supabase/functions/_shared/awinPublisherPolicy.ts supabase/functions/_shared/awinPublisherPolicy.test.ts
git diff --check
```

Expected: all exit 0.

Commit:

```bash
git add supabase/functions/_shared/awinPublisherPolicy.ts supabase/functions/_shared/awinPublisherPolicy.test.ts supabase/migrations/20260813000001_awin_commission_policy.sql
git commit -m "feat: add dynamic AWIN commission policy"
```

---

### Task 2: Add the read-only AWIN policy importer and audit snapshot

**Files:**
- Create: `scripts/awin/policy-import.mjs`
- Create: `scripts/awin/policy-import.test.mjs`
- Create: `scripts/awin/fixtures/policy-export.json`
- Create: `artefacts/awin-commission-policy.csv`
- Create: `docs/awin-publisher-policy.md`

**Interfaces:**
- Consumes a JSON document with arrays `commissionGroups`, `rateSets`, `rateValues`, `publishers`, and `assignments`.
- Produces `validatePolicyExport(value)`, `normalizePolicyExport(value)`, `renderPolicyCsv(value)`, and `sourceHash(value)`.
- CLI defaults to `--dry-run`; there is no AWIN mutation mode.

- [ ] **Step 1: Write failing importer tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePolicyExport,
  renderPolicyCsv,
} from "./policy-import.mjs";

test("preserves a dynamic group/rate-set matrix", () => {
  const normalized = normalizePolicyExport({
    commissionGroups: [{ code: "KIT_2027", name: "Kit 2027", active: true }],
    rateSets: [{ key: "standard", name: "Programme Standard Commission Rates", active: true }],
    rateValues: [{ rateSetKey: "standard", groupCode: "KIT_2027", commissionType: "percentage", rateBps: 1200 }],
    publishers: [{ id: 900001, name: "Editorial Example", primaryType: "Editorial Content", status: "joined" }],
    assignments: [{ publisherId: 900001, rateSetKey: "standard", state: "current", effectiveFrom: "2026-08-12T00:00:00Z" }],
  });
  assert.equal(normalized.rateValues[0].rate_bps, 1200);
  assert.equal(normalized.publishers[0].commercial_tier, "standard");
});

test("protects verified Skimlinks IDs and preserves their observed assignment", () => {
  const normalized = normalizePolicyExport(JSON.parse(process.env.POLICY_FIXTURE));
  const skimlinks = normalized.publishers.filter((row) => [78888, 181013, 2573975].includes(row.publisher_id));
  assert.equal(skimlinks.length, 3);
  assert.equal(skimlinks.every((row) => row.retain_protected && row.rate_source === "skimlinks_managed"), true);
  assert.match(renderPolicyCsv(normalized), /Skimlinks Rewards sites/);
});
```

The actual test loads `scripts/awin/fixtures/policy-export.json` directly rather than relying on a shell environment string.

- [ ] **Step 2: Run importer tests and verify RED**

Run:

```bash
node --test scripts/awin/policy-import.test.mjs
```

Expected: FAIL because `policy-import.mjs` does not exist.

- [ ] **Step 3: Implement strict normalization and CSV rendering**

The fixture contains the account facts verified on 2026-08-12:

- groups `DEFAULT` at observed programme value 1000 bps and `PREMIUM` at observed programme value 1500 bps;
- rate-set names `Program Standard Commission Rates` and `Solum Premium`;
- eight current publishers assigned to programme standard;
- `Solum Premium` has zero current publishers;
- Skimlinks `78888`, Coupon Deal `181013`, and Rewards `2573975` are current programme-standard assignments;
- unverified `Solum Premium` rate-value cells are absent, not guessed.

The eight live programme-standard publisher assignments read back on 2026-08-12 are exactly:

| Publisher ID | Publisher name | Known primary type |
| ---: | --- | --- |
| 111 | Awin Test Publisher - do not suspend | null |
| 2939789 | Creovia | Content Creators & Influencers |
| 45628 | Example Publisher | null |
| 171741 | Rank | null |
| 2944797 | Sensible Content Group | null |
| 78888 | Skimlinks | Sub Networks |
| 181013 | Skimlinks Coupon Deal sites | Sub Networks |
| 2573975 | Skimlinks Rewards sites | Cashback |

Use relationship status `joined` for the current assignment snapshot. Unknown primary type and region fields remain null; do not infer them from publisher names. The fixture's `observedAt` is `2026-08-12T21:33:00Z` and current assignment `effectiveFrom` is `2026-08-12T21:33:00Z` when AWIN exposes no earlier assignment timestamp in this read-back.

Reject duplicate group codes, duplicate rate-set keys, orphan rate values, orphan assignments, multiple current assignments for one publisher, unsafe codes, invalid basis points, and premium publishers without approval metadata. CSV columns are exactly:

```text
publisher_id,publisher_name,category,relationship_status,retain_protected,commercial_tier,rate_source,commission_rate_set_key,commission_rate_set_name,group_code,commission_type,rate_bps,fixed_amount_pence,currency,approval_reason,approved_by,approved_at,observed_at
```

The CLI accepts `--input <json>` and `--output <csv>`. It reads no AWIN token, prints only counts and output paths, and has no partnership/rate mutation code.

- [ ] **Step 4: Run importer tests and verify GREEN**

Run:

```bash
node --test scripts/awin/policy-import.test.mjs
node scripts/awin/policy-import.mjs --input scripts/awin/fixtures/policy-export.json --output artefacts/awin-commission-policy.csv
```

Expected: tests pass and summary counts report two groups, two rate sets, eight publishers, eight current assignments, and three protected Skimlinks publishers.

- [ ] **Step 5: Document policy interpretation**

`docs/awin-publisher-policy.md` must state:

- category does not select commission;
- expected rate is inferred from assignment plus group;
- missing matrix values are `unverified`, never zero;
- actual AWIN transaction commission is authoritative;
- all three Skimlinks publishers remain protected and externally managed;
- the importer is read-only and cannot change AWIN;
- direct premium assignments require explicit publisher-level approval and a read-back of all rate-set/group values.

- [ ] **Step 6: Verify and commit Task 2**

Run:

```bash
node --test scripts/awin/policy-import.test.mjs
node --check scripts/awin/policy-import.mjs
git diff --check
```

Commit:

```bash
git add scripts/awin/policy-import.mjs scripts/awin/policy-import.test.mjs scripts/awin/fixtures/policy-export.json artefacts/awin-commission-policy.csv docs/awin-publisher-policy.md
git commit -m "feat: import AWIN commission policy"
```

---

### Task 3: Separate customer acquisition and support dynamic outbox groups

**Files:**
- Create: `supabase/migrations/20260813000002_awin_customer_acquisition.sql`
- Modify: `supabase/functions/_shared/awinCommission.ts`
- Modify: `supabase/functions/_shared/awinCommission.test.ts`
- Modify: `supabase/functions/_shared/awinConversionApi.ts`
- Modify: `supabase/functions/_shared/awinConversionApi.test.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`
- Modify: `supabase/functions/_shared/purchaseSafety.test.ts`

**Interfaces:**
- Produces `classifyAwinCustomer(priorPaidOrderCount: number): "NEW" | "RETURNING"`.
- Produces `validateCommissionGroupCode(value: unknown): string` using the shared dynamic-code rule.
- Adds immutable outbox column `customer_acquisition` with values `NEW|RETURNING` for new rows.
- Worker reads `customer_acquisition` directly and never derives it from `commission_group`.

- [ ] **Step 1: Write failing customer and group tests**

Add tests:

```ts
Deno.test("classifies customer acquisition independently from commission", () => {
  assertEquals(classifyAwinCustomer(0), "NEW");
  assertEquals(classifyAwinCustomer(1), "RETURNING");
  assertEquals(classifyAwinCustomer(12), "RETURNING");
  assertThrows(() => classifyAwinCustomer(-1), TypeError);
});

Deno.test("builds a conversion with a future imported group code", () => {
  const order = buildConversionOrder({
    orderRef: "pi_dynamic1",
    amountPence: 7083,
    currency: "GBP",
    channel: "aw",
    awc: "safe_awc",
    commissionGroup: "KIT_RITUAL_2027",
    customerAcquisition: "RETURNING",
  });
  assertEquals(order.commissionGroups, [{ code: "KIT_RITUAL_2027", amount: 70.83 }]);
  assertEquals(order.customerAcquisition, "RETURNING");
});

Deno.test("does not infer customer acquisition from group names", () => {
  const order = buildConversionOrder({
    orderRef: "pi_dynamic2",
    amountPence: 7083,
    currency: "GBP",
    channel: "aw",
    awc: "safe_awc",
    commissionGroup: "NEW",
    customerAcquisition: "RETURNING",
  });
  assertEquals(order.customerAcquisition, "RETURNING");
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
deno test supabase/functions/_shared/awinCommission.test.ts supabase/functions/_shared/awinConversionApi.test.ts
```

Expected: FAIL because classification is absent and the current closed group enum rejects the future code.

- [ ] **Step 3: Implement dynamic code validation and immutable acquisition**

- `EnqueueAwinConversionInput.commissionGroup` becomes `string` and adds `customerAcquisition: "NEW" | "RETURNING"`.
- `enqueueAwinConversion` validates the group with `normalizeCommissionGroupCode` and persists both `commission_group` and `customer_acquisition`.
- `CommissionGroup` in `awinConversionApi.ts` becomes the branded/string output of the same validator, not a literal union.
- `OutboxRow` gains `customer_acquisition: string`.
- Worker validates a non-null stored acquisition as exactly `NEW|RETURNING` and passes it unchanged to `buildConversionOrder`; null historical Phase A rows omit the optional API field rather than being dead-lettered.
- Delete the current conditional that derives acquisition when `commissionGroup === "NEW"`.
- Current webhook calls `classifyAwinCustomer(priorPaidOrderCount)` and still passes `commissionGroup: "DEFAULT"`.

Before enqueue, the webhook selects the canonical order's `id, created_at`, then counts earlier orders for the same customer where `status = 'paid'`, `created_at < currentOrder.created_at`, and `id <> currentOrder.id`. Query failure throws the fixed sanitized error `awin_customer_classification_failed`, causing Stripe retry before the durable side-effect marker. Add a fake-client test proving zero prior rows becomes `NEW`, one prior row becomes `RETURNING`, and a count error rejects without enqueue.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused Deno tests again.

Expected: all pass, including the existing financial, encryption, retry, and at-most-once purchase-safety tests.

- [ ] **Step 5: Add failing migration-contract tests**

Tests read `20260813000002_awin_customer_acquisition.sql` and require:

- `customer_acquisition text` with `NEW|RETURNING` check;
- old `awin_conversion_outbox_group_check` dropped;
- new group format check matching `^[A-Z0-9_]{1,50}$`;
- foreign key from outbox group to `awin_commission_groups(code)`;
- guard trigger updated so `customer_acquisition` remains immutable;
- a precondition that refuses migration if any existing group code is absent from the imported group table;
- no update rewriting existing outbox identity/financial rows.

- [ ] **Step 6: Run migration-contract tests and verify RED**

Expected: FAIL because the migration is absent.

- [ ] **Step 7: Implement the additive migration**

Add nullable `customer_acquisition` first so historical Phase A rows remain valid. New webhook rows always populate it. Replace only the obsolete closed group constraint with the dynamic format check and foreign key. Recreate `guard_awin_conversion_outbox_immutable()` to include `customer_acquisition`; preserve every existing Phase A immutability check verbatim.

- [ ] **Step 8: Run full focused verification and commit Task 3**

Run:

```bash
deno test supabase/functions/_shared/awinCommission.test.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/awinOutbox.test.ts supabase/functions/_shared/purchaseSafety.test.ts
deno check supabase/functions/_shared/awinCommission.ts supabase/functions/_shared/awinConversionApi.ts supabase/functions/stripe-webhook/index.ts
deno fmt --check supabase/functions/_shared/awinCommission.ts supabase/functions/_shared/awinCommission.test.ts supabase/functions/_shared/awinConversionApi.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/stripe-webhook/index.ts supabase/functions/_shared/purchaseSafety.test.ts
git diff --check
```

Commit:

```bash
git add supabase/migrations/20260813000002_awin_customer_acquisition.sql supabase/functions/_shared/awinCommission.ts supabase/functions/_shared/awinCommission.test.ts supabase/functions/_shared/awinConversionApi.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/stripe-webhook/index.ts supabase/functions/_shared/purchaseSafety.test.ts
git commit -m "feat: separate AWIN customer acquisition"
```

---

### Task 4: Apply and prove Phase B in development

**Files:**
- Create: `scripts/awin/verify-policy-dev.mjs`
- Create: `scripts/awin/verify-policy-dev.test.mjs`
- Modify: `docs/awin-publisher-policy.md`
- Modify: `docs/manual-changes-log.md`

**Interfaces:**
- Consumes exact development project ref `rodvvmfzkyjsqbufkjbc` and the normalized fixture.
- Produces count/boolean-only development acceptance output.
- Makes no AWIN mutation and no production contact.

- [ ] **Step 1: Write failing development-verifier tests**

The pure verifier receives sanitized rows and must assert:

```js
assert.deepEqual(verifyPolicyState(state), {
  groupsImported: true,
  rateSetsImported: true,
  matrixJoinsValid: true,
  standardDefaultTenPercent: true,
  premiumUnknownCellsRemainNull: true,
  skimlinksProtected: true,
  skimlinksExternallyManaged: true,
  oneCurrentAssignmentPerPublisher: true,
  customerAcquisitionIndependent: true,
});
```

Adversarial tests fail for an orphan matrix row, two current assignments, an unprotected Skimlinks ID, a fabricated zero for an unknown premium matrix cell, or an acquisition value derived from group text.

- [ ] **Step 2: Run verifier tests and verify RED**

Run:

```bash
node --test scripts/awin/verify-policy-dev.test.mjs
```

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement the count/boolean-only verifier**

The module exports `verifyPolicyState(state)` and its CLI reads sanitized JSON from stdin or a mode-0600 temporary file. It never prints publisher free-text, tokens, service keys, raw `awc`, or database URLs. It refuses any project ref except exact development `rodvvmfzkyjsqbufkjbc`.

- [ ] **Step 4: Run all local verification before remote contact**

Run:

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts supabase/functions/_shared/awinCommission.test.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/awinOutbox.test.ts supabase/functions/_shared/purchaseSafety.test.ts
node --test scripts/awin/policy-import.test.mjs scripts/awin/verify-policy-dev.test.mjs
deno lint supabase/functions/_shared/awinPublisherPolicy.ts supabase/functions/_shared/awinCommission.ts supabase/functions/_shared/awinConversionApi.ts
git diff --check
```

Expected: all exit 0.

- [ ] **Step 5: Guard, lint, dry-run, and apply development migrations**

Read `.temp/project-ref` and authenticated project listing; both must equal `rodvvmfzkyjsqbufkjbc`. Stop before mutation on any mismatch. Then run:

```bash
supabase db lint --linked --fail-on error --profile supabase
supabase db push --dry-run --linked --yes --profile supabase
```

The dry run must list exactly:

```text
20260813000001_awin_commission_policy.sql
20260813000002_awin_customer_acquisition.sql
```

Only after that exact result, apply with `supabase db push --linked --yes --profile supabase`. Never link to or contact production ref `gvfptmjluxpngfjendbi`.

- [ ] **Step 6: Import the verified fixture into development and run acceptance**

Use service-role-only REST/RPC access through a mode-0600 temporary environment file. Upsert the normalized fixture into the five policy tables, run the verifier, and clean only synthetic test rows in `finally`. Keep the observed policy snapshot rows as Phase B development configuration. Acceptance must prove RLS denies anonymous/authenticated access, matrix joins are complete for known cells, unknown cells remain null, and all three Skimlinks IDs remain protected/current.

Do not deploy storefront code, send an AWIN conversion, create a payment, change a publisher, or mutate production.

- [ ] **Step 7: Record development evidence and commit Task 4**

Append to `docs/manual-changes-log.md`:

- exact development ref;
- migration filenames;
- sanitized acceptance booleans;
- imported policy observation date;
- explicit statement that AWIN and production were unchanged;
- remaining manual prerequisite: read back every `Solum Premium` matrix cell before assigning a direct premium publisher.

Run final local suites and commit:

```bash
git add scripts/awin/verify-policy-dev.mjs scripts/awin/verify-policy-dev.test.mjs docs/awin-publisher-policy.md docs/manual-changes-log.md
git commit -m "test: verify AWIN commission policy in development"
```

---

### Task 5: Final Phase B review and handoff

**Files:**
- Modify only if review finds a defect in Task 1–4 files.

**Interfaces:**
- Produces a clean reviewed branch and a manual AWIN assignment checklist.

- [ ] **Step 1: Run complete relevant verification**

```bash
deno test supabase/functions/_shared/awinPublisherPolicy.test.ts supabase/functions/_shared/awinCommission.test.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/awinOutbox.test.ts supabase/functions/_shared/purchaseSafety.test.ts
node --test scripts/awin/policy-import.test.mjs scripts/awin/verify-policy-dev.test.mjs
npm --prefix web test -- --run
npm --prefix web run build
npm --prefix web run lint
git diff --check origin/master...HEAD
```

The known unchanged web lint baseline may be documented but no new diagnostic in a touched file is allowed.

- [ ] **Step 2: Review the full branch against the spec**

Confirm:

- no closed commission-group enum remains in the delivery path;
- acquisition is read from its own immutable column;
- no category automatically grants premium;
- no unknown matrix value becomes zero;
- all Skimlinks IDs are protected by ID, not only mutable name;
- imports and verification cannot mutate AWIN;
- actual AWIN commission remains authoritative in downstream design;
- no secrets or raw `awc` appear in artefacts/logs.

- [ ] **Step 3: Produce the manual AWIN checklist**

Handoff must state that before assigning any direct publisher to `Solum Premium`, an operator must:

1. record the publisher ID and approval metadata;
2. read back every active commission-group cell in the `Solum Premium` rate set;
3. confirm the intended 15% cells and effective date;
4. schedule the publisher assignment in AWIN;
5. read back the effective assignment;
6. rerun the read-only import;
7. verify no Skimlinks publisher moved.

- [ ] **Step 4: Finish the branch**

Use `superpowers:requesting-code-review`, address material findings, rerun verification, then use `superpowers:finishing-a-development-branch`. Do not merge, push, deploy, or mutate AWIN without the user's separate explicit instruction.
