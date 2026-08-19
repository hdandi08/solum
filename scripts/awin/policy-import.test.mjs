import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  normalizePolicyExport,
  renderPolicyCsv,
  sourceHash,
  validatePolicyExport,
} from "./policy-import.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/policy-export.json", import.meta.url), "utf8"),
);

function validExport(overrides = {}) {
  return {
    observedAt: "2026-08-12T21:33:00Z",
    commissionGroups: [
      { code: "KIT_2027", name: "Kit 2027", active: true },
    ],
    rateSets: [
      {
        key: "standard",
        name: "Programme Standard Commission Rates",
        active: true,
      },
    ],
    rateValues: [
      {
        rateSetKey: "standard",
        groupCode: "KIT_2027",
        commissionType: "percentage",
        rateBps: 1200,
      },
    ],
    publishers: [
      {
        id: 900001,
        name: "Editorial Example",
        primaryRegion: null,
        primaryType: "Editorial Content",
        status: "joined",
      },
    ],
    assignments: [
      {
        publisherId: 900001,
        rateSetKey: "standard",
        state: "current",
        effectiveFrom: "2026-08-12T00:00:00Z",
      },
    ],
    ...overrides,
  };
}

function premiumExport({ publisher = {}, rateValues, assignment = {} } = {}) {
  return validExport({
    commissionGroups: [
      { code: "DEFAULT", name: "Default", active: true },
      { code: "PREMIUM", name: "Premium", active: true },
    ],
    rateSets: [
      { key: "standard", name: "Standard", active: true },
      { key: "solum-premium", name: "Solum Premium", active: true },
    ],
    rateValues: rateValues ?? [
      {
        rateSetKey: "standard",
        groupCode: "DEFAULT",
        commissionType: "percentage",
        rateBps: 1000,
      },
      {
        rateSetKey: "standard",
        groupCode: "PREMIUM",
        commissionType: "percentage",
        rateBps: 1500,
      },
      {
        rateSetKey: "solum-premium",
        groupCode: "DEFAULT",
        commissionType: "percentage",
        rateBps: 1500,
      },
      {
        rateSetKey: "solum-premium",
        groupCode: "PREMIUM",
        commissionType: "percentage",
        rateBps: 1500,
      },
    ],
    publishers: [
      {
        id: 900001,
        name: "Editorial Example",
        primaryRegion: null,
        primaryType: "Editorial Content",
        status: "joined",
        approvalReason: "Approved direct commercial terms",
        approvedBy: "Commercial owner",
        approvedAt: "2026-08-12T20:00:00Z",
        ...publisher,
      },
    ],
    assignments: [
      {
        publisherId: 900001,
        rateSetKey: "solum-premium",
        state: "current",
        effectiveFrom: "2026-08-12T21:33:00Z",
        ...assignment,
      },
    ],
  });
}

test("preserves a dynamic group/rate-set matrix", () => {
  const normalized = normalizePolicyExport(validExport());

  assert.equal(normalized.rateValues[0].rate_bps, 1200);
  assert.equal(normalized.publishers[0].commercial_tier, "standard");
  assert.equal(normalized.publishers[0].category, "editorial");
});

test("protects verified Skimlinks IDs and preserves their observed assignment", () => {
  const normalized = normalizePolicyExport(fixture);
  const skimlinks = normalized.publishers.filter((row) =>
    [78888, 181013, 2573975].includes(row.publisher_id)
  );

  assert.equal(skimlinks.length, 3);
  assert.equal(
    skimlinks.every((row) =>
      row.retain_protected &&
      row.commercial_tier === "externally_managed" &&
      row.rate_source === "skimlinks_managed" &&
      row.commission_rate_set_key === "program-standard"
    ),
    true,
  );
  assert.match(renderPolicyCsv(normalized), /Skimlinks Rewards sites/);
});

