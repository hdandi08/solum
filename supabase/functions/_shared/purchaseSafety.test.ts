import { assertEquals } from "jsr:@std/assert";
import * as purchaseSafety from "./purchaseSafety.ts";

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

Deno.test("existing-order replay after enqueue failure can attempt side effects only without a durable marker", () => {
  const shouldAttempt = shouldSendExternalPurchaseSideEffects as unknown as (
    input: {
      livemode?: boolean;
      orderAlreadyExists: boolean;
      purchaseSideEffectsAttempted: boolean;
    },
  ) => boolean;

  assertEquals(shouldAttempt({
    livemode: true,
    orderAlreadyExists: true,
    purchaseSideEffectsAttempted: false,
  }), true);
  assertEquals(shouldAttempt({
    livemode: true,
    orderAlreadyExists: true,
    purchaseSideEffectsAttempted: true,
  }), false);
  assertEquals(shouldAttempt({
    livemode: false,
    orderAlreadyExists: true,
    purchaseSideEffectsAttempted: false,
  }), false);
});

Deno.test("purchase side-effect attempt marker is immutable input and survives stale-claim replay", () => {
  const helpers = purchaseSafety as unknown as {
    paymentIntentPurchaseSideEffectsAttempted: (data: Record<string, unknown>) => boolean;
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

  assertEquals(marker({ state: "processing", awin_attempted: true }), undefined);
  assertEquals(shouldAttempt({
    livemode: true,
    orderAlreadyExists: true,
    purchaseSideEffectsAttempted: undefined,
  }), false);
  assertEquals(shouldAttempt({
    livemode: true,
    orderAlreadyExists: true,
    purchaseSideEffectsAttempted: false,
  }), true);
});
