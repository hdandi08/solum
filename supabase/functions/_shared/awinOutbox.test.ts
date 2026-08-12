// deno-lint-ignore-file no-import-prefix -- Match the repository's pinned Deno test dependency.
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decryptAwc,
  encryptAwc,
  hashAwc,
  retryDecision,
} from "./awinOutbox.ts";
import migrationSql from "../../migrations/20260811000001_awin_conversion_outbox.sql" with {
  type: "text",
};
import acceptanceMigrationSql from "../../migrations/20260812000001_awin_conversion_batch_acceptance.sql" with {
  type: "text",
};
import acceptanceInvariantMigrationSql from "../../migrations/20260812000002_awin_conversion_batch_acceptance_invariants.sql" with {
  type: "text",
};

const SECRET = "development-secret-development-secret";

Deno.test("AWC encryption round-trips in a versioned envelope without plaintext output", async () => {
  const encrypted = await encryptAwc("129171_example", SECRET);

  assertEquals(encrypted.startsWith("v1."), true);
  assertEquals(encrypted.split(".").length, 3);
  assertEquals(encrypted.includes("129171_example"), false);
  assertEquals(await decryptAwc(encrypted, SECRET), "129171_example");
});

Deno.test("AWC encryption uses a fresh IV and authenticates ciphertext", async () => {
  const first = await encryptAwc("129171_example", SECRET);
  const second = await encryptAwc("129171_example", SECRET);

  assertNotEquals(first, second);
  const tampered = `${first.slice(0, -1)}${first.endsWith("A") ? "B" : "A"}`;
  await assertRejects(() => decryptAwc(tampered, SECRET));
  await assertRejects(() => decryptAwc(first, `${SECRET}-wrong`));
});

Deno.test("AWC crypto rejects malformed input and weak encryption secrets", async () => {
  await assertRejects(() => encryptAwc("", SECRET), TypeError, "awc");
  await assertRejects(
    () => encryptAwc("129171_example", "too-short"),
    TypeError,
    "secret",
  );
  await assertRejects(
    () => decryptAwc("v2.invalid.invalid", SECRET),
    TypeError,
    "envelope",
  );
});

Deno.test("AWC hashing produces a stable one-way SHA-256 fingerprint", async () => {
  assertEquals(
    await hashAwc("129171_example"),
    "dda3eb5d2f26b76741a328f595c7992315fc75a1f63f5261ce5f49aaadec222b",
  );
});

Deno.test("retry decision separates transient, timeout, and permanent responses", () => {
  assertEquals(
    retryDecision({ status: 408, attempt: 1, jitterMs: 0 }).state,
    "retry",
  );
  assertEquals(
    retryDecision({ status: 425, attempt: 1, jitterMs: 0 }).state,
    "retry",
  );
  assertEquals(
    retryDecision({ status: 429, attempt: 1, jitterMs: 0 }).state,
    "retry",
  );
  assertEquals(
    retryDecision({ status: 500, attempt: 1, jitterMs: 0 }).state,
    "retry",
  );
  assertEquals(retryDecision({ attempt: 1, jitterMs: 0 }).state, "retry");
  assertEquals(
    retryDecision({ status: 400, attempt: 1, jitterMs: 0 }).state,
    "dead_letter",
  );
  assertEquals(
    retryDecision({ status: 500, attempt: 8, jitterMs: 0 }).state,
    "dead_letter",
  );
});

Deno.test("retry decision applies deterministic capped exponential backoff", () => {
  assertEquals(retryDecision({ status: 429, attempt: 1, jitterMs: 123 }), {
    state: "retry",
    nextAttemptMs: 15_123,
  });
  assertEquals(retryDecision({ status: 503, attempt: 7, jitterMs: 77 }), {
    state: "retry",
    nextAttemptMs: 900_077,
  });
});

Deno.test("retry decision validates bounded provider inputs", () => {
  assertThrows(
    () => retryDecision({ status: 99, attempt: 1, jitterMs: 0 }),
    TypeError,
    "status",
  );
  assertThrows(
    () => retryDecision({ status: 500, attempt: 0, jitterMs: 0 }),
    TypeError,
    "attempt",
  );
  assertThrows(
    () => retryDecision({ status: 500, attempt: 1, jitterMs: 15_000 }),
    TypeError,
    "jitterMs",
  );

  const retry = retryDecision({ status: 500, attempt: 1 });
  assert(
    retry.state === "retry" && retry.nextAttemptMs >= 15_000 &&
      retry.nextAttemptMs < 30_000,
  );
});

const normalizedMigration = migrationSql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .toLowerCase()
  .replace(/\s+/g, " ");

function migrationFunction(name: string): string {
  const marker = `create or replace function public.${name}(`;
  const start = normalizedMigration.indexOf(marker);
  assert(start >= 0, `migration must define public.${name}`);
  const next = normalizedMigration.indexOf(
    "create or replace function public.",
    start + marker.length,
  );
  return normalizedMigration.slice(start, next >= 0 ? next : undefined);
}