test("keeps the observed snapshot exact and leaves premium matrix cells absent", () => {
  const normalized = normalizePolicyExport(fixture);

  assert.deepEqual(
    normalized.publishers.map((row) => [
      row.publisher_id,
      row.publisher_name,
      row.primary_type,
      row.primary_region,
    ]),
    [
      [111, "Awin Test Publisher - do not suspend", null, null],
      [2939789, "Creovia", "Content Creators & Influencers", null],
      [45628, "Example Publisher", null, null],
      [171741, "Rank", null, null],
      [2944797, "Sensible Content Group", null, null],
      [78888, "Skimlinks", "Sub Networks", null],
      [181013, "Skimlinks Coupon Deal sites", "Sub Networks", null],
      [2573975, "Skimlinks Rewards sites", "Cashback", null],
    ],
  );
  assert.equal(normalized.assignments.length, 8);
  assert.equal(
    normalized.assignments.every((row) =>
      row.rate_set_key === "program-standard" &&
      row.effective_from === "2026-08-12T21:33:00.000Z"
    ),
    true,
  );
  assert.equal(
    normalized.rateValues.some((row) => row.rate_set_key === "solum-premium"),
    false,
  );
});

test("hashes recursively key-sorted compact JSON without reordering arrays", () => {
  assert.equal(
    sourceHash({ b: { c: 2 }, a: 1 }),
    "007f2c1c104514608c3cdf42ec59d710d0888592c1d1f72437d9b075093617b8",
  );
  assert.notEqual(sourceHash(["first", "second"]), sourceHash(["second", "first"]));
});

test("rejects duplicate group codes and unsafe codes", () => {
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          commissionGroups: [
            { code: "DEFAULT", name: "Default", active: true },
            { code: "DEFAULT", name: "Default again", active: true },
          ],
          rateValues: [],
        }),
      ),
    /duplicate commission group code DEFAULT/,
  );
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          commissionGroups: [
            { code: "bad-code", name: "Unsafe", active: true },
          ],
          rateValues: [],
        }),
      ),
    /unsafe commission group code/,
  );
});

test("rejects duplicate rate-set keys and orphan rate values", () => {
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          rateSets: [
            { key: "standard", name: "Standard", active: true },
            { key: "standard", name: "Duplicate", active: true },
          ],
        }),
      ),
    /duplicate rate-set key standard/,
  );
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          rateValues: [
            {
              rateSetKey: "missing",
              groupCode: "KIT_2027",
              commissionType: "percentage",
              rateBps: 1200,
            },
          ],
        }),
      ),
    /orphan rate value/,
  );
});

test("rejects orphan assignments and multiple current assignments", () => {
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          assignments: [
            {
              publisherId: 999999,
              rateSetKey: "standard",
              state: "current",
              effectiveFrom: "2026-08-12T00:00:00Z",
            },
          ],
        }),
      ),
    /orphan assignment/,
  );
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          assignments: [
            {
              publisherId: 900001,
              rateSetKey: "standard",
              state: "current",
              effectiveFrom: "2026-08-12T00:00:00Z",
            },
            {
              publisherId: 900001,
              rateSetKey: "standard",
              state: "current",
              effectiveFrom: "2026-08-13T00:00:00Z",
            },
          ],
        }),
      ),
    /multiple current assignments for publisher 900001/,
  );
});

test("rejects invalid basis points and incomplete premium approval", () => {
  assert.throws(
    () =>
      validatePolicyExport(
        validExport({
          rateValues: [
            {
              rateSetKey: "standard",
              groupCode: "KIT_2027",
              commissionType: "percentage",
              rateBps: 10001,
            },
          ],
        }),
      ),
    /rateBps must be an integer from 0 to 10000/,
  );
  assert.throws(
    () =>
      validatePolicyExport(
        premiumExport({
          publisher: {
            commercialTier: "premium",
            approvalReason: undefined,
            approvedBy: undefined,
            approvedAt: undefined,
          },
        }),
      ),
    /premium publisher 900001 requires approval metadata/,
  );
});

