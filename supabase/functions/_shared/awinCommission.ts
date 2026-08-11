export type AwinCommissionInput = {
  customerPaidPence: number;
  discountPence: number;
  deliveryPence: number;
  paidAt: string;
  vatEffectiveAt?: string | null;
  vatRateBps?: number | null;
};

export type AwinCommissionBreakdown = {
  customerPaidPence: number;
  discountPence: number;
  deliveryPence: number;
  vatPence: number;
  commissionablePence: number;
};

const MAX_POSTGRES_INTEGER = 2_147_483_647;
const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/;

function requirePence(name: string, value: number, allowZero: boolean): void {
  if (
    !Number.isSafeInteger(value) || value > MAX_POSTGRES_INTEGER ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new TypeError(
      `${name} must be a ${
        allowZero ? "non-negative" : "positive"
      } PostgreSQL integer`,
    );
  }
}

function requireTimestamp(name: string, value: string): number {
  const match = typeof value === "string" ? ISO_TIMESTAMP.exec(value) : null;
  if (!match) {
    throw new TypeError(
      `${name} must be an ISO-8601 timestamp with a timezone`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const timestamp = Date.parse(value);

  if (
    month < 1 || month > 12 || day < 1 || day > (daysInMonth[month - 1] ?? 0) ||
    hour > 23 || minute > 59 || second > 59 || offsetHour > 14 ||
    offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0) ||
    !Number.isFinite(timestamp)
  ) {
    throw new TypeError(`${name} must be a valid ISO-8601 timestamp`);
  }

  return timestamp;
}

export function calculateAwinCommissionableAmount(
  input: AwinCommissionInput,
): AwinCommissionBreakdown {
  requirePence("customerPaidPence", input.customerPaidPence, false);
  requirePence("discountPence", input.discountPence, true);
  requirePence("deliveryPence", input.deliveryPence, true);

  if (input.deliveryPence >= input.customerPaidPence) {
    throw new TypeError("deliveryPence must be less than customerPaidPence");
  }

  const paidAt = requireTimestamp("paidAt", input.paidAt);
  const productGrossPence = input.customerPaidPence - input.deliveryPence;
  let vatPence = 0;

  if (input.vatEffectiveAt !== undefined && input.vatEffectiveAt !== null) {
    const vatEffectiveAt = requireTimestamp(
      "vatEffectiveAt",
      input.vatEffectiveAt,
    );
    if (paidAt >= vatEffectiveAt) {
      const vatRateBps = input.vatRateBps;
      if (
        typeof vatRateBps !== "number" || !Number.isSafeInteger(vatRateBps) ||
        vatRateBps <= 0
      ) {
        throw new TypeError(
          "vatRateBps must be a positive integer at or after vatEffectiveAt",
        );
      }

      const netPence = Math.round(
        productGrossPence * 10_000 / (10_000 + vatRateBps),
      );
      vatPence = productGrossPence - netPence;
    }
  }

  const commissionablePence = productGrossPence - vatPence;
  if (commissionablePence <= 0) {
    throw new TypeError("commissionablePence must be positive");
  }

  return {
    customerPaidPence: input.customerPaidPence,
    discountPence: input.discountPence,
    deliveryPence: input.deliveryPence,
    vatPence,
    commissionablePence,
  };
}
