import { lstat, readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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

function rows(value, key) {
  return value !== null && typeof value === "object" &&
      Array.isArray(value[key])
    ? value[key]
    : [];
}

function uniqueKeys(values, keyFor) {
  const keys = values.map(keyFor);
  return keys.length === new Set(keys).size;
}

export function verifyPolicyState(state) {
  const commissionGroups = rows(state, "commissionGroups");
  const rateSets = rows(state, "rateSets");
  const rateValues = rows(state, "rateValues");
  const publishers = rows(state, "publishers");
  const assignments = rows(state, "assignments");
  const acquisitionSamples = rows(state, "acquisitionSamples");

  const groupCodes = new Set(commissionGroups.map((row) => row.code));
  const rateSetKeys = new Set(rateSets.map((row) => row.rate_set_key));
  const publisherIds = new Set(publishers.map((row) => row.publisher_id));
  const requiredGroups = ["DEFAULT", "PREMIUM"];
  const requiredRateSets = ["program-standard", "solum-premium"];

  const groupsImported = commissionGroups.length === 2 &&
    requiredGroups.every((code) =>
      commissionGroups.some((row) => row.code === code && row.active === true)
    ) && uniqueKeys(commissionGroups, (row) => row.code);
  const rateSetsImported = rateSets.length === 2 &&
    requiredRateSets.every((key) =>
      rateSets.some((row) =>
        row.rate_set_key === key && row.active === true
      )
    ) && uniqueKeys(rateSets, (row) => row.rate_set_key);

  const expectedMatrix = new Map([
    ["program-standard:DEFAULT", 1000],
    ["program-standard:PREMIUM", 1500],
  ]);
  const matrixJoinsValid = rateValues.length === 2 && uniqueKeys(
    rateValues,
    (row) => `${row.rate_set_key}:${row.commission_group_code}`,
  ) && rateValues.every((row) =>
    rateSetKeys.has(row.rate_set_key) &&
    groupCodes.has(row.commission_group_code) &&
    row.commission_type === "percentage" &&
    row.rate_bps === expectedMatrix.get(
      `${row.rate_set_key}:${row.commission_group_code}`,
    ) &&
    row.fixed_amount_pence === null
  );

  const standardDefault = rateValues.filter((row) =>
    row.rate_set_key === "program-standard" &&
    row.commission_group_code === "DEFAULT"
  );
  const standardDefaultTenPercent = standardDefault.length === 1 &&
    standardDefault[0].commission_type === "percentage" &&
    standardDefault[0].rate_bps === 1000 &&
    standardDefault[0].fixed_amount_pence === null;

  const premiumCells = rateValues.filter((row) =>
    row.rate_set_key === "solum-premium"
  );
  const premiumUnknownCellsRemainNull = premiumCells.every((row) =>
    row.commission_type === null && row.rate_bps === null &&
    row.fixed_amount_pence === null
  );

  const publishersById = new Map(
    publishers.map((row) => [row.publisher_id, row]),
  );
  const publisherIdsExact = publishers.length === 8 &&
    uniqueKeys(publishers, (row) => row.publisher_id) &&
    OBSERVED_PUBLISHER_IDS.every((publisherId) =>
      publishersById.has(publisherId)
    );
  const protectedPublishers = publishers.filter((row) =>
    row.retain_protected === true
  );
  const skimlinksProtected = publisherIdsExact &&
    protectedPublishers.length === 3 &&
    SKIMLINKS_IDS.every((publisherId) =>
      publishersById.get(publisherId)?.retain_protected === true
    );
  const skimlinksExternallyManaged = publisherIdsExact &&
    publishers.every((publisher) => {
      const skimlinks = SKIMLINKS_IDS.includes(publisher.publisher_id);
      if (!skimlinks) {
        return publisher.retain_protected === false &&
          publisher.commercial_tier === "standard" &&
          publisher.rate_source === "awin_assignment" &&
          publisher.commission_rate_set_key === "program-standard";
      }
      return publisher.commercial_tier === "externally_managed" &&
        publisher.rate_source === "skimlinks_managed" &&
        publisher.commission_rate_set_key === "program-standard";
    });

  const currentAssignments = assignments.filter((row) =>
    row.state === "current"
  );
  const currentCounts = new Map();
  for (const assignment of currentAssignments) {
    currentCounts.set(
      assignment.publisher_id,
      (currentCounts.get(assignment.publisher_id) ?? 0) + 1,
    );
  }
  const oneCurrentAssignmentPerPublisher = publisherIdsExact &&
    currentAssignments.length === 8 &&
    assignments.every((row) =>
      publisherIds.has(row.publisher_id) && rateSetKeys.has(row.rate_set_key)
    ) &&
    OBSERVED_PUBLISHER_IDS.every((publisherId) =>
      currentCounts.get(publisherId) === 1 &&
      currentAssignments.some((row) =>
        row.publisher_id === publisherId &&
        row.rate_set_key === "program-standard"
      )
    );

  const acquisitionByGroup = new Map();
  let validAcquisitionValues = acquisitionSamples.length > 0;
  for (const sample of acquisitionSamples) {
    if (
      typeof sample.commission_group !== "string" ||
      !["NEW", "RETURNING"].includes(sample.customer_acquisition)
    ) {
      validAcquisitionValues = false;
      continue;
    }
    const values = acquisitionByGroup.get(sample.commission_group) ?? new Set();
    values.add(sample.customer_acquisition);
    acquisitionByGroup.set(sample.commission_group, values);
  }
  const customerAcquisitionIndependent = validAcquisitionValues &&
    [...acquisitionByGroup.values()].some((values) =>
      values.has("NEW") && values.has("RETURNING")
    );

  return {
    groupsImported,
    rateSetsImported,
    matrixJoinsValid,
    standardDefaultTenPercent,
    premiumUnknownCellsRemainNull,
    skimlinksProtected,
    skimlinksExternallyManaged,
    oneCurrentAssignmentPerPublisher,
    customerAcquisitionIndependent,
  };
}

function parseArguments(args) {
  let projectRef = null;
  let input = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--project-ref" && argument !== "--input") {
      throw new TypeError("unsupported verifier argument");
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new TypeError("verifier argument requires a value");
    }
    if (argument === "--project-ref") projectRef = value;
    else input = value;
    index += 1;
  }
  if (projectRef !== DEV_PROJECT_REF) {
    throw new TypeError("exact development project ref required");
  }
  return { projectRef, input };
}