test("renders the exact audit columns and never fabricates unknown values as zero", () => {
  const input = validExport({
    commissionGroups: [
      { code: "DEFAULT", name: "Default", active: true },
      { code: "UNVERIFIED", name: "Unverified", active: true },
    ],
    rateValues: [
      {
        rateSetKey: "standard",
        groupCode: "DEFAULT",
        commissionType: "percentage",
        rateBps: 1000,
      },
    ],
  });
  const csv = renderPolicyCsv(normalizePolicyExport(input));
  const [header, known, unknown] = csv.trimEnd().split("\n");

  assert.equal(
    header,
    "publisher_id,publisher_name,category,relationship_status,retain_protected,commercial_tier,rate_source,commission_rate_set_key,commission_rate_set_name,group_code,commission_type,rate_bps,fixed_amount_pence,currency,approval_reason,approved_by,approved_at,observed_at",
  );
  assert.match(known, /,DEFAULT,percentage,1000,,,,,/);
  const unknownCells = unknown.split(",");
  assert.equal(unknownCells[10], "unverified");
  assert.deepEqual(unknownCells.slice(11, 17), ["", "", "", "", "", ""]);
});

test("rejects an unapproved solum-premium assignment", () => {
  const input = premiumExport({
    publisher: {
      approvalReason: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
    },
  });

  assert.throws(
    () => validatePolicyExport(input),
    /premium publisher 900001 requires approval metadata/,
  );
});

test("rejects a declared premium publisher assigned to the wrong rate set", () => {
  const input = premiumExport({
    publisher: { commercialTier: "premium" },
    assignment: { rateSetKey: "standard" },
  });

  assert.throws(
    () => validatePolicyExport(input),
    /declared premium publisher 900001 must be assigned to solum-premium/,
  );
});

test("rejects a missing active premium matrix cell when a premium assignment exists", () => {
  const input = premiumExport({
    rateValues: [
      {
        rateSetKey: "standard",
        groupCode: "DEFAULT",
        commissionType: "percentage",
        rateBps: 1000,
      },
      {
        rateSetKey: "standard",
        groupCode: "PREMIUM",
        commissionType: "percentage",
        rateBps: 1500,
      },
      {
        rateSetKey: "solum-premium",
        groupCode: "DEFAULT",
        commissionType: "percentage",
        rateBps: 1500,
      },
    ],
  });

  assert.throws(
    () => validatePolicyExport(input),
    /solum-premium is missing an active rate value for PREMIUM/,
  );
});

test("accepts a fully approved premium assignment with every active matrix cell", () => {
  const normalized = normalizePolicyExport(premiumExport());
  const publisher = normalized.publishers[0];

  assert.equal(publisher.commercial_tier, "premium");
  assert.equal(publisher.rate_source, "approved_exception");
  assert.equal(publisher.commission_rate_set_key, "solum-premium");
  assert.equal(publisher.exception_reason, "Approved direct commercial terms");
  assert.equal(publisher.exception_approved_by, "Commercial owner");
  assert.equal(publisher.exception_approved_at, "2026-08-12T20:00:00.000Z");
});

test("keeps a Skimlinks lookalike name on another ID unprotected", () => {
  const input = validExport({
    publishers: [
      {
        id: 900001,
        name: "Skimlinks Lookalike Editorial",
        primaryRegion: null,
        primaryType: "Editorial Content",
        status: "joined",
      },
    ],
  });
  const publisher = normalizePolicyExport(input).publishers[0];

  assert.equal(publisher.category, "editorial");
  assert.equal(publisher.retain_protected, false);
  assert.equal(publisher.commercial_tier, "standard");
  assert.equal(publisher.rate_source, "awin_assignment");
});

test("CLI sanitizes invalid JSON without echoing supplied secrets", () => {
  const directory = mkdtempSync(join(tmpdir(), "solum-policy-import-"));
  const input = join(directory, "invalid.json");
  const sentinel = "RAW_AWC_SENTINEL_TOKEN_129171";
  writeFileSync(input, `${sentinel}{\"awc\":\"raw_awc_fragment\"}`, "utf8");

  try {
    const result = spawnSync(
      process.execPath,
      [new URL("./policy-import.mjs", import.meta.url).pathname, "--input", input],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "policy_input_invalid\n");
    assert.doesNotMatch(
      `${result.stdout}${result.stderr}`,
      /RAW_AWC_SENTINEL_TOKEN_129171|raw_awc_fragment|awc/i,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
