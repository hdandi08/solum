import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canonicalKitItems,
  createMultiKitPayment,
  multiKitCheckoutEnabled,
  multiKitSummary,
  prepareMultiKitAttempt,
  verifiedMultiKitShipping,
  verifyMultiKitPayment,
} from "./multiKitOrder.ts";

Deno.env.set('SUPABASE_URL','https://rodvvmfzkyjsqbufkjbc.supabase.co');
Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');

const items = [{
  kit_id: "ground",
  quantity: 1,
  unit_amount_pence: 6500,
  line_amount_pence: 6500,
}, {
  kit_id: "ritual",
  quantity: 2,
  unit_amount_pence: 8500,
  line_amount_pence: 17000,
}];
Deno.test("canonical kit quantities combine duplicates, sort, and use fixed £65/£85 prices", () => {
  assertEquals(
    canonicalKitItems([{ kit_id: "ritual", quantity: 1 }, {
      kit_id: "ground",
      quantity: 1,
    }, { kit_id: "ritual", quantity: 1 }]),
    { items, total_quantity: 3, amount_pence: 23500 },
  );
  assertEquals(multiKitSummary(items), "1 × GROUND + 2 × RITUAL");
});
Deno.test("canonical quantities reject malformed, unsupported, fractional, negative, over-limit and price-tampered input", () => {
  for (
    const invalid of [
      undefined,
      null,
      {},
      [],
      [{ kit_id: "sovereign", quantity: 1 }],
      [{ kit_id: "ground" }],
      [{ kit_id: "ground", quantity: "2" }],
      [{ kit_id: "ground", quantity: 1.5 }],
      [{ kit_id: "ground", quantity: 0 }],
      [{ kit_id: "ground", quantity: -1 }],
      [{ kit_id: "ground", quantity: 3 }, { kit_id: "ground", quantity: 3 }],
      [{ kit_id: "ground", quantity: 1, unit_amount_pence: 1 }],
    ]
  ) assertThrows(() => canonicalKitItems(invalid));
  assertEquals(
    canonicalKitItems([{ kit_id: "ritual", quantity: 1 }]).total_quantity,
    1,
  );
});
Deno.test("multi-kit feature gate fails closed outside exact dev/test/reservations/flag configuration", () => {
  const env: Record<string, string> = {
    SUPABASE_URL: "https://rodvvmfzkyjsqbufkjbc.supabase.co",
    STRIPE_SECRET_KEY: "sk_test_fixture",
    CHECKOUT_RESERVATIONS_ENABLED: "true",
    MULTI_KIT_CHECKOUT_ENABLED: "true",
  };
  assertEquals(multiKitCheckoutEnabled((k) => env[k]), true);
  for (
    const [key, value] of [
      ["SUPABASE_URL", "https://rodvvmfzkyjsqbufkjbc.supabase.co.evil"],
      ["STRIPE_SECRET_KEY", "sk_live_fixture"],
      ["CHECKOUT_RESERVATIONS_ENABLED", "false"],
      ["MULTI_KIT_CHECKOUT_ENABLED", "false"],
    ]
  ) {
    assertEquals(
      multiKitCheckoutEnabled((k) => k === key ? value : env[k]),
      false,
    );
  }
});
Deno.test("production multi-kit requires the exact production project and live credentials", () => {
  const env:Record<string,string>={SUPABASE_URL:'https://gvfptmjluxpngfjendbi.supabase.co',STRIPE_SECRET_KEY:'sk_live_fixture',CHECKOUT_RESERVATIONS_ENABLED:'true',MULTI_KIT_CHECKOUT_ENABLED:'true'};
  assertEquals(multiKitCheckoutEnabled(k=>env[k]),true);
  for(const patch of [{STRIPE_SECRET_KEY:'sk_test_fixture'},{SUPABASE_URL:'https://gvfptmjluxpngfjendbi.supabase.co.evil'},{MULTI_KIT_CHECKOUT_ENABLED:'false'},{CHECKOUT_RESERVATIONS_ENABLED:'false'}]) assertEquals(multiKitCheckoutEnabled(k=>({...env,...patch})[k]),false);
});
const attempt = {
  id: "11111111-1111-4111-8111-111111111111",
  items,
  total_quantity: 3,
  amount_pence: 23500,
  created_at: new Date().toISOString(),
  stripe_customer_id: "cus_test",
};
Deno.test("immutable attempt uses original request key/customer snapshot on retries", async () => {
  const calls: any[] = [];
  const db = {
    rpc: (name: string, args: any) => {
      calls.push({ name, args });
      return Promise.resolve({ data: attempt, error: null });
    },
  };
  const result = await prepareMultiKitAttempt(
    db,
    { reservation_request_id: "22222222-2222-4222-8222-222222222222" },
    canonicalKitItems(
      items.map(({ kit_id, quantity }) => ({ kit_id, quantity })),
    ),
    "cus_candidate",
  );
  assertEquals(result.stripe_customer_id, "cus_test");
  assertEquals(calls, [{
    name: "prepare_multi_kit_attempt",
    args: {
      p_request_key: "multi-22222222-2222-4222-8222-222222222222",
      p_items: items,
      p_stripe_customer_id: "cus_candidate",
    },
  }]);
});
function paymentHarness(state = "held", status = "requires_payment_method", livemode = false) {
  const calls: any[] = [];
  const db = {
    rpc: (name: string, args: any) => {
      calls.push({ name, args });
      return Promise.resolve({
        data: {
          state,
          expires_at: new Date(Date.now() + 600000).toISOString(),
        },
        error: null,
      });
    },
  };
  const pi = {
    id: "pi_test",
    client_secret: "pi_test_secret_hidden",
    status,
    customer: "cus_test",
    amount: 23500,
    currency: "gbp",
    livemode,
  };
  const stripe = {
    paymentIntents: {
      create: (_params: any, options: any) => {
        calls.push({ create: options });
        return Promise.resolve(pi);
      },
      retrieve: () => Promise.resolve(pi),
      cancel: () => {
        calls.push("cancel");
        return Promise.resolve({ status: "canceled" });
      },
    },
  };
  return { db, stripe, calls };
}
Deno.test("payment is idempotent per immutable attempt and reserves all stock before exposing its secret", async () => {
  const h = paymentHarness();
  const result = await createMultiKitPayment(h.db, h.stripe, attempt, {
    metadata: { source: "gift" },
  });
  assertEquals(result.client_secret, "pi_test_secret_hidden");
  assertEquals(h.calls[0], {
    create: { idempotencyKey: `multi-kit/${attempt.id}` },
  });
  assertEquals(h.calls[1], {
    name: "reserve_multi_kit_stock",
    args: { p_attempt_id: attempt.id, p_resource_id: "pi_test" },
  });
});
Deno.test('production exposes only live Stripe resources and rejects mode mismatches before reserving',async()=>{
  Deno.env.set('SUPABASE_URL','https://gvfptmjluxpngfjendbi.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_live_fixture');
  try{
    const live=paymentHarness('held','requires_payment_method',true);
    assertEquals((await createMultiKitPayment(live.db,live.stripe,attempt,{})).livemode,true);
    const test=paymentHarness();await assertRejects(()=>createMultiKitPayment(test.db,test.stripe,attempt,{}));
    assertEquals(test.calls.some(call=>call?.name==='reserve_multi_kit_stock'),false);
  }finally{Deno.env.set('SUPABASE_URL','https://rodvvmfzkyjsqbufkjbc.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');}
  const wrong=paymentHarness('held','requires_payment_method',true);await assertRejects(()=>createMultiKitPayment(wrong.db,wrong.stripe,attempt,{}));
  assertEquals(wrong.calls.some(call=>call?.name==='reserve_multi_kit_stock'),false);
});
Deno.test("sold-out/released attempts never expose a secret or reacquire stock; cancel then release safely", async () => {
  for (const state of ["sold_out", "released", "consumed"]) {
    const h = paymentHarness(state);
    await assertRejects(() =>
      createMultiKitPayment(h.db, h.stripe, attempt, {})
    );
    assertEquals(h.calls.at(-2), "cancel");
    assertEquals(h.calls.at(-1), {
      name: "settle_checkout_reservation",
      args: { p_resource_id: "pi_test", p_outcome: "released" },
    });
  }
});
Deno.test("paid or processing retries never cancel, reserve again or expose a secret", async () => {
  for (const status of ["succeeded", "processing", "requires_capture"]) {
    const h = paymentHarness("held", status);
    await assertRejects(() =>
      createMultiKitPayment(h.db, h.stripe, attempt, {})
    );
    assertEquals(h.calls.length, 1);
  }
});
Deno.test("unknown cancellation outcome keeps a possibly committed hold for the worker", async () => {
  const h = paymentHarness();
  h.db.rpc = () => Promise.reject(Error("timeout"));
  h.stripe.paymentIntents.cancel = () => Promise.reject(Error("timeout"));
  await assertRejects(() => createMultiKitPayment(h.db, h.stripe, attempt, {}));
  assertEquals(h.calls.length, 1);
});
Deno.test("paid verification rejects money, currency, customer and resource mismatch and accepts only a valid GB wallet address", () => {
  const pi = {
    id: "pi_test",
    status: "succeeded",
    amount: 23500,
    amount_received: 23500,
    currency: "gbp",
    customer: "cus_test",
    metadata: { multi_kit_attempt_id: attempt.id },
    shipping: {
      name: "Test Buyer",
      address: {
        line1: "1 Test Street",
        city: "London",
        postal_code: "SW1A 1AA",
        country: "GB",
      },
    },
  };
  const trusted = { ...attempt, stripe_payment_id: "pi_test" };
  verifyMultiKitPayment(pi, trusted);
  for (
    const mutation of [
      { amount: 1 },
      { amount_received: 1 },
      { currency: "eur" },
      { customer: "cus_other" },
      { id: "pi_other" },
      { status: "processing" },
    ]
  ) assertThrows(() => verifyMultiKitPayment({ ...pi, ...mutation }, trusted));
  assertEquals(verifiedMultiKitShipping(pi).postcode, "SW1A 1AA");
  for (
    const shipping of [null, { name: "Buyer", address: { country: "FR" } }, {
      name: "",
      address: { country: "GB" },
    }]
  ) assertThrows(() => verifiedMultiKitShipping({ ...pi, shipping }));
});
Deno.test("a failed Stripe retrieval cancels an unexposed resource but never releases an unknown cancellation", async () => {
  const h = paymentHarness();
  h.stripe.paymentIntents.retrieve = () =>
    Promise.reject(Error("retrieval timeout"));
  await assertRejects(() => createMultiKitPayment(h.db, h.stripe, attempt, {}));
  assertEquals(h.calls.at(-2), "cancel");
  assertEquals(h.calls.at(-1), {
    name: "settle_checkout_reservation",
    args: { p_resource_id: "pi_test", p_outcome: "released" },
  });
});

Deno.test("kit IDs must be strings rather than coercible object keys", () => {
  for (const kit_id of [["ground"], { toString: () => "ground" }]) {
    assertThrows(() => canonicalKitItems([{ kit_id, quantity: 2 }]));
  }
});