async function readMode0600TemporaryFile(input) {
  if (!isAbsolute(input)) {
    throw new TypeError("input must be an absolute temporary file path");
  }
  const actualPath = await realpath(input);
  const temporaryRoot = await realpath(tmpdir());
  const fromTemporaryRoot = relative(temporaryRoot, actualPath);
  if (
    fromTemporaryRoot === "" || fromTemporaryRoot.startsWith("..") ||
    isAbsolute(fromTemporaryRoot)
  ) {
    throw new TypeError("input must be inside the temporary directory");
  }
  const metadata = await lstat(actualPath);
  if (!metadata.isFile() || (metadata.mode & 0o777) !== 0o600) {
    throw new TypeError("input file must have mode 0600");
  }
  return await readFile(actualPath, "utf8");
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function runCli(args) {
  const options = parseArguments(args);
  const input = options.input === null
    ? await readStdin()
    : await readMode0600TemporaryFile(resolve(options.input));
  let state;
  try {
    state = JSON.parse(input);
  } catch {
    throw new TypeError("policy_input_invalid");
  }
  if (state?.projectRef !== undefined && state.projectRef !== options.projectRef) {
    throw new TypeError("sanitized state project ref mismatch");
  }
  const verification = verifyPolicyState(state);
  if (!Object.values(verification).every(Boolean)) {
    throw new TypeError("development policy verification failed");
  }
  const output = {
    counts: {
      groups: rows(state, "commissionGroups").length,
      rateSets: rows(state, "rateSets").length,
      rateValues: rows(state, "rateValues").length,
      publishers: rows(state, "publishers").length,
      currentAssignments: rows(state, "assignments").filter((row) =>
        row.state === "current"
      ).length,
      protectedPublishers: rows(state, "publishers").filter((row) =>
        row.retain_protected === true
      ).length,
    },
    verification,
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "policy verification failed"}\n`,
    );
    process.exitCode = 1;
  });
}
