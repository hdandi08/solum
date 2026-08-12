// deno-lint-ignore-file no-import-prefix no-unversioned-import require-await -- Preserve the pinned test import and async contract stub.
import { assertEquals } from "jsr:@std/assert";
import * as purchaseSafety from "./purchaseSafety.ts";
import { classifyThenEnqueueAwinConversion } from "./awinCommission.ts";

const {
  shouldSendExternalPurchaseSideEffects,
} = purchaseSafety;

Deno.test("external purchase side effects require Stripe live mode", () => {
  assertEquals(shouldSendExternalPurchaseSideEffects(true), true);
  assertEquals(shouldSendExternalPurchaseSideEffects(false), false);
  assertEquals(shouldSendExternalPurchaseSideEffects(undefined), false);
});

Deno.test("classifies AWIN eligibility without exposing attribution", () => {
  const classifyAwinEligibility = (
    purchaseSafety as unknown as {
      classifyAwinEligibility: (input: {
        livemode?: boolean;
        awc?: string;
        channel?: string;
      }) => { eligible: boolean; reason: string };
    }
  ).classifyAwinEligibility;

  assertEquals(
    classifyAwinEligibility({ livemode: true, awc: "x", channel: "aw" })
      .eligible,
    true,
  );
  assertEquals(
    classifyAwinEligibility({ livemode: false, awc: "x", channel: "aw" })
      .reason,
    "test_payment",
  );
  assertEquals(
    classifyAwinEligibility({ livemode: true, awc: "", channel: "aw" }).reason,
    "missing_awc",
  );
  assertEquals(
    classifyAwinEligibility({ livemode: true, awc: "x", channel: "organic" })
      .reason,
    "invalid_channel",
  );
});

Deno.test("normalizes only bounded integer metadata and trimmed vouchers", () => {
  const helpers = purchaseSafety as unknown as {
    validatedIntegerMetadata: (
      value: string | undefined,
      fallback: number,
    ) => number;
    validatedVoucher: (value: string | undefined) => string | null;
  };

  assertEquals(helpers.validatedIntegerMetadata("595", 0), 595);
  assertEquals(helpers.validatedIntegerMetadata("5.95", 0), 0);
  assertEquals(helpers.validatedIntegerMetadata("-1", 0), 0);
  assertEquals(helpers.validatedIntegerMetadata(undefined, 0), 0);
  assertEquals(helpers.validatedVoucher(" SOLUM10 "), "SOLUM10");
  assertEquals(helpers.validatedVoucher("   "), null);
  assertEquals(helpers.validatedVoucher("x".repeat(101)), null);
});

