// deno-lint-ignore-file no-import-prefix -- Match the repository's pinned Deno test dependency.
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateAwinCommissionableAmount } from "./awinCommission.ts";

Deno.test("does not deduct VAT before the configured effective date", () => {
  assertEquals(
    calculateAwinCommissionableAmount({
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      paidAt: "2026-08-11T12:00:00Z",
      vatEffectiveAt: "2026-10-01T00:00:00Z",
      vatRateBps: 2000,
    }),
    {
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      vatPence: 0,
      commissionablePence: 6500,
    },
  );
});

Deno.test("does not deduct VAT when no effective date is configured", () => {
  assertEquals(
    calculateAwinCommissionableAmount({
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      paidAt: "2026-11-01T12:00:00Z",
    }),
    {
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      vatPence: 0,
      commissionablePence: 6500,
    },
  );
});

Deno.test("deducts actual VAT and separately charged delivery at the effective date", () => {
  assertEquals(
    calculateAwinCommissionableAmount({
      customerPaidPence: 7095,
      discountPence: 500,
      deliveryPence: 595,
      paidAt: "2026-10-01T00:00:00Z",
      vatEffectiveAt: "2026-10-01T00:00:00Z",
      vatRateBps: 2000,
    }),
    {
      customerPaidPence: 7095,
      discountPence: 500,
      deliveryPence: 595,
      vatPence: 1083,
      commissionablePence: 5417,
    },
  );
});

Deno.test("free delivery never creates a notional fulfilment-cost deduction", () => {
  const result = calculateAwinCommissionableAmount({
    customerPaidPence: 8500,
    discountPence: 0,
    deliveryPence: 0,
    paidAt: "2026-10-02T00:00:00Z",
    vatEffectiveAt: "2026-10-01T00:00:00Z",
    vatRateBps: 2000,
  });

  assertEquals(result.vatPence, 1417);
  assertEquals(result.commissionablePence, 7083);
});

Deno.test("rejects invalid pence, date, and effective VAT inputs", () => {
  const valid = {
    customerPaidPence: 6500,
    discountPence: 0,
    deliveryPence: 0,
    paidAt: "2026-10-01T00:00:00Z",
    vatEffectiveAt: "2026-10-01T00:00:00Z",
    vatRateBps: 2000,
  };

  assertThrows(
    () =>
      calculateAwinCommissionableAmount({
        ...valid,
        customerPaidPence: 6500.5,
      }),
    TypeError,
    "customerPaidPence",
  );
  assertThrows(
    () => calculateAwinCommissionableAmount({ ...valid, discountPence: -1 }),
    TypeError,
    "discountPence",
  );
  assertThrows(
    () => calculateAwinCommissionableAmount({ ...valid, deliveryPence: 6501 }),
    TypeError,
    "deliveryPence",
  );
  assertThrows(
    () => calculateAwinCommissionableAmount({ ...valid, paidAt: "invalid" }),
    TypeError,
    "paidAt",
  );
  assertThrows(
    () => calculateAwinCommissionableAmount({ ...valid, vatRateBps: 0 }),
    TypeError,
    "vatRateBps",
  );
  assertThrows(
    () =>
      calculateAwinCommissionableAmount({
        ...valid,
        customerPaidPence: 2_147_483_648,
      }),
    TypeError,
    "customerPaidPence",
  );
});

Deno.test("rejects ambiguous, normalized, or timezone-free financial timestamps", () => {
  const valid = {
    customerPaidPence: 6500,
    discountPence: 0,
    deliveryPence: 0,
    paidAt: "2026-10-01T00:00:00Z",
    vatEffectiveAt: "2026-10-01T00:00:00Z",
    vatRateBps: 2000,
  };

  for (
    const timestamp of [
      "0",
      "2026-02-30T00:00:00Z",
      "2026-10-01T00:00:00",
    ]
  ) {
    assertThrows(
      () => calculateAwinCommissionableAmount({ ...valid, paidAt: timestamp }),
      TypeError,
      "paidAt",
    );
    assertThrows(
      () =>
        calculateAwinCommissionableAmount({
          ...valid,
          vatEffectiveAt: timestamp,
        }),
      TypeError,
      "vatEffectiveAt",
    );
  }
});