const normalizedAcceptanceMigration = acceptanceMigrationSql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .toLowerCase()
  .replace(/\s+/g, " ");

const normalizedAcceptanceInvariantMigration = acceptanceInvariantMigrationSql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .toLowerCase()
  .replace(/\s+/g, " ");

function acceptanceMigrationFunction(name: string): string {
  const marker = `create or replace function public.${name}(`;
  const start = normalizedAcceptanceMigration.indexOf(marker);
  assert(start >= 0, `acceptance migration must define public.${name}`);
  const next = normalizedAcceptanceMigration.indexOf(
    "create or replace function public.",
    start + marker.length,
  );
  return normalizedAcceptanceMigration.slice(
    start,
    next >= 0 ? next : undefined,
  );
}

Deno.test("outbox migration stores the immutable financial and encrypted attribution contract", () => {
  for (
    const fragment of [
      "order_ref text not null unique",
      "order_id uuid not null unique",
      "customer_paid_pence integer not null",
      "discount_pence integer not null",
      "delivery_pence integer not null",
      "vat_pence integer not null",
      "amount_pence integer not null",
      "financial_basis_version text not null default 'solum-commission-v1'",
      "awc_ciphertext text not null",
      "awc_hash text not null",
      "worker_id uuid",
      "lease_expires_at timestamptz",
    ]
  ) {
    assert(
      normalizedMigration.includes(fragment),
      `migration must include ${fragment}`,
    );
  }

  assertEquals(/\bawc\s+text\b/.test(normalizedMigration), false);
  assert(
    /order_ref text not null unique check \([^,]+order_ref ~ '\^pi_/.test(
      normalizedMigration,
    ),
  );
  assert(
    /state in \('pending',\s*'processing',\s*'sent',\s*'retry',\s*'dead_letter',\s*'suppressed'\)/
      .test(normalizedMigration),
  );
  assert(
    /channel in \('aw',\s*'display',\s*'ppc',\s*'email'\)/.test(
      normalizedMigration,
    ),
  );
  assert(
    /commission_group in \('default',\s*'new',\s*'existing'\)/.test(
      normalizedMigration,
    ),
  );
  assert(
    /amount_pence = customer_paid_pence - delivery_pence - vat_pence/.test(
      normalizedMigration,
    ),
  );
  assert(
    /create trigger guard_awin_conversion_outbox_immutable/.test(
      normalizedMigration,
    ),
  );
});

Deno.test("outbox migration denies clients and exposes only hardened service-role RPCs", () => {
  assert(
    normalizedMigration.includes(
      "alter table public.awin_conversion_outbox enable row level security",
    ),
  );
  assert(
    /revoke all on table public\.awin_conversion_outbox from public, anon, authenticated/
      .test(normalizedMigration),
  );
  assert(
    /grant (select, insert, update, delete|all) on table public\.awin_conversion_outbox to service_role/
      .test(normalizedMigration),
  );

  for (
    const name of [
      "claim_awin_conversion_batch",
      "complete_awin_conversion",
      "retry_awin_conversion",
    ]
  ) {
    const sql = migrationFunction(name);
    assert(
      sql.includes("security definer"),
      `${name} must use SECURITY DEFINER`,
    );
    assert(
      sql.includes("set search_path = pg_catalog"),
      `${name} must pin search_path`,
    );
    assert(
      sql.includes(`alter function public.${name}`),
      `${name} must set a trusted owner`,
    );
    assert(/owner to postgres/.test(sql), `${name} must be owned by postgres`);
    assert(
      /from public, anon, authenticated/.test(sql),
      `${name} must revoke browser roles`,
    );
    assert(/to service_role/.test(sql), `${name} must grant only service_role`);
  }
});

