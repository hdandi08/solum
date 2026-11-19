import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  discountedKitSelection,
  META_PROMO_ENDS_AT,
  metaPromoAdmission,
  metaPromoEnabled,
  preparePromoAttempt,
  signMetaPromoEntry,
  validatePromoPayment,
} from "./metaPromo.ts";
import { canonicalKitItems } from "./multiKitOrder.ts";
const env: Record<string, string> = {
  SUPABASE_URL: "https://rodvvmfzkyjsqbufkjbc.supabase.co",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  CHECKOUT_RESERVATIONS_ENABLED: "true",
  MULTI_KIT_CHECKOUT_ENABLED: "true",
  META_PROMO_ENABLED: "true",
  META_PROMO_ENTRY_SECRET: "fixture-entry-secret",
};
const now = () => Date.parse("2026-11-20T00:00:00Z");
const secret = env.META_PROMO_ENTRY_SECRET;
Deno.test("promo requires exact DEV test environment, dependencies and explicit flag", () => {
  assertEquals(metaPromoEnabled((k) => env[k]), true);
  for (
    const patch of [
      { SUPABASE_URL: "https://gvfptmjluxpngfjendbi.supabase.co" },
      { SUPABASE_URL: "https://rodvvmfzkyjsqbufkjbc.supabase.co.evil" },
      { STRIPE_SECRET_KEY: "sk_live_fixture" },
      { META_PROMO_ENABLED: "false" },
      { MULTI_KIT_CHECKOUT_ENABLED: "false" },
      { CHECKOUT_RESERVATIONS_ENABLED: "false" },
      { META_PROMO_ENTRY_SECRET: "" },
    ]
  ) {
    assertEquals(
      metaPromoEnabled((k) =>
        ({ ...env, ...patch } as Record<string, string | undefined>)[k]
      ),
      false,
    );
  }
});
Deno.test("only signed campaign entry and matching paid Meta tags admit; direct and generic Meta tags fail", async () => {
  const signature = await signMetaPromoEntry(secret);
  const input = {
    landing_url:
      `https://dev.bysolum.co.uk/?utm_source=facebook&utm_medium=paid_social&offer_entry=${signature}`,
    attribution_checked: true,
  };
  assertEquals(await metaPromoAdmission(input, secret, now), {
    eligible: true,
    blocked: false,
  });
  for (
    const query of [
      "",
      "?fbclid=abc",
      "?utm_source=facebook&utm_medium=paid_social",
      `?utm_source=facebook&utm_medium=organic&offer_entry=${signature}`,
      `?utm_source=facebook&utm_medium=paid_social&offer_entry=invalid`,
    ]
  ) {
    assertEquals(
      (await metaPromoAdmission(
        { ...input, landing_url: `https://dev.bysolum.co.uk/${query}` },
        secret,
        now,
      )).eligible,
      false,
    );
  }
  assertEquals(
    (await metaPromoAdmission(
      input,
      secret,
      () => Date.parse(META_PROMO_ENDS_AT),
    )).eligible,
    false,
  );
  assertEquals(
    (await metaPromoAdmission(
      { ...input, attribution_checked: false },
      secret,
      now,
    )).eligible,
    false,
  );
});
Deno.test("affiliate evidence always overrides signed Meta admission, including retained and unresolved AWIN", async () => {
  const base = {
    landing_url:
      `https://dev.bysolum.co.uk/?utm_source=ig&utm_medium=cpc&offer_entry=${await signMetaPromoEntry(
        secret,
      )}`,
    attribution_checked: true,
  };
  for (
    const patch of [
      { attribution: { awc: "retained-click" } },
      { awin_attribution_token: "unresolved" },
      { attribution: { channel: "aw" } },
      { landing_url: base.landing_url + "&source=aw" },
      { landing_url: base.landing_url + "&partner_id=123" },
      { landing_url: base.landing_url + "&utm_medium=affiliate" },
      { landing_url: base.landing_url + "&referral=friend" },
    ]
  ) {
    assertEquals(await metaPromoAdmission({ ...base, ...patch }, secret, now), {
      eligible: false,
      blocked: true,
    });
  }
});
Deno.test("entire order uses trusted net unit prices for one and mixed kits", () => {
  const mixed = discountedKitSelection(
    canonicalKitItems([{ kit_id: "ground", quantity: 1 }, {
      kit_id: "ritual",
      quantity: 2,
    }]),
  );
  assertEquals(mixed.amount_pence, 21150);
  assertEquals(mixed.subtotal_pence, 23500);
  assertEquals(mixed.discount_pence, 2350);
  assertEquals(mixed.items.map((x) => x.unit_amount_pence), [5850, 7650]);
  assertEquals(
    discountedKitSelection(
      canonicalKitItems([{ kit_id: "ground", quantity: 1 }]),
    ).amount_pence,
    5850,
  );
});
Deno.test("payment promo revalidates sticky ledger and email before payment; validates immutable returned snapshot", async () => {
  const body = {
    promo_code: "BF-123",
    promo_visitor_token: "visitor",
    email: "Claimed@Example.test",
    attribution_checked: true,
    reservation_request_id: "22222222-2222-4222-8222-222222222222",
  };
  const selection = discountedKitSelection(
    canonicalKitItems([{ kit_id: "ground", quantity: 1 }]),
  );
  const calls: any[] = [];
  const db = {
    rpc: (name: string, args: any) => {
      calls.push({ name, args });
      return Promise.resolve(
        name === "record_meta_promo_visit"
          ? { data: { eligible: true, blocked: false } }
          : {
            data: {
              id: "attempt",
              stripe_customer_id: "cus_fixture",
              ...selection,
              promo_claim_id: "claim",
              promo_code: "BF-123",
              created_at: new Date().toISOString(),
            },
          },
      );
    },
  };
  await validatePromoPayment(db, body, (k) => env[k]);
  const attempt = await preparePromoAttempt(db, body, selection, "cus_fixture");
  assertEquals(attempt.amount_pence, 5850);
  assertEquals(calls[1].name, "prepare_meta_promo_attempt");
  assertEquals(calls[1].args.p_email, "claimed@example.test");
  await assertRejects(() =>
    validatePromoPayment(
      {
        rpc: () =>
          Promise.resolve({ data: { eligible: false, blocked: true } }),
      },
      body,
      (k) => env[k],
    )
  );
  await assertRejects(() =>
    validatePromoPayment(db, { ...body, awc: "partner-click" }, (k) => env[k])
  );
  await assertRejects(() =>
    preparePromoAttempt(
      {
        rpc: () =>
          Promise.resolve({ error: { message: "promo_email_mismatch" } }),
      },
      body,
      selection,
      "cus_fixture",
    )
  );
  await assertRejects(() =>
    preparePromoAttempt(
      {
        rpc: () =>
          Promise.resolve({ data: { ...attempt, amount_pence: 6500 } }),
      },
      body,
      selection,
      "cus_fixture",
    )
  );
});
Deno.test("duplicate URL parameters cannot hide earlier affiliate evidence", async () => {
  const url =
    `https://dev.bysolum.co.uk/?utm_source=meta&utm_medium=paid_social&offer_entry=${await signMetaPromoEntry(
      secret,
    )}`;
  for (
    const query of [
      "&source=aw&source=meta",
      "&awc=known&awc=",
      "&partner_id=123&partner_id=",
    ]
  ) {
    assertEquals(
      await metaPromoAdmission(
        { landing_url: url + query, attribution_checked: true },
        secret,
        now,
      ),
      { eligible: false, blocked: true },
    );
  }
});
