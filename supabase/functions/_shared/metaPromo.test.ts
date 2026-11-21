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
  recordPromoVisit,
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
Deno.test("verified non-affiliate direct, organic and Meta visits admit without signed ad tags", async () => {
  const signature = await signMetaPromoEntry(secret);
  for (
    const landing_url of [
      "https://dev.bysolum.co.uk/",
      "https://dev.d3pa095gzazg3c.amplifyapp.com/buy?kit=ritual",
      "https://dev.bysolum.co.uk/?utm_source=google&utm_medium=organic",
      "https://dev.bysolum.co.uk/?utm_source=instagram&utm_medium=organic",
      "https://dev.bysolum.co.uk/?fbclid=abc",
      "https://dev.bysolum.co.uk/?utm_source=meta&utm_medium=paid_social",
      `https://dev.bysolum.co.uk/?utm_source=meta&utm_medium=paid_social&offer_entry=${signature}`,
      "https://dev.bysolum.co.uk/?offer_entry=old-or-invalid-signature",
      "http://localhost:4190/buy",
      "http://localhost:5173/",
    ]
  ) {
    assertEquals(
      await metaPromoAdmission(
        { landing_url, attribution_checked: true },
        secret,
        now,
      ),
      { eligible: true, blocked: false },
      landing_url,
    );
  }
});
Deno.test("admission rejects unchecked attribution, expiry, unsupported hosts/protocols and ambiguous URL tags", async () => {
  const input = {
    landing_url: "https://dev.bysolum.co.uk/",
    attribution_checked: true,
  };
  for (const attribution_checked of [false, undefined, null, "true"]) {
    assertEquals(
      (await metaPromoAdmission({ ...input, attribution_checked }, secret, now))
        .eligible,
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
  for (
    const landing_url of [
      "https://bysolum.co.uk/",
      "https://www.bysolum.co.uk/",
      "https://dev.bysolum.co.uk.evil.test/",
      "https://evil.test/?host=dev.bysolum.co.uk",
      "http://dev.bysolum.co.uk/",
      "ftp://dev.bysolum.co.uk/",
      "javascript:alert(1)",
      "https://dev.bysolum.co.uk:444/",
      "https://someone@dev.bysolum.co.uk/",
      "http://localhost:8000/",
      "https://localhost:4190/",
      "not a URL",
      "",
      "https://dev.bysolum.co.uk/?utm_source=meta&utm_source=google",
      "https://dev.bysolum.co.uk/?utm_medium=organic&utm_medium=cpc",
      "https://dev.bysolum.co.uk/?offer_entry=one&offer_entry=two",
    ]
  ) {
    assertEquals(
      await metaPromoAdmission({ ...input, landing_url }, secret, now),
      { eligible: false, blocked: false },
      landing_url,
    );
  }
});
Deno.test("affiliate evidence always overrides direct and Meta admission, including retained and unresolved AWIN", async () => {
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

Deno.test("direct visits retain the server's sticky affiliate exclusion despite otherwise valid admission", async () => {
  for (
    const landing_url of [
      "https://dev.bysolum.co.uk/",
      "https://dev.bysolum.co.uk/?utm_source=meta&utm_medium=paid_social",
    ]
  ) {
    let forwarded: any;
    const blockedLedger = {
      visitor_token: "11111111-1111-4111-8111-111111111111",
      eligible: false,
      blocked: true,
    };
    const db = {
      rpc: (_name: string, args: any) => {
        forwarded = args;
        return Promise.resolve({ data: blockedLedger });
      },
    };
    assertEquals(
      await recordPromoVisit(db, {
        visitor_token: blockedLedger.visitor_token,
        landing_url,
        attribution_checked: true,
      }, (key) => env[key]),
      blockedLedger,
    );
    assertEquals(forwarded.p_eligible, true);
    assertEquals(forwarded.p_blocked, false);
  }
});
Deno.test("direct visits cannot use duplicate parameters to conceal affiliate or partnership evidence", async () => {
  for (
    const query of [
      "?source=aw&source=direct",
      "?awc=known&awc=",
      "?partner_id=123&partner_id=",
      "?utm_source=impact&utm_source=google",
    ]
  ) {
    assertEquals(
      await metaPromoAdmission(
        {
          landing_url: "https://dev.bysolum.co.uk/" + query,
          attribution_checked: true,
        },
        secret,
        now,
      ),
      { eligible: false, blocked: true },
    );
  }
});
Deno.test("an existing eligible visitor cannot bypass the DEV landing URL or attribution checks", async () => {
  const ledger = {
    visitor_token: "11111111-1111-4111-8111-111111111111",
    eligible: true,
    blocked: false,
  };
  const db = { rpc: () => Promise.resolve({ data: ledger }) };
  for (
    const body of [
      {
        action: "visit",
        landing_url: "https://bysolum.co.uk/",
        attribution_checked: true,
      },
      {
        action: "visit",
        landing_url: "https://dev.bysolum.co.uk/",
        attribution_checked: false,
      },
      { action: "visit", attribution_checked: true },
    ]
  ) {
    assertEquals(
      (await recordPromoVisit(db, body, (key) => env[key])).eligible,
      false,
    );
  }
  // A claim has no landing_url in the stable API contract and uses its ledger.
  assertEquals(
    (await recordPromoVisit(
      db,
      { action: "claim", attribution_checked: true },
      (key) => env[key],
    )).eligible,
    true,
  );
});
Deno.test("retained affiliate or partnership evidence excludes ordinary direct visits", async () => {
  for (
    const evidence of [
      { attribution: { awc: "retained-click" } },
      { awin_attribution_token: "retained-signed-token" },
      { attribution: { channel: "aw" } },
      { campaign_attribution: { utm_source: "awin" } },
      { campaign_attribution: { utm_medium: "affiliate" } },
      { partner_id: "known-partner" },
    ]
  ) {
    assertEquals(
      await metaPromoAdmission(
        {
          landing_url: "https://dev.bysolum.co.uk/",
          attribution_checked: true,
          ...evidence,
        },
        secret,
        now,
      ),
      { eligible: false, blocked: true },
    );
  }
});
