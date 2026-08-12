import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { verifyPolicyState } from "./verify-policy-dev.mjs";

const DEV_PROJECT_REF = "rodvvmfzkyjsqbufkjbc";
const SKIMLINKS_IDS = [78888, 181013, 2573975];
const OBSERVED_PUBLISHER_IDS = [
  111,
  2939789,
  45628,
  171741,
  2944797,
  ...SKIMLINKS_IDS,
];
const CLI_PATH = fileURLToPath(
  new URL("./verify-policy-dev.mjs", import.meta.url),
);

function validState() {
  return {
    projectRef: DEV_PROJECT_REF,
    commissionGroups: [
      { code: "DEFAULT", active: true },
      { code: "PREMIUM", active: true },
    ],
    rateSets: [
      { rate_set_key: "program-standard", active: true },
      { rate_set_key: "solum-premium", active: true },
    ],
    rateValues: [
      {
        rate_set_key: "program-standard",
        commission_group_code: "DEFAULT",
        commission_type: "percentage",
        rate_bps: 1000,
        fixed_amount_pence: null,
      },
      {
        rate_set_key: "program-standard",
        commission_group_code: "PREMIUM",
        commission_type: "percentage",
        rate_bps: 1500,
        fixed_amount_pence: null,
      },
    ],
    publishers: OBSERVED_PUBLISHER_IDS.map((publisher_id) => {
      const skimlinks = SKIMLINKS_IDS.includes(publisher_id);
      return {
        publisher_id,
        retain_protected: skimlinks,
        commercial_tier: skimlinks ? "externally_managed" : "standard",
        rate_source: skimlinks ? "skimlinks_managed" : "awin_assignment",
        commission_rate_set_key: "program-standard",
      };
    }),
    assignments: OBSERVED_PUBLISHER_IDS.map((publisher_id) => ({
      publisher_id,
      rate_set_key: "program-standard",
      state: "current",
    })),
    acquisitionSamples: [
      { commission_group: "DEFAULT", customer_acquisition: "NEW" },
      { commission_group: "DEFAULT", customer_acquisition: "RETURNING" },
    ],
  };
}