Deno.test("classifies AWIN customer before enqueueing the default group", async () => {
  const makeClient = (
    result: { count: number | null; error: { message: string } | null },
  ) => {
    const calls: Array<[string, ...unknown[]]> = [];
    const query = {
      eq(column: string, value: unknown) {
        calls.push(["eq", column, value]);
        return query;
      },
      lt(column: string, value: unknown) {
        calls.push(["lt", column, value]);
        return query;
      },
      neq(column: string, value: unknown) {
        calls.push(["neq", column, value]);
        return query;
      },
      then(resolve: (value: typeof result) => unknown) {
        calls.push(["classification_result"]);
        return Promise.resolve(result).then(resolve);
      },
    };
    return {
      calls,
      from(table: string) {
        calls.push(["from", table]);
        return {
          select(columns: string, options: unknown) {
            calls.push(["select", columns, options]);
            return query;
          },
        };
      },
    };
  };
  const order = {
    id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-08-12T12:00:00.000Z",
  };

  const conversion = {
    orderRef: "pi_123",
    orderId: order.id,
    customerPaidPence: 7083,
    discountPence: 0,
    deliveryPence: 0,
    vatPence: 0,
    amountPence: 7083,
    voucherCode: null,
    financialBasisVersion: "solum-commission-v1" as const,
    currency: "GBP" as const,
    channel: "aw" as const,
    awc: "safe_awc",
  };

  for (
    const scenario of [
      { priorCount: 0, expectedAcquisition: "NEW" },
      { priorCount: 1, expectedAcquisition: "RETURNING" },
    ] as const
  ) {
    const client = makeClient({ count: scenario.priorCount, error: null });
    const enqueueInputs: unknown[] = [];
    await classifyThenEnqueueAwinConversion(
      client as never,
      "customer-1",
      order,
      conversion,
      (_supabase, input) => {
        client.calls.push(["enqueue"]);
        enqueueInputs.push(input);
        return Promise.resolve();
      },
    );
    assertEquals(enqueueInputs.length, 1);
    assertEquals(enqueueInputs[0], {
      ...conversion,
      commissionGroup: "DEFAULT",
      customerAcquisition: scenario.expectedAcquisition,
    });
    assertEquals(client.calls.at(-1), ["enqueue"]);
    assertEquals(client.calls.at(-2), ["classification_result"]);
    assertEquals(client.calls.filter(([name]) => name === "enqueue").length, 1);
  }

  const firstPurchase = makeClient({ count: 0, error: null });
  await classifyThenEnqueueAwinConversion(
    firstPurchase as never,
    "customer-1",
    order,
    conversion,
    () => Promise.resolve(),
  );
  assertEquals(firstPurchase.calls, [
    ["from", "orders"],
    ["select", "id", { count: "exact", head: true }],
    ["eq", "customer_id", "customer-1"],
    ["eq", "status", "paid"],
    ["lt", "created_at", order.created_at],
    ["neq", "id", order.id],
    ["classification_result"],
  ]);

  const failedCount = makeClient({
    count: null,
    error: { message: "raw database detail" },
  });
  let error: unknown;
  let enqueueCallCount = 0;
  try {
    await classifyThenEnqueueAwinConversion(
      failedCount as never,
      "customer-1",
      order,
      conversion,
      () => {
        enqueueCallCount += 1;
        return Promise.resolve();
      },
    );
  } catch (caught) {
    error = caught;
  }
  assertEquals((error as Error).message, "awin_customer_classification_failed");
  assertEquals(enqueueCallCount, 0);

  const rejectedQuery = {
    eq() {
      return rejectedQuery;
    },
    lt() {
      return rejectedQuery;
    },
    neq() {
      return rejectedQuery;
    },
    then(
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) {
      return Promise.reject(new Error("raw transport detail")).then(
        resolve,
        reject,
      );
    },
  };
  const rejectedClient = {
    from() {
      return { select: () => rejectedQuery };
    },
  };
  error = undefined;
  try {
    await classifyThenEnqueueAwinConversion(
      rejectedClient as never,
      "customer-1",
      order,
      conversion,
      () => {
        enqueueCallCount += 1;
        return Promise.resolve();
      },
    );
  } catch (caught) {
    error = caught;
  }
  assertEquals((error as Error).message, "awin_customer_classification_failed");
  assertEquals(enqueueCallCount, 0);
});

Deno.test("existing-order replay after enqueue failure can attempt side effects only without a durable marker", () => {
  const shouldAttempt = shouldSendExternalPurchaseSideEffects as unknown as (
    input: {
      livemode?: boolean;
      orderAlreadyExists: boolean;
      purchaseSideEffectsAttempted: boolean;
    },
  ) => boolean;

  assertEquals(
    shouldAttempt({
      livemode: true,
      orderAlreadyExists: true,
      purchaseSideEffectsAttempted: false,
    }),
    true,
  );
  assertEquals(
    shouldAttempt({
      livemode: true,
      orderAlreadyExists: true,
      purchaseSideEffectsAttempted: true,
    }),
    false,
  );
  assertEquals(
    shouldAttempt({
      livemode: false,
      orderAlreadyExists: true,
      purchaseSideEffectsAttempted: false,
    }),
    false,
  );
});

Deno.test("purchase side-effect attempt marker is immutable input and survives stale-claim replay", () => {
  const helpers = purchaseSafety as unknown as {
    paymentIntentPurchaseSideEffectsAttempted: (
      data: Record<string, unknown>,
    ) => boolean;
    withPaymentIntentPurchaseSideEffectsAttempted: (
      data: Record<string, unknown>,
    ) => Record<string, unknown>;
  };
  const replayedClaim = {
    state: "processing",
    purchase_side_effects_attempted: false,
    revision: 1,
  };

  assertEquals(
    helpers.paymentIntentPurchaseSideEffectsAttempted(replayedClaim),
    false,
  );
  const attempted = helpers.withPaymentIntentPurchaseSideEffectsAttempted(
    replayedClaim,
  );
  assertEquals(
    helpers.paymentIntentPurchaseSideEffectsAttempted(attempted),
    true,
  );
  assertEquals(
    helpers.paymentIntentPurchaseSideEffectsAttempted({
      ...attempted,
      revision: 2,
    }),
    true,
  );
  assertEquals(replayedClaim, {
    state: "processing",
    purchase_side_effects_attempted: false,
    revision: 1,
  });
});

