# AWIN publisher and commission policy

This document records how SOLUM interprets the read-only AWIN policy snapshot
observed on 12 August 2026. The fixture and generated CSV are audit evidence of
the account state seen at that time. They are not instructions or permission to
change a publisher partnership, commission rate, or AWIN configuration.

## Commission interpretation

Publisher category is for reporting only; **category does not select
commission**. The expected nominal rate is inferred from both dimensions of the
observed policy:

```text
publisher rate-set assignment + transaction commission-group code = expected rate
```

Neither dimension is sufficient on its own. Customer acquisition status is a
separate concept and does not select either dimension.

The account snapshot records `Program Standard Commission Rates` with observed
percentage values of 1,000 basis points for `DEFAULT` and 1,500 basis points for
`PREMIUM`. It also records the existence of `Solum Premium`, but no rate-value
cells for that rate set were verified. Missing matrix values are `unverified`,
never zero. They remain absent from the JSON fixture and render as `unverified`
with blank amount fields in an audit row if a future assignment encounters one.

The actual transaction commission reported by AWIN is authoritative for
financial reporting. The local expected rate is context for reconciliation and
does not replace AWIN's transaction value.

## Publisher assignments and protection

The snapshot contains eight current publishers assigned to
`program-standard`. `Solum Premium` has zero current publisher assignments.
Unknown publisher regions and primary types remain null; names are not used to
invent missing profile attributes.

All three verified Skimlinks publisher IDs remain protected and externally
managed:

- `78888` — Skimlinks
- `181013` — Skimlinks Coupon Deal sites
- `2573975` — Skimlinks Rewards sites

Protection is keyed only by those verified immutable publisher IDs. A different
publisher is not protected merely because its mutable display name contains
"Skimlinks".

Their current programme-standard assignments are preserved. SOLUM automation
must not move them, end them, or reinterpret their externally managed
commercial terms.

## Premium approval gate

A direct premium assignment requires explicit publisher-level approval. Before
assigning any direct publisher to `Solum Premium`, an operator must record the
publisher-specific reason, approver, and approval timestamp, then read back all
active commission-group values in that rate set from AWIN. The importer rejects
a current `solum-premium` assignment unless those approval fields and all active
matrix cells are present; its normalized tier and rate source come from that
authoritative assignment. Unknown cells cannot be inferred from display names
or from the observed programme-standard matrix.

## Read-only importer

[`scripts/awin/policy-import.mjs`](../scripts/awin/policy-import.mjs) only reads a
local JSON export, validates and normalizes it, and optionally writes a local
CSV. It cannot change AWIN: it has no partnership or rate mutation mode, reads
no AWIN token, and defaults to dry-run when `--output` is omitted.

Validate the checked-in snapshot without writing:

```bash
node scripts/awin/policy-import.mjs \
  --input scripts/awin/fixtures/policy-export.json
```

Regenerate the checked-in audit CSV:

```bash
node scripts/awin/policy-import.mjs \
  --input scripts/awin/fixtures/policy-export.json \
  --output artefacts/awin-commission-policy.csv
```

The CLI reports counts and local paths only. It does not print publisher names,
free-text approval data, credentials, or raw AWIN account responses.

## Development acceptance

Phase B was applied only to Supabase development project
`rodvvmfzkyjsqbufkjbc` on 13 August 2026. The linked lint found no schema
errors, and the exact dry-run and apply contained only:

- `20260813000001_awin_commission_policy.sql`
- `20260813000002_awin_customer_acquisition.sql`

The preserved observed snapshot read back as two groups, two rate sets, two
known rate values, eight publishers, eight current assignments, and three
protected publishers. Count/boolean-only acceptance confirmed valid matrix
joins, the 10% programme-standard `DEFAULT` cell, absent rather than fabricated
`Solum Premium` values, all three Skimlinks protections/current assignments,
one current assignment per publisher, and independent customer acquisition.

The anonymous REST probe was live evidence: it was rejected at the table
authorization boundary. Authenticated denial was not proved with a live valid
authenticated session in the final read-only run; its evidence is the applied
migration contract, which enables RLS and explicitly revokes `authenticated`
access on all five policy tables. The existing static migration test directly
covers the publisher-table revoke, while all five applied clauses were inspected
in the migration and the linked schema lint reported no errors. No storefront
function was deployed, no AWIN provider call was made, and production was not
contacted or changed.

The premium gate remains manual: read back every active `Solum Premium`
rate-set/group matrix cell before assigning any direct premium publisher.
