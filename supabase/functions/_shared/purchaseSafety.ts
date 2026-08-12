export function shouldSendExternalPurchaseSideEffects(
  livemode: boolean | undefined,
): boolean {
  return livemode === true;
}

const AWIN_CHANNELS = ["aw", "display", "ppc", "email"] as const;
const MAX_POSTGRES_INTEGER = 2_147_483_647;

export type AwinEligibilityInput = {
  livemode?: boolean;
  awc?: string;
  channel?: string;
};

export type AwinEligibility = {
  eligible: boolean;
  reason: string;
};

export function classifyAwinEligibility(
  input: AwinEligibilityInput,
): AwinEligibility {
  if (input.livemode !== true) {
    return { eligible: false, reason: "test_payment" };
  }
  if (typeof input.awc !== "string" || input.awc.length === 0) {
    return { eligible: false, reason: "missing_awc" };
  }
  if (!AWIN_CHANNELS.includes(input.channel as typeof AWIN_CHANNELS[number])) {
    return { eligible: false, reason: "invalid_channel" };
  }
  return { eligible: true, reason: "eligible" };
}

export function validatedIntegerMetadata(
  value: string | undefined,
  fallback: number,
): number {
  if (
    typeof value !== "string" || !/^\d+$/.test(value) ||
    !Number.isSafeInteger(fallback) || fallback < 0 ||
    fallback > MAX_POSTGRES_INTEGER
  ) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= MAX_POSTGRES_INTEGER
    ? parsed
    : fallback;
}

export function validatedVoucher(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 &&
      /^[\x20-\x7e]+$/.test(trimmed)
    ? trimmed
    : null;
}
