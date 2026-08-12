// deno-lint-ignore-file no-import-prefix -- Match the repository's pinned Deno test dependency.
import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateAwinCommissionableAmount,
  classifyAwinCustomer,
  enqueueAwinConversion,
  paymentIntentCreatedAt,
} from "./awinCommission.ts";
import acquisitionMigrationSql from "../../migrations/20260813000002_awin_customer_acquisition.sql" with {
  type: "text",
};

Deno.test("classifies customer acquisition independently from commission", () => {
  assertEquals(classifyAwinCustomer(0), "NEW");
  assertEquals(classifyAwinCustomer(1), "RETURNING");
  assertEquals(classifyAwinCustomer(12), "RETURNING");
  assertThrows(() => classifyAwinCustomer(-1), TypeError);
});

Deno.test("enqueue stores independently validated group and acquisition", async () => {
  let stored: Record<string, unknown> | undefined;
  const client = {
    from(table: string) {
      assertEquals(table, "awin_conversion_outbox");
      return {
        upsert(row: Record<string, unknown>) {
          stored = row;
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const input = {
    orderRef: "pi_dynamic1",
    orderId: "11111111-1111-4111-8111-111111111111",
    customerPaidPence: 7083,
    discountPence: 0,
    deliveryPence: 0,
    vatPence: 0,
    amountPence: 7083,
    voucherCode: null,
    financialBasisVersion: "solum-commission-v1" as const,
    currency: "GBP" as const,
    commissionGroup: "KIT_RITUAL_2027",
    customerAcquisition: "RETURNING" as const,
    channel: "aw" as const,
    awc: "safe_awc",
  };

  await enqueueAwinConversion(
    client,
    input,
    "development-secret-development-secret",
  );
  assertEquals(stored?.commission_group, "KIT_RITUAL_2027");
  assertEquals(stored?.customer_acquisition, "RETURNING");

  await assertRejects(
    () =>
      enqueueAwinConversion(
        client,
        { ...input, commissionGroup: "bad-group" },
        "development-secret-development-secret",
      ),
    TypeError,
    "commission group code",
  );
});

Deno.test("customer acquisition migration extends the immutable dynamic-group contract", () => {
  const sql = acquisitionMigrationSql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

  assertEquals(
    /add column customer_acquisition text/.test(sql),
    true,
  );
  assertEquals(
    /customer_acquisition is null or customer_acquisition in \('new',\s*'returning'\)/
      .test(sql),
    true,
  );
  assertEquals(
    sql.includes("drop constraint awin_conversion_outbox_group_check"),
    true,
  );
  assertEquals(
    /commission_group ~ '\^\[a-z0-9_\]\{1,50\}\$'/.test(sql),
    true,
  );
  assertEquals(
    /foreign key \(commission_group\) references public\.awin_commission_groups\(code\)/
      .test(sql),
    true,
  );
  assertEquals(
    /left join public\.awin_commission_groups/.test(sql) &&
      /raise exception/.test(sql),
    true,
  );

  for (
    const immutableColumn of [
      "id",
      "order_ref",
      "order_id",
      "customer_paid_pence",
      "discount_pence",
      "delivery_pence",
      "vat_pence",
      "amount_pence",
      "voucher_code",
      "financial_basis_version",
      "currency",
      "commission_group",
      "customer_acquisition",
      "channel",
      "awc_ciphertext",
      "awc_hash",
      "created_at",
    ]
  ) {
    assertEquals(
      sql.includes(
        `new.${immutableColumn} is distinct from old.${immutableColumn}`,
      ),
      true,
    );
  }
  assertEquals(/update public\.awin_conversion_outbox/.test(sql), false);
});

Deno.test("VAT uses immutable PaymentIntent creation time, not the later webhook time", () => {
  const paidAt = paymentIntentCreatedAt(
    Date.parse("2026-09-30T23:59:59Z") / 1000,
  );
  const webhookReceivedAt = "2026-10-01T00:05:00Z";

  assertEquals(webhookReceivedAt > "2026-10-01T00:00:00Z", true);
  assertEquals(
    calculateAwinCommissionableAmount({
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      paidAt,
      vatEffectiveAt: "2026-10-01T00:00:00Z",
      vatRateBps: 2000,
    }).commissionablePence,
    6500,
  );
});

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

Deno.test("keeps the full customer-paid amount one second before VAT takes effect", () => {
  assertEquals(
    calculateAwinCommissionableAmount({
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      paidAt: "2026-09-30T23:59:59Z",
      vatEffectiveAt: "2026-10-01T00:00:00Z",
      vatRateBps: 2000,
    }).commissionablePence,
    6500,
  );
});

Deno.test("deducts VAT at the exact configured effective instant", () => {
  assertEquals(
    calculateAwinCommissionableAmount({
      customerPaidPence: 6500,
      discountPence: 0,
      deliveryPence: 0,
      paidAt: "2026-10-01T00:00:00Z",
      vatEffectiveAt: "2026-10-01T00:00:00Z",
      vatRateBps: 2000,
    }).commissionablePence,
    5417,
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
