import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const COMMISSION_GROUP_CODE = /^[A-Z0-9_]{1,50}$/;
const RATE_SET_KEY = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const RELATIONSHIP_STATUS = /^[a-z][a-z0-9_]{0,49}$/;
const SKIMLINKS_IDS = new Set([78888, 181013, 2573975]);
const ASSIGNMENT_STATES = new Set(["current", "scheduled", "historical"]);
const MAX_POSTGRES_INTEGER = 2_147_483_647;

const CSV_COLUMNS = [
  "publisher_id",
  "publisher_name",
  "category",
  "relationship_status",
  "retain_protected",
  "commercial_tier",
  "rate_source",
  "commission_rate_set_key",
  "commission_rate_set_name",
  "group_code",
  "commission_type",
  "rate_bps",
  "fixed_amount_pence",
  "currency",
  "approval_reason",
  "approved_by",
  "approved_at",
  "observed_at",
];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function requireTrimmedString(value, label, maximum = 200) {
  if (
    typeof value !== "string" || value.length === 0 ||
    value !== value.trim() || value.length > maximum
  ) {
    throw new TypeError(`${label} must be a trimmed non-empty string`);
  }
  return value;
}

function optionalTrimmedString(value, label, maximum = 200) {
  if (value === undefined || value === null) return null;
  return requireTrimmedString(value, label, maximum);
}