Deno.test("claim RPC atomically leases bounded due work and recovers expired claims", () => {
  const sql = migrationFunction("claim_awin_conversion_batch");

  assert(/p_limit < 1 or p_limit > 100/.test(sql));
  assert(/p_lease_seconds < 10 or p_lease_seconds > 300/.test(sql));
  assert(
    /state = 'processing'[^;]+worker_id = p_worker_id[^;]+lease_expires_at =/
      .test(sql),
  );
  assert(/attempt_count = [a-z_.]*attempt_count \+ 1/.test(sql));
  assert(
    /state = 'processing'[^;]+lease_expires_at <= pg_catalog\.clock_timestamp\(\)/
      .test(sql),
  );
  assert(/for update skip locked/.test(sql));
  assert(/limit p_limit/.test(sql));
  assert(sql.indexOf("candidates as (") < sql.indexOf("exhausted as ("));
  assert(
    /exhausted as \( update public\.awin_conversion_outbox as expired[^;]+from candidates[^;]+expired\.id = candidates\.id[^;]+candidates\.attempt_count >= 8/
      .test(sql),
  );
  assert(
    /lease_expires_at = pg_catalog\.clock_timestamp\(\) \+ pg_catalog\.make_interval/
      .test(sql),
  );
});

Deno.test("completion and retry transitions require lease ownership and live leases", () => {
  const complete = migrationFunction("complete_awin_conversion");
  const retry = migrationFunction("retry_awin_conversion");

  for (const sql of [complete, retry]) {
    assert(/state = 'processing'/.test(sql));
    assert(/worker_id = p_worker_id/.test(sql));
    assert(/lease_expires_at > pg_catalog\.clock_timestamp\(\)/.test(sql));
  }

  assert(/p_http_status < 200 or p_http_status > 299/.test(complete));
  assert(/p_state not in \('retry',\s*'dead_letter'\)/.test(retry));
  assert(
    /p_next_attempt_at > pg_catalog\.clock_timestamp\(\) \+ interval '7 days'/
      .test(retry),
  );
  assert(/p_error_code !~ '\^\[a-z0-9_\]\+\$'/.test(retry));
  assert(
    /state = case when p_state = 'retry' and outbox\.attempt_count >= 8 then 'dead_letter' else p_state end/
      .test(retry),
  );
  assert(
    /next_attempt_at = case when p_state = 'retry' and outbox\.attempt_count >= 8 then null else p_next_attempt_at end/
      .test(retry),
  );
});

Deno.test("acceptance migration retains acknowledged 202 batches outside normal lease recovery", () => {
  const claim = acceptanceMigrationFunction("claim_awin_conversion_batch");

  assert(
    normalizedAcceptanceMigration.includes(
      "add column next_reconcile_at timestamptz",
    ),
  );
  assert(
    normalizedAcceptanceMigration.includes(
      "add column provider_batch_accepted_at timestamptz",
    ),
    "the bounded reconciliation timeout needs an immutable acceptance baseline",
  );
  assert(
    /state <> 'processing' or provider_batch_id is null or provider_batch_accepted_at is not null/
      .test(normalizedAcceptanceInvariantMigration),
    "every accepted processing row must retain its timeout baseline",
  );
  assert(
    normalizedAcceptanceMigration.includes(
      "drop constraint awin_conversion_outbox_lease_state_check",
    ),
  );
  assert(
    /constraint awin_conversion_outbox_reconciliation_state_check check \( \(state = 'processing' and provider_batch_id is not null\) = \(next_reconcile_at is not null\) \)/
      .test(normalizedAcceptanceMigration),
  );
  assert(
    /candidate\.state = 'processing' and candidate\.provider_batch_id is null and candidate\.next_reconcile_at is null and candidate\.lease_expires_at <= pg_catalog\.clock_timestamp\(\)/
      .test(claim),
    "only unaccepted expired processing rows may be reclaimed",
  );
  assert(
    /candidate\.state = 'processing'[^;]+candidate\.lease_expires_at <= pg_catalog\.clock_timestamp\(\)/
      .test(claim),
    "crashed pre-acceptance claims must remain recoverable",
  );
  assert(
    /create index awin_conversion_outbox_reconciliation_due_idx/.test(
      normalizedAcceptanceMigration,
    ),
  );
});

Deno.test("acceptance RPC is service-role-only and requires a current owner lease", () => {
  const accept = acceptanceMigrationFunction("accept_awin_conversion_batch");

  assert(accept.includes("security definer"));
  assert(accept.includes("set search_path = pg_catalog"));
  assert(
    /p_http_status is distinct from 202/.test(accept),
    "NULL or non-202 status must be rejected",
  );
  assert(/p_batch_id !~ '\^\[a-za-z0-9\._:-\]\+\$'/.test(accept));
  assert(
    /p_next_reconcile_at <= pg_catalog\.clock_timestamp\(\)/.test(accept),
  );
  assert(
    /state = 'processing'[^;]+next_reconcile_at = p_next_reconcile_at[^;]+provider_batch_id = p_batch_id[^;]+provider_batch_accepted_at = pg_catalog\.statement_timestamp\(\)[^;]+worker_id = null[^;]+lease_expires_at = null/
      .test(accept),
  );
  assert(/outbox\.worker_id = p_worker_id/.test(accept));
  assert(
    /outbox\.lease_expires_at > pg_catalog\.clock_timestamp\(\)/.test(accept),
  );
  assert(/outbox\.provider_batch_id is null/.test(accept));
  assert(/outbox\.next_reconcile_at is null/.test(accept));
  assert(
    /alter function public\.accept_awin_conversion_batch\(uuid, uuid, integer, text, timestamptz\) owner to postgres/
      .test(normalizedAcceptanceMigration),
  );
  assert(
    /revoke all on function public\.accept_awin_conversion_batch\(uuid, uuid, integer, text, timestamptz\) from public, anon, authenticated/
      .test(normalizedAcceptanceMigration),
  );
  assert(
    /grant execute on function public\.accept_awin_conversion_batch\(uuid, uuid, integer, text, timestamptz\) to service_role/
      .test(normalizedAcceptanceMigration),
  );
});