Deno.test("legacy claim JSON stays distinct from an explicit retryable marker", () => {
  const marker = (
    purchaseSafety as unknown as {
      paymentIntentPurchaseSideEffectsAttempted: (
        data: Record<string, unknown>,
      ) => boolean | undefined;
    }
  ).paymentIntentPurchaseSideEffectsAttempted;
  const shouldAttempt = shouldSendExternalPurchaseSideEffects as unknown as (
    input: {
      livemode?: boolean;
      orderAlreadyExists: boolean;
      purchaseSideEffectsAttempted: boolean | undefined;
    },
  ) => boolean;

  assertEquals(
    marker({ state: "processing", awin_attempted: true }),
    undefined,
  );
  assertEquals(
    shouldAttempt({
      livemode: true,
      orderAlreadyExists: true,
      purchaseSideEffectsAttempted: undefined,
    }),
    false,
  );
  assertEquals(
    shouldAttempt({
      livemode: true,
      orderAlreadyExists: true,
      purchaseSideEffectsAttempted: false,
    }),
    true,
  );
});

Deno.test("temporary acceptance secrets are available only on the exact development project", () => {
  const resolve = (
    purchaseSafety as unknown as {
      resolveDevelopmentAcceptanceSecret: (
        supabaseUrl: string | undefined,
        candidate: string | undefined,
      ) => string | undefined;
    }
  ).resolveDevelopmentAcceptanceSecret;
  const secret = "temporary-development-acceptance-secret";

  assertEquals(
    resolve("https://rodvvmfzkyjsqbufkjbc.supabase.co", secret),
    secret,
  );
  assertEquals(
    resolve("https://gvfptmjluxpngfjendbi.supabase.co", secret),
    undefined,
  );
  assertEquals(
    resolve("https://rodvvmfzkyjsqbufkjbc.attacker.invalid", secret),
    undefined,
  );
  assertEquals(
    resolve("https://rodvvmfzkyjsqbufkjbc.supabase.co", "short"),
    undefined,
  );
});

Deno.test("Stripe verification keeps the primary secret authoritative and exact-dev fallback isolated", async () => {
  const verify = (
    purchaseSafety as unknown as {
      verifyStripeWebhookWithDevelopmentFallback: <T>(input: {
        body: string;
        signature: string;
        primarySecret: string;
        supabaseUrl?: string;
        acceptanceSecret?: string;
        construct: (
          body: string,
          signature: string,
          secret: string,
        ) => Promise<T>;
      }) => Promise<T>;
    }
  ).verifyStripeWebhookWithDevelopmentFallback;
  const attempts: string[] = [];
  const construct = async (
    _body: string,
    _signature: string,
    secret: string,
  ) => {
    attempts.push(secret);
    if (secret === "normal-secret") return "primary";
    if (secret === "temporary-development-acceptance-secret") return "fallback";
    throw new Error("invalid signature");
  };

  assertEquals(
    await verify({
      body: "{}",
      signature: "signature",
      primarySecret: "normal-secret",
      supabaseUrl: "https://rodvvmfzkyjsqbufkjbc.supabase.co",
      acceptanceSecret: "temporary-development-acceptance-secret",
      construct,
    }),
    "primary",
  );
  assertEquals(attempts, ["normal-secret"]);

  attempts.length = 0;
  assertEquals(
    await verify({
      body: "{}",
      signature: "signature",
      primarySecret: "invalid-primary",
      supabaseUrl: "https://rodvvmfzkyjsqbufkjbc.supabase.co",
      acceptanceSecret: "temporary-development-acceptance-secret",
      construct,
    }),
    "fallback",
  );
  assertEquals(attempts, [
    "invalid-primary",
    "temporary-development-acceptance-secret",
  ]);

  attempts.length = 0;
  let rejected = false;
  try {
    await verify({
      body: "{}",
      signature: "signature",
      primarySecret: "invalid-primary",
      supabaseUrl: "https://gvfptmjluxpngfjendbi.supabase.co",
      acceptanceSecret: "temporary-development-acceptance-secret",
      construct,
    });
  } catch {
    rejected = true;
  }
  assertEquals(rejected, true);
  assertEquals(attempts, ["invalid-primary"]);
});
