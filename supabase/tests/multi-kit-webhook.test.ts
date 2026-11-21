import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Deno.env.set("SUPABASE_URL", "https://rodvvmfzkyjsqbufkjbc.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-role");
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fixture");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
Deno.env.set("RESEND_API_KEY", "fixture-resend");
// Already-paid attempts must still finalize after checkout has been disabled.
Deno.env.set("MULTI_KIT_CHECKOUT_ENABLED", "false");
Deno.env.set("CHECKOUT_RESERVATIONS_ENABLED", "false");
let transport: typeof fetch = () =>
  Promise.reject(Error("Unexpected external request"));
globalThis.fetch = (...args) => transport(...args);
let handler: (r: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
}) as typeof Deno.serve;
await import("../functions/stripe-webhook/index.ts");
Deno.serve = serve;
const lines = [{
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
const attempt = {
  id: "11111111-1111-4111-8111-111111111111",
  stripe_payment_id: "pi_multi",
  stripe_customer_id: "cus_fixture",
  items: lines,
  total_quantity: 3,
  amount_pence: 23500,
};
const pi = {
  id: "pi_multi",
  status: "succeeded",
  livemode: false,
  amount: 23500,
  amount_received: 23500,
  currency: "gbp",
  customer: "cus_fixture",
  metadata: {
    checkout_flow: "multi_kit_v1",
    multi_kit_attempt_id: attempt.id,
    email: "fixture@example.test",
    first_name: "Buyer",
    source: "gift",
    phone: "+441234",
  },
  shipping: {
    name: "Wallet Buyer",
    address: {
      line1: "1 Wallet Road",
      line2: null,
      city: "London",
      postal_code: "SW1A 1AA",
      country: "GB",
    },
  },
};
async function deliver(type: string, object: unknown) {
  const body = JSON.stringify({ id: "evt_multi", type, data: { object } }),
    timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("whsec_fixture"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const hex = Array.from(
    new Uint8Array(sig),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  return handler(
    new Request("http://localhost", {
      method: "POST",
      headers: { "stripe-signature": `t=${timestamp},v1=${hex}` },
      body,
    }),
  );
}
function fixture(
  { refund = false, rejectAdminOnce = false, verifiedPi = pi, storedAttempt = attempt as any } = {},
) {
  let claim: any = null,
    order: any = null,
    earlyRefund = refund,
    adminFailed = false;
  const emails: any[] = [], rpc: any[] = [], calls: string[] = [];
  transport = async (input, init) => {
    const r = new Request(input, init), u = new URL(r.url);
    calls.push(`${r.method} ${u.pathname}`);
    if (u.pathname === "/v1/payment_intents/pi_multi") {
      return Response.json(verifiedPi);
    }
    if (u.pathname.endsWith("/checkout_multi_attempts")) {
      return Response.json(storedAttempt);
    }
    if (u.pathname.endsWith("/events")) {
      if (r.method === "POST") {
        const b = await r.json();
        if (b.stripe_event_id?.startsWith("payment_intent.succeeded:")) {
          if (claim) return Response.json({ code: "23505" }, { status: 409 });
          claim = b.data;
        }
        return Response.json({});
      }
      if (r.method === "GET") return Response.json({ data: claim });
      if (r.method === "PATCH") {
        claim = (await r.json()).data;
        return Response.json({ id: "claim" });
      }
      if (r.method === "DELETE") {
        claim = null;
        return Response.json({ id: "claim" });
      }
    }
    if (u.pathname.endsWith("/customers")) {
      return Response.json({ id: "customer-fixture" });
    }
    if (u.pathname.endsWith("/rpc/record_checkout_full_refund")) {
      earlyRefund = true;
      rpc.push(await r.json());
      return Response.json(null);
    }
    if (u.pathname.endsWith("/rpc/finalise_multi_kit_order")) {
      const args = await r.json();
      rpc.push(args);
      assertEquals(args.p_address, {
        name: "Wallet Buyer",
        line1: "1 Wallet Road",
        line2: null,
        city: "London",
        postcode: "SW1A 1AA",
        country: "GB",
        phone: "+441234",
      });
      assertEquals(args.p_amount_pence, storedAttempt.amount_pence);
      assertEquals(args.p_source, "gift");
      order ??= {
        id: "order-fixture",
        created_at: "2026-11-19T00:00:00Z",
        customer_id: "customer-fixture",
        items: storedAttempt.items,
        total_quantity: storedAttempt.total_quantity,
        amount_pence: storedAttempt.amount_pence,
        ...(storedAttempt.promo_claim_id ? {promo:{code:storedAttempt.promo_code,discount_percent:10,subtotal_pence:storedAttempt.subtotal_pence,discount_pence:storedAttempt.discount_pence}} : {}),
        shipping_address: args.p_address,
        status: earlyRefund ? "refunded" : "paid",
        customer_confirmation_email_sent_at: null,
        admin_notification_email_sent_at: null,
      };
      return Response.json(order);
    }
    if (u.pathname.endsWith("/orders")) {
      if (r.method === "GET") return Response.json(order ?? null);
      if (r.method === "PATCH") {
        Object.assign(order, await r.json());
        return Response.json({ id: order.id });
      }
    }
    if (u.pathname.endsWith("/leads") || u.pathname.endsWith("/addresses")) {
      return Response.json({});
    }
    if (u.hostname === "api.resend.com") {
      const b = await r.json();
      emails.push(b);
      if (rejectAdminOnce && b.to === "harsha@bysolum.com" && !adminFailed) {
        adminFailed = true;
        return Response.json({ error: "retry" }, { status: 503 });
      }
      return Response.json({ id: "email-fixture" });
    }
    throw Error(`Unexpected ${r.method} ${u.pathname}`);
  };
  return { emails, rpc, calls };
}
Deno.test("paid multi flow before kit_id filter finalizes verified wallet address once and preserves replay/email claims", async () => {
  const f = fixture();
  assertEquals(
    (await deliver("payment_intent.succeeded", { ...pi, shipping: null }))
      .status,
    200,
  );
  assertEquals(f.rpc.length, 1);
  assertEquals(f.emails.length, 2);
  const html = f.emails[0].html;
  for (
    const expected of [
      "1 × GROUND",
      "2 × RITUAL",
      "£235.00",
      "£170.00",
      "1 Wallet Road",
      "separate parcels",
    ]
  ) assertEquals(html.includes(expected), true, expected);
  assertEquals((await deliver("payment_intent.succeeded", pi)).status, 200);
  assertEquals(f.rpc.length, 1);
  assertEquals(f.emails.length, 2);
  assertEquals(f.calls.some((p) => p.includes("/subscriptions")), false);
});
Deno.test("failed admin email releases claim and retry finalizes same order without duplicating accepted customer email", async () => {
  const f = fixture({ rejectAdminOnce: true });
  assertEquals((await deliver("payment_intent.succeeded", pi)).status, 500);
  assertEquals((await deliver("payment_intent.succeeded", pi)).status, 200);
  assertEquals(
    f.emails.filter((e) => e.to === "fixture@example.test").length,
    1,
  );
  assertEquals(f.emails.filter((e) => e.to === "harsha@bysolum.com").length, 2);
  assertEquals(f.rpc.length, 2);
});
Deno.test("early full refund is recorded before paid finalization and suppresses confirmations", async () => {
  const f = fixture();
  assertEquals(
    (await deliver("charge.refunded", {
      payment_intent: "pi_multi",
      amount: 23500,
      amount_refunded: 23500,
    })).status,
    200,
  );
  assertEquals((await deliver("payment_intent.succeeded", pi)).status, 200);
  assertEquals(f.rpc[0], { p_payment_id: "pi_multi" });
  assertEquals(f.emails.length, 0);
  assertEquals(f.rpc.length, 2);
});
Deno.test("paid amount/customer/currency mismatch fails before finalization or mail", async () => {
  for (
    const change of [{ amount_received: 1 }, { customer: "cus_other" }, {
      currency: "eur",
    }]
  ) {
    const f = fixture({ verifiedPi: { ...pi, ...change } });
    assertEquals((await deliver("payment_intent.succeeded", pi)).status, 500);
    assertEquals(f.rpc.length, 0);
    assertEquals(f.emails.length, 0);
  }
});
Deno.test('production live multi-kit webhook finalizes with flags off and rejects test resources',async()=>{
  Deno.env.set('SUPABASE_URL','https://gvfptmjluxpngfjendbi.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_live_fixture');
  try{
    const live={...pi,livemode:true};const f=fixture({verifiedPi:live});
    assertEquals((await deliver('payment_intent.succeeded',live)).status,200);
    assertEquals(f.rpc.length,1);assertEquals(f.emails.length,2);
    assertEquals((await deliver('payment_intent.succeeded',live)).status,200);assertEquals(f.rpc.length,1);
    const wrong=fixture();assertEquals((await deliver('payment_intent.succeeded',pi)).status,500);assertEquals(wrong.rpc.length,0);assertEquals(wrong.emails.length,0);
  }finally{Deno.env.set('SUPABASE_URL','https://rodvvmfzkyjsqbufkjbc.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');}
});

Deno.test('paid promo finalizes after flags disabled using claimed email despite different mutable wallet receipt_email',async()=>{
 Deno.env.set('META_PROMO_ENABLED','false');
 const promoAttempt={...attempt,items:lines.map(i=>({...i,unit_amount_pence:i.unit_amount_pence*9/10,line_amount_pence:i.line_amount_pence*9/10})),amount_pence:21150,subtotal_pence:23500,discount_pence:2350,promo_claim_id:'claim_fixture',promo_code:'BF-fixture',promo_email:'fixture@example.test'};
 const paid={...pi,amount:21150,amount_received:21150,receipt_email:'different-wallet@example.test'};
 const f=fixture({verifiedPi:paid,storedAttempt:promoAttempt});
 assertEquals((await deliver('payment_intent.succeeded',paid)).status,200);assertEquals(f.rpc.length,1);assertEquals(f.emails[0].to,'fixture@example.test');
 for(const email of f.emails) {assertEquals(email.html.includes('£235.00'),true);assertEquals(email.html.includes('£23.50'),true);assertEquals(email.html.includes('£211.50'),true);assertEquals(email.html.includes('£153.00'),true);}
 const mismatch=fixture({verifiedPi:{...paid,metadata:{...paid.metadata,email:'wrong@example.test'}},storedAttempt:promoAttempt});
 assertEquals((await deliver('payment_intent.succeeded',paid)).status,500);assertEquals(mismatch.calls.some(c=>c==='POST /rest/v1/customers'),false);assertEquals(mismatch.rpc.length,0);
});

Deno.test('production paid promo settles with creation disabled and preserves discounted financials',async()=>{
 Deno.env.set('SUPABASE_URL','https://gvfptmjluxpngfjendbi.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_live_fixture');Deno.env.set('META_PROMO_ENABLED','false');
 try{
  const promoAttempt={...attempt,items:lines.map(i=>({...i,unit_amount_pence:i.unit_amount_pence*9/10,line_amount_pence:i.line_amount_pence*9/10})),amount_pence:21150,subtotal_pence:23500,discount_pence:2350,promo_claim_id:'claim_fixture',promo_code:'BF-fixture',promo_email:'fixture@example.test'};
  const paid={...pi,livemode:true,amount:21150,amount_received:21150,receipt_email:'different-wallet@example.test'};
  const f=fixture({verifiedPi:paid,storedAttempt:promoAttempt});
  assertEquals((await deliver('payment_intent.succeeded',paid)).status,200);assertEquals(f.rpc.length,1);assertEquals(f.emails[0].to,'fixture@example.test');
  for(const email of f.emails){assertEquals(email.html.includes('£235.00'),true);assertEquals(email.html.includes('£23.50'),true);assertEquals(email.html.includes('£211.50'),true);}
  assertEquals((await deliver('payment_intent.succeeded',paid)).status,200);assertEquals(f.rpc.length,1);
  const wrong=fixture({verifiedPi:{...paid,livemode:false},storedAttempt:promoAttempt});
  assertEquals((await deliver('payment_intent.succeeded',{...paid,livemode:false})).status,500);assertEquals(wrong.rpc.length,0);
 }finally{Deno.env.set('SUPABASE_URL','https://rodvvmfzkyjsqbufkjbc.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');}
});