test("verifies the observed development policy state", () => {
  assert.deepEqual(verifyPolicyState(validState()), {
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
});

test("fails closed for an orphan matrix row", () => {
  const state = validState();
  state.rateValues.push({
    rate_set_key: "missing-rate-set",
    commission_group_code: "DEFAULT",
    commission_type: "percentage",
    rate_bps: 1000,
    fixed_amount_pence: null,
  });

  assert.equal(verifyPolicyState(state).matrixJoinsValid, false);
});

test("fails closed when the observed group count is not exact", () => {
  const state = validState();
  state.commissionGroups.push({ code: "FUTURE", active: true });

  assert.equal(verifyPolicyState(state).groupsImported, false);
});

test("fails closed when the observed rate-set count is not exact", () => {
  const state = validState();
  state.rateSets.push({ rate_set_key: "future-rate-set", active: true });

  assert.equal(verifyPolicyState(state).rateSetsImported, false);
});

test("fails closed when the observed publisher snapshot is not exact", () => {
  const state = validState();
  state.publishers.push({
    publisher_id: 900001,
    retain_protected: false,
    commercial_tier: "standard",
    rate_source: "awin_assignment",
    commission_rate_set_key: "program-standard",
  });
  state.assignments.push({
    publisher_id: 900001,
    rate_set_key: "program-standard",
    state: "current",
  });

  assert.equal(
    verifyPolicyState(state).oneCurrentAssignmentPerPublisher,
    false,
  );
});

test("fails closed when the observed standard PREMIUM value changes", () => {
  const state = validState();
  state.rateValues[1].rate_bps = 1400;

  assert.equal(verifyPolicyState(state).matrixJoinsValid, false);
});

test("fails closed for two current assignments for one publisher", () => {
  const state = validState();
  state.assignments.push({
    publisher_id: 78888,
    rate_set_key: "solum-premium",
    state: "current",
  });

  assert.equal(
    verifyPolicyState(state).oneCurrentAssignmentPerPublisher,
    false,
  );
});

test("fails closed when any verified Skimlinks ID is unprotected", () => {
  const state = validState();
  state.publishers.find((row) => row.publisher_id === 181013)
    .retain_protected = false;

  assert.equal(verifyPolicyState(state).skimlinksProtected, false);
});

test("fails closed when more than three publishers are protected", () => {
  const state = validState();
  state.publishers[0].retain_protected = true;

  assert.equal(verifyPolicyState(state).skimlinksProtected, false);
});

test("fails closed when an unknown premium matrix cell is fabricated as zero", () => {
  const state = validState();
  state.rateValues.push({
    rate_set_key: "solum-premium",
    commission_group_code: "DEFAULT",
    commission_type: "percentage",
    rate_bps: 0,
    fixed_amount_pence: null,
  });

  assert.equal(
    verifyPolicyState(state).premiumUnknownCellsRemainNull,
    false,
  );
});

test("fails closed when acquisition is derived from group text", () => {
  const state = validState();
  state.acquisitionSamples = [
    { commission_group: "NEW", customer_acquisition: "NEW" },
    { commission_group: "RETURNING", customer_acquisition: "RETURNING" },
  ];

  assert.equal(
    verifyPolicyState(state).customerAcquisitionIndependent,
    false,
  );
});

test("CLI accepts sanitized stdin and emits booleans and counts only", () => {
  const input = validState();
  input.publisherFreeText = "must-not-appear";
  const result = spawnSync(
    process.execPath,
    [
      CLI_PATH,
      "--project-ref",
      DEV_PROJECT_REF,
    ],
    { input: JSON.stringify(input), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /must-not-appear/);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(output).sort(), [
    "counts",
    "verification",
  ]);
  assert.deepEqual(output.counts, {
    groups: 2,
    rateSets: 2,
    rateValues: 2,
    publishers: 8,
    currentAssignments: 8,
    protectedPublishers: 3,
  });
});

test("CLI sanitizes malformed JSON containing sensitive values", () => {
  const sensitiveValues = [
    "SUPPLIED_CONTENT_7c1f",
    "TOKEN_9e2a",
    "RAW_AWC_4d8b",
  ];
  for (const sensitiveValue of sensitiveValues) {
    const result = spawnSync(
      process.execPath,
      [CLI_PATH, "--project-ref", DEV_PROJECT_REF],
      { input: `${sensitiveValue}\n{}`, encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "policy_input_invalid\n");
    assert.doesNotMatch(result.stdout, new RegExp(sensitiveValue));
    assert.doesNotMatch(result.stderr, new RegExp(sensitiveValue));
  }
});

test("CLI refuses every project ref except exact development", () => {
  const result = spawnSync(
    process.execPath,
    [
      CLI_PATH,
      "--project-ref",
      "gvfptmjluxpngfjendbi",
    ],
    { input: JSON.stringify(validState()), encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /development project ref required/);
});

test("CLI reads only mode-0600 files in the temporary directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "solum-awin-policy-"));
  const inputPath = join(directory, "state.json");
  try {
    await writeFile(inputPath, JSON.stringify(validState()), { mode: 0o600 });
    const accepted = spawnSync(
      process.execPath,
      [
        CLI_PATH,
        "--project-ref",
        DEV_PROJECT_REF,
        "--input",
        inputPath,
      ],
      { encoding: "utf8" },
    );
    assert.equal(accepted.status, 0, accepted.stderr);

    await chmod(inputPath, 0o644);
    const rejected = spawnSync(
      process.execPath,
      [
        CLI_PATH,
        "--project-ref",
        DEV_PROJECT_REF,
        "--input",
        inputPath,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(rejected.status, 0);
    assert.equal(rejected.stdout, "");
    assert.match(rejected.stderr, /mode 0600/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
