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
