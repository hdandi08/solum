import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ensureCheckoutSubscription } from "./checkoutSubscription.ts";
Deno.test("payment retries reuse the persisted subscription and stable Stripe keys", async () => {
  let saved: any = null, creates = 0;
  const keys: string[] = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: saved, error: null }),
        }),
      }),
      upsert: (value: any) => {
        saved = value;
        return Promise.resolve({ error: null });
      },
    }),
  };
  const stripe = {
    prices: {
      create: (_: any, o: any) => {
        keys.push(o.idempotencyKey);
        return Promise.resolve({ id: "price_test" });
      },
    },
    subscriptions: {
      create: (_: any, o: any) => {
        creates++;
        keys.push(o.idempotencyKey);
        return Promise.resolve({ id: "sub_test" });
      },
    },
  };
  const pi = {
    id: "pi_test",
    customer: "cus_test",
    payment_method: "pm_test",
    created: Math.floor(Date.now() / 1000),
    metadata: { kit_id: "ritual", monthly_pence: "4800" },
  };
  assertEquals(
    await ensureCheckoutSubscription(db, stripe, pi, pi.metadata),
    "sub_test",
  );
  assertEquals(
    await ensureCheckoutSubscription(db, stripe, pi, pi.metadata),
    "sub_test",
  );
  assertEquals(creates, 1);
  assertEquals(keys, [
    "checkout-refill-price/pi_test",
    "checkout-subscription/pi_test",
  ]);
});
