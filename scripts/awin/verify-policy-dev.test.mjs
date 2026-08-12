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
    publishers: SKIMLINKS_IDS.map((publisher_id) => ({
      publisher_id,
      retain_protected: true,
      commercial_tier: "externally_managed",
      rate_source: "skimlinks_managed",
      commission_rate_set_key: "program-standard",
    })),
    assignments: SKIMLINKS_IDS.map((publisher_id) => ({
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
  state.publishers[1].retain_protected = false;

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
  assert.deepEqual(Object.keys(JSON.parse(result.stdout)).sort(), [
    "counts",
    "verification",
  ]);
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
