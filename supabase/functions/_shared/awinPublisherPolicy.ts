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
export type RateSource =
  | "awin_assignment"
  | "skimlinks_managed"
  | "approved_exception";

export type PublisherClassificationInput = {
  publisherId: number;
  publisherName: string;
  primaryType?: string | null;
};

export type PublisherClassification = {
  category: PublisherCategory;
  retainProtected: boolean;
  commercialTier: CommercialTier;
  rateSource: RateSource;
};

export type NominalCommissionInput = {
  commissionablePence: number;
  commissionType: "percentage" | "fixed" | null;
  rateBps?: number | null;
  fixedAmountPence?: number | null;
};

const COMMISSION_GROUP_CODE = /^[A-Z0-9_]{1,50}$/;
const SKIMLINKS_IDS = new Set([78888, 181013, 2573975]);
const MAX_POSTGRES_INTEGER = 2_147_483_647;

export function normalizeCommissionGroupCode(value: unknown): string {
  if (typeof value !== "string" || !COMMISSION_GROUP_CODE.test(value)) {
    throw new TypeError(
      "commission group code must be canonical uppercase AWIN code",
    );
  }
  return value;
}

export function normalizePublisherCategory(
  value: unknown,
): PublisherCategory {
  if (typeof value !== "string") return "other";

  const label = value.trim().toLowerCase();
  if (/skimlinks|sub[ _-]?networks?/.test(label)) return "subnetwork";
  if (/cashback|loyalty|rewards?/.test(label)) return "cashback_loyalty";
  if (/comparisons?/.test(label)) return "comparison";
  if (/influencers?|social|creators?/.test(label)) return "creator";
  if (/content|editorials?|blogs?/.test(label)) return "editorial";
  return "other";
}

export function classifyPublisher(
  input: PublisherClassificationInput,
): PublisherClassification {
  if (!Number.isSafeInteger(input.publisherId) || input.publisherId <= 0) {
    throw new TypeError("publisherId must be a positive safe integer");
  }
  if (
    typeof input.publisherName !== "string" ||
    input.publisherName.length === 0 ||
    input.publisherName !== input.publisherName.trim()
  ) {
    throw new TypeError("publisherName must be trimmed and non-empty");
  }

  if (SKIMLINKS_IDS.has(input.publisherId)) {
    return {
      category: "subnetwork",
      retainProtected: true,
      commercialTier: "externally_managed",
      rateSource: "skimlinks_managed",
    };
  }

  return {
    category: /skimlinks/i.test(input.publisherName)
      ? "subnetwork"
      : normalizePublisherCategory(input.primaryType),
    retainProtected: false,
    commercialTier: "standard",
    rateSource: "awin_assignment",
  };
}

function requirePostgresInteger(
  name: string,
  value: number | null | undefined,
  maximum = MAX_POSTGRES_INTEGER,
): number {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 ||
    value > maximum
  ) {
    throw new TypeError(
      `${name} must be a non-negative PostgreSQL-safe integer`,
    );
  }
  return value;
}

export function inferNominalCommissionPence(
  input: NominalCommissionInput,
): number | null {
  if (input.commissionType === null) return null;

  if (input.commissionType === "percentage") {
    const commissionablePence = requirePostgresInteger(
      "commissionablePence",
      input.commissionablePence,
    );
    const rateBps = requirePostgresInteger("rateBps", input.rateBps, 10_000);
    return Math.round(commissionablePence * rateBps / 10_000);
  }

  if (input.commissionType === "fixed") {
    return requirePostgresInteger("fixedAmountPence", input.fixedAmountPence);
  }

  throw new TypeError("commissionType must be percentage, fixed, or null");
}