function normalizeTimestamp(value, label, nullable = false) {
  if ((value === undefined || value === null) && nullable) return null;
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be an ISO-8601 timestamp`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${label} must be an ISO-8601 timestamp`);
  }
  return date.toISOString();
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be boolean`);
  return value;
}

function requirePositiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function requireIntegerInRange(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("hash input numbers must be finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new TypeError("hash input must contain only JSON values");
}

export function sourceHash(value) {
  const canonicalJson = JSON.stringify(canonicalize(value));
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

function classifyPublisher(publisher) {
  if (SKIMLINKS_IDS.has(publisher.id) || /skimlinks/i.test(publisher.name)) {
    return {
      category: "subnetwork",
      retainProtected: true,
      commercialTier: "externally_managed",
      rateSource: "skimlinks_managed",
    };
  }

  const label = publisher.primaryType?.trim().toLowerCase() ?? "";
  let category = "other";
  if (/cashback|loyalty|reward/.test(label)) category = "cashback_loyalty";
  else if (/comparison/.test(label)) category = "comparison";
  else if (/influencer|social|creator/.test(label)) category = "creator";
  else if (/content|editorial|blog/.test(label)) category = "editorial";

  if (publisher.commercialTier === "premium") {
    return {
      category,
      retainProtected: false,
      commercialTier: "premium",
      rateSource: "approved_exception",
    };
  }

  return {
    category,
    retainProtected: false,
    commercialTier: "standard",
    rateSource: "awin_assignment",
  };
}

function approvalFields(publisher) {
  return {
    reason: publisher.approvalReason ?? publisher.exceptionReason ?? null,
    approvedBy: publisher.approvedBy ?? publisher.exceptionApprovedBy ?? null,
    approvedAt: publisher.approvedAt ?? publisher.exceptionApprovedAt ?? null,
  };
}

export function validatePolicyExport(value) {
  const document = requireRecord(value, "policy export");
  if (document.observedAt !== undefined && document.observedAt !== null) {
    normalizeTimestamp(document.observedAt, "observedAt");
  }

  const commissionGroups = requireArray(
    document.commissionGroups,
    "commissionGroups",
  );
  const rateSets = requireArray(document.rateSets, "rateSets");
  const rateValues = requireArray(document.rateValues, "rateValues");
  const publishers = requireArray(document.publishers, "publishers");
  const assignments = requireArray(document.assignments, "assignments");

  const groupCodes = new Set();
  for (const [index, rawGroup] of commissionGroups.entries()) {
    const group = requireRecord(rawGroup, `commissionGroups[${index}]`);
    if (typeof group.code !== "string" || !COMMISSION_GROUP_CODE.test(group.code)) {
      throw new TypeError(`unsafe commission group code at commissionGroups[${index}]`);
    }
    if (groupCodes.has(group.code)) {
      throw new TypeError(`duplicate commission group code ${group.code}`);
    }
    groupCodes.add(group.code);
    requireTrimmedString(group.name, `commissionGroups[${index}].name`);
    requireBoolean(group.active, `commissionGroups[${index}].active`);
    optionalTrimmedString(group.description, `commissionGroups[${index}].description`, 1000);
    optionalTrimmedString(
      group.conditionSummary,
      `commissionGroups[${index}].conditionSummary`,
      1000,
    );
  }

  const rateSetKeys = new Set();
  for (const [index, rawRateSet] of rateSets.entries()) {
    const rateSet = requireRecord(rawRateSet, `rateSets[${index}]`);
    if (typeof rateSet.key !== "string" || !RATE_SET_KEY.test(rateSet.key)) {
      throw new TypeError(`unsafe rate-set key at rateSets[${index}]`);
    }
    if (rateSetKeys.has(rateSet.key)) {
      throw new TypeError(`duplicate rate-set key ${rateSet.key}`);
    }
    rateSetKeys.add(rateSet.key);
    requireTrimmedString(rateSet.name, `rateSets[${index}].name`);
    requireBoolean(rateSet.active, `rateSets[${index}].active`);
    optionalTrimmedString(rateSet.sourceId, `rateSets[${index}].sourceId`);
  }

  const rateValueKeys = new Set();
  for (const [index, rawRateValue] of rateValues.entries()) {
    const rateValue = requireRecord(rawRateValue, `rateValues[${index}]`);
    const key = `${rateValue.rateSetKey}:${rateValue.groupCode}`;
    if (
      !rateSetKeys.has(rateValue.rateSetKey) ||
      !groupCodes.has(rateValue.groupCode)
    ) {
      throw new TypeError(`orphan rate value ${key}`);
    }
    if (rateValueKeys.has(key)) throw new TypeError(`duplicate rate value ${key}`);
    rateValueKeys.add(key);

    if (rateValue.commissionType === "percentage") {
      requireIntegerInRange(rateValue.rateBps, "rateBps", 0, 10_000);
      if (
        (rateValue.fixedAmountPence !== undefined &&
          rateValue.fixedAmountPence !== null) ||
        (rateValue.currency !== undefined && rateValue.currency !== null)
      ) {
        throw new TypeError("percentage rate values cannot include fixed amount or currency");
      }
    } else if (rateValue.commissionType === "fixed") {
      requireIntegerInRange(
        rateValue.fixedAmountPence,
        "fixedAmountPence",
        0,
        MAX_POSTGRES_INTEGER,
      );
      if (rateValue.rateBps !== undefined && rateValue.rateBps !== null) {
        throw new TypeError("fixed rate values cannot include rateBps");
      }
      if (rateValue.currency !== "GBP") {
        throw new TypeError("fixed rate values require GBP currency");
      }
    } else {
      throw new TypeError("commissionType must be percentage or fixed");
    }
  }

  const publisherIds = new Set();
  for (const [index, rawPublisher] of publishers.entries()) {
    const publisher = requireRecord(rawPublisher, `publishers[${index}]`);
    requirePositiveSafeInteger(publisher.id, `publishers[${index}].id`);
    if (publisherIds.has(publisher.id)) {
      throw new TypeError(`duplicate publisher id ${publisher.id}`);
    }
    publisherIds.add(publisher.id);
    requireTrimmedString(publisher.name, `publishers[${index}].name`);
    optionalTrimmedString(
      publisher.primaryRegion,
      `publishers[${index}].primaryRegion`,
    );
    optionalTrimmedString(
      publisher.primaryType,
      `publishers[${index}].primaryType`,
    );
    if (
      typeof publisher.status !== "string" ||
      !RELATIONSHIP_STATUS.test(publisher.status)
    ) {
      throw new TypeError(`unsafe relationship status at publishers[${index}]`);
    }
    if (
      publisher.commercialTier !== undefined &&
      !["standard", "premium", "externally_managed"].includes(
        publisher.commercialTier,
      )
    ) {
      throw new TypeError(`unsupported commercial tier for publisher ${publisher.id}`);
    }
    if (publisher.awinTags !== undefined && !Array.isArray(publisher.awinTags)) {
      throw new TypeError(`awinTags must be an array for publisher ${publisher.id}`);
    }
  }

  const assignmentKeys = new Set();
  const currentPublisherIds = new Set();
  for (const [index, rawAssignment] of assignments.entries()) {
    const assignment = requireRecord(rawAssignment, `assignments[${index}]`);
    const key = `${assignment.publisherId}:${assignment.rateSetKey}:${assignment.effectiveFrom}`;
    if (
      !publisherIds.has(assignment.publisherId) ||
      !rateSetKeys.has(assignment.rateSetKey)
    ) {
      throw new TypeError(`orphan assignment ${key}`);
    }
    if (!ASSIGNMENT_STATES.has(assignment.state)) {
      throw new TypeError(`unsupported assignment state at assignments[${index}]`);
    }
    const effectiveFrom = normalizeTimestamp(
      assignment.effectiveFrom,
      `assignments[${index}].effectiveFrom`,
    );
    const effectiveTo = normalizeTimestamp(
      assignment.effectiveTo,
      `assignments[${index}].effectiveTo`,
      true,
    );
    if (effectiveTo !== null && effectiveTo <= effectiveFrom) {
      throw new TypeError(`assignment effectiveTo must follow effectiveFrom at assignments[${index}]`);
    }
    if (assignmentKeys.has(key)) throw new TypeError(`duplicate assignment ${key}`);
    assignmentKeys.add(key);
    if (assignment.state === "current") {
      if (currentPublisherIds.has(assignment.publisherId)) {
        throw new TypeError(
          `multiple current assignments for publisher ${assignment.publisherId}`,
        );
      }
      currentPublisherIds.add(assignment.publisherId);
    }
  }

  const currentAssignments = new Map(
    assignments.filter((row) => row.state === "current").map((row) => [
      row.publisherId,
      row,
    ]),
  );
  for (const publisher of publishers) {
    if (publisher.commercialTier !== "premium") continue;
    const approval = approvalFields(publisher);
    const currentAssignment = currentAssignments.get(publisher.id);
    try {
      requireTrimmedString(approval.reason, "approval reason", 1000);
      requireTrimmedString(approval.approvedBy, "approval approver");
      normalizeTimestamp(approval.approvedAt, "approval timestamp");
      if (!currentAssignment) throw new TypeError("missing current assignment");
    } catch {
      throw new TypeError(
        `premium publisher ${publisher.id} requires approval metadata and a current assignment`,
      );
    }
  }

  return document;
}

export function normalizePolicyExport(value) {
  const document = validatePolicyExport(value);
  const documentObservedAt = normalizeTimestamp(
    document.observedAt,
    "observedAt",
    true,
  );
  const currentAssignments = new Map(
    document.assignments.filter((row) => row.state === "current").map((row) => [
      row.publisherId,
      row,
    ]),
  );

  const commissionGroups = document.commissionGroups.map((group) => ({
    code: group.code,
    name: group.name,
    description: group.description ?? null,
    condition_summary: group.conditionSummary ?? null,
    active: group.active,
    source_hash: sourceHash(group),
    observed_at: normalizeTimestamp(group.observedAt, "group observedAt", true) ??
      documentObservedAt,
  }));

  const rateSets = document.rateSets.map((rateSet) => ({
    rate_set_key: rateSet.key,
    source_id: rateSet.sourceId ?? null,
    name: rateSet.name,
    active: rateSet.active,
    source_hash: sourceHash(rateSet),
    observed_at: normalizeTimestamp(rateSet.observedAt, "rate-set observedAt", true) ??
      documentObservedAt,
  }));

  const rateValues = document.rateValues.map((rateValue) => ({
    rate_set_key: rateValue.rateSetKey,
    commission_group_code: rateValue.groupCode,
    commission_type: rateValue.commissionType,
    rate_bps: rateValue.commissionType === "percentage" ? rateValue.rateBps : null,
    fixed_amount_pence: rateValue.commissionType === "fixed"
      ? rateValue.fixedAmountPence
      : null,
    currency: rateValue.commissionType === "fixed" ? rateValue.currency : null,
    source_hash: sourceHash(rateValue),
    observed_at: normalizeTimestamp(
      rateValue.observedAt,
      "rate-value observedAt",
      true,
    ) ?? documentObservedAt,
  }));

  const publishers = document.publishers.map((publisher) => {
    const classification = classifyPublisher(publisher);
    const approval = approvalFields(publisher);
    const currentAssignment = currentAssignments.get(publisher.id);
    const premium = classification.commercialTier === "premium";
    return {
      publisher_id: publisher.id,
      publisher_name: publisher.name,
      primary_region: publisher.primaryRegion ?? null,
      primary_type: publisher.primaryType ?? null,
      category: classification.category,
      relationship_status: publisher.status,
      retain_protected: classification.retainProtected,
      commercial_tier: classification.commercialTier,
      rate_source: classification.rateSource,
      commission_rate_set_key: currentAssignment?.rateSetKey ?? null,
      exception_reason: premium ? approval.reason : null,
      exception_approved_by: premium ? approval.approvedBy : null,
      exception_approved_at: premium
        ? normalizeTimestamp(approval.approvedAt, "approval timestamp")
        : null,
      awin_tags: publisher.awinTags ?? [],
      source_hash: sourceHash(publisher),
      observed_at: normalizeTimestamp(
        publisher.observedAt,
        "publisher observedAt",
        true,
      ) ?? documentObservedAt,
    };
  });

  const assignments = document.assignments.map((assignment) => ({
    publisher_id: assignment.publisherId,
    rate_set_key: assignment.rateSetKey,
    effective_from: normalizeTimestamp(
      assignment.effectiveFrom,
      "assignment effectiveFrom",
    ),
    effective_to: normalizeTimestamp(
      assignment.effectiveTo,
      "assignment effectiveTo",
      true,
    ),
    state: assignment.state,
    source_hash: sourceHash(assignment),
    observed_at: normalizeTimestamp(
      assignment.observedAt,
      "assignment observedAt",
      true,
    ) ?? documentObservedAt,
  }));

  return {
    observed_at: documentObservedAt,
    commissionGroups,
    rateSets,
    rateValues,
    publishers,
    assignments,
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function renderPolicyCsv(value) {
  const normalized = isRecord(value) &&
      Object.prototype.hasOwnProperty.call(value, "observed_at")
    ? value
    : normalizePolicyExport(value);
  const rateSets = new Map(
    normalized.rateSets.map((row) => [row.rate_set_key, row]),
  );
  const rateValues = new Map(
    normalized.rateValues.map((row) => [
      `${row.rate_set_key}:${row.commission_group_code}`,
      row,
    ]),
  );
  const rows = [CSV_COLUMNS];

  for (const publisher of normalized.publishers) {
    const rateSet = rateSets.get(publisher.commission_rate_set_key);
    const groups = normalized.commissionGroups.length > 0
      ? normalized.commissionGroups
      : [{ code: null }];
    for (const group of groups) {
      const rateValue = rateSet
        ? rateValues.get(`${rateSet.rate_set_key}:${group.code}`)
        : null;
      rows.push([
        publisher.publisher_id,
        publisher.publisher_name,
        publisher.category,
        publisher.relationship_status,
        publisher.retain_protected,
        publisher.commercial_tier,
        publisher.rate_source,
        publisher.commission_rate_set_key,
        rateSet?.name ?? null,
        group.code,
        rateValue?.commission_type ?? "unverified",
        rateValue?.rate_bps ?? null,
        rateValue?.fixed_amount_pence ?? null,
        rateValue?.currency ?? null,
        publisher.exception_reason,
        publisher.exception_approved_by,
        publisher.exception_approved_at,
        publisher.observed_at ?? normalized.observed_at,
      ]);
    }
  }

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function parseCliArguments(args) {
  let input = null;
  let output = null;
  let explicitDryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      explicitDryRun = true;
    } else if (argument === "--input" || argument === "--output") {
      const path = args[index + 1];
      if (!path || path.startsWith("--")) {
        throw new TypeError(`${argument} requires a path`);
      }
      if (argument === "--input") input = resolve(path);
      else output = resolve(path);
      index += 1;
    } else {
      throw new TypeError(`unknown argument ${argument}`);
    }
  }
  if (input === null) throw new TypeError("--input is required");
  return { input, output, dryRun: explicitDryRun || output === null };
}

async function runCli(args) {
  const options = parseCliArguments(args);
  const document = JSON.parse(await readFile(options.input, "utf8"));
  const normalized = normalizePolicyExport(document);
  if (!options.dryRun) {
    await writeFile(options.output, renderPolicyCsv(normalized), "utf8");
  }
  const currentAssignments = normalized.assignments.filter((row) =>
    row.state === "current"
  ).length;
  const protectedPublishers = normalized.publishers.filter((row) =>
    row.retain_protected
  ).length;
  console.log(
    `groups=${normalized.commissionGroups.length} ` +
      `rate_sets=${normalized.rateSets.length} ` +
      `publishers=${normalized.publishers.length} ` +
      `current_assignments=${currentAssignments} ` +
      `protected_publishers=${protectedPublishers}`,
  );
  console.log(`input=${options.input}`);
  console.log(options.dryRun ? "output=dry-run" : `output=${options.output}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : "policy import failed");
    process.exitCode = 1;
  });
}
