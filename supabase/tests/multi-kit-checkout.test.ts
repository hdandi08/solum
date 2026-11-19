import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Deno.env.set("SUPABASE_URL", "https://rodvvmfzkyjsqbufkjbc.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-role");
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fixture");
Deno.env.set("CHECKOUT_RESERVATIONS_ENABLED", "true");
Deno.env.set("MULTI_KIT_CHECKOUT_ENABLED", "true");
let transport: typeof fetch = () =>
  Promise.reject(Error("Unexpected external request"));
globalThis.fetch = (...args) => transport(...args);
let handler: (r: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
}) as typeof Deno.serve;
await import("../functions/create-first-box-payment-intent/index.ts");
Deno.serve = serve;
const request = {
  kit_id: "ritual",
  items: [{ kit_id: "ritual", quantity: 2 }, { kit_id: "ground", quantity: 1 }],
  email: "fixture@example.test",
  source: "gift",
  payment_flow: "express_wallet",
  reservation_request_id: "22222222-2222-4222-8222-222222222222",
};
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
  stripe_customer_id: "cus_original",
  items: lines,
  total_quantity: 3,
  amount_pence: 23500,
  created_at: new Date().toISOString(),
};
function submit(body: unknown) {
  return handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}
Deno.test("items are validated even with multi-kit disabled; unrecognized environments cannot enable quantities", async () => {
  transport = () =>
    Promise.reject(
      Error("Invalid requests must have no provider side effects"),
    );
  for (
    const items of [null, [], [{ kit_id: "ground", quantity: 1.5 }], [{
      kit_id: "ground",
      quantity: 2,
      unit_amount_pence: 1,
    }]]
  ) assertEquals((await submit({ ...request, items })).status, 400);
  Deno.env.set("SUPABASE_URL", "https://production.supabase.co");
  assertEquals((await submit(request)).status, 409);
  Deno.env.set("SUPABASE_URL", "https://rodvvmfzkyjsqbufkjbc.supabase.co");
  Deno.env.set("MULTI_KIT_CHECKOUT_ENABLED", "false");
  assertEquals((await submit(request)).status, 409);
  Deno.env.set("MULTI_KIT_CHECKOUT_ENABLED", "true");
});
Deno.test("multi endpoint prepares trusted attempt then creates one idempotent payment and reserves before secret", async () => {
  const calls: string[] = [];
  transport = async (input, init) => {
    const r = new Request(input, init), u = new URL(r.url);
    calls.push(u.pathname);
    if (u.hostname === "api.stripe.com" && u.pathname === "/v1/customers") {
      return Response.json({ data: [{ id: "cus_candidate" }] });
    }
    if (u.pathname.endsWith("/rpc/prepare_multi_kit_attempt")) {
      const b = await r.json();
      assertEquals(b.p_items, lines);
      assertEquals(b.p_stripe_customer_id, "cus_candidate");
      return Response.json(attempt);
    }
    if (
      u.hostname === "api.stripe.com" && u.pathname === "/v1/payment_intents" &&
      r.method === "POST"
    ) {
      const b = new URLSearchParams(await r.text());
      assertEquals(b.get("amount"), "23500");
      assertEquals(b.get("customer"), "cus_original");
      assertEquals(b.get("metadata[checkout_flow]"), "multi_kit_v1");
      assertEquals(b.get("metadata[source]"), "gift");
      assertEquals(b.has("metadata[kit_id]"), false);
      assertEquals(b.has("shipping[name]"), false);
      assertEquals(r.headers.get("idempotency-key"), `multi-kit/${attempt.id}`);
      return Response.json({ id: "pi_fixture" });
    }
    if (u.pathname === "/v1/payment_intents/pi_fixture") {
      return Response.json({
        id: "pi_fixture",
        customer: "cus_original",
        amount: 23500,
        currency: "gbp",
        status: "requires_payment_method",
        livemode: false,
        client_secret: "pi_fixture_secret_hidden",
      });
    }
    if (u.pathname.endsWith("/rpc/reserve_multi_kit_stock")) {
      assertEquals(await r.json(), {
        p_attempt_id: attempt.id,
        p_resource_id: "pi_fixture",
      });
      return Response.json({
        state: "held",
        expires_at: new Date(Date.now() + 600000).toISOString(),
      });
    }
    if (u.pathname.endsWith("/leads")) return Response.json({});
    throw Error(`Unexpected ${r.method} ${u.pathname}`);
  };
  const res = await submit(request);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.checkout_flow, "multi_kit_v1");
  assertEquals(body.order_items, lines);
  assertEquals(body.total_quantity, 3);
  assertEquals(body.amount_pence, 23500);
  assertEquals(body.client_secret, "pi_fixture_secret_hidden");
  assertEquals(
    calls.indexOf("/rest/v1/rpc/prepare_multi_kit_attempt") <
      calls.indexOf("/v1/payment_intents"),
    true,
  );
});
Deno.test("quantity one items retain legacy payment route and authoritative kit choice", async () => {
  const calls: string[] = [];
  transport = async (input, init) => {
    const r = new Request(input, init), u = new URL(r.url);
    calls.push(u.pathname);
    if (u.pathname.endsWith("/rpc/prepare_checkout_attempt")) {
      const b = await r.json();
      return Response.json({
        created_at: new Date().toISOString(),
        customer_id: b.p_customer_id || null,
      });
    }
    if (u.pathname === "/v1/customers") {
      return Response.json({ data: [{ id: "cus_test" }] });
    }
    if (u.pathname === "/v1/payment_intents" && r.method === "POST") {
      const b = new URLSearchParams(await r.text());
      assertEquals(b.get("amount"), "6500");
      assertEquals(b.get("metadata[kit_id]"), "ground");
      return Response.json({ id: "pi_single" });
    }
    if (u.pathname === "/v1/payment_intents/pi_single") {
      return Response.json({
        id: "pi_single",
        status: "requires_payment_method",
        client_secret: "single_secret",
        livemode: false,
      });
    }
    if (u.pathname.endsWith("/rpc/reserve_checkout_stock")) {
      return Response.json({
        state: "held",
        expires_at: new Date(Date.now() + 600000).toISOString(),
      });
    }
    if (u.pathname.endsWith("/leads")) return Response.json({});
    throw Error(`Unexpected ${u.pathname}`);
  };
  const res = await submit({
    ...request,
    items: [{ kit_id: "ground", quantity: 1 }],
  });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).amount_pence, 6500);
  assertEquals(calls.some((p) => p.includes("multi")), false);
});
Deno.test('personal promo one-kit uses durable net-priced attempt; mixed returns original subtotal and saving',async()=>{
 Deno.env.set('META_PROMO_ENABLED','true');Deno.env.set('META_PROMO_ENTRY_SECRET','fixture-entry-secret');
 for(const input of [[{kit_id:'ground',quantity:1}],[{kit_id:'ground',quantity:1},{kit_id:'ritual',quantity:2}]]) {
  const netLines=input.map(i=>({...i,unit_amount_pence:i.kit_id==='ground'?5850:7650,line_amount_pence:(i.kit_id==='ground'?5850:7650)*i.quantity}));
  const subtotal=input.reduce((sum,i)=>sum+(i.kit_id==='ground'?6500:8500)*i.quantity,0);
  const net=subtotal*9/10;
  const promoAttempt={...attempt,items:netLines,total_quantity:input.reduce((sum,i)=>sum+i.quantity,0),amount_pence:net,subtotal_pence:subtotal,discount_pence:subtotal/10,promo_claim_id:'claim_fixture',promo_code:'BF-fixture',promo_email:'fixture@example.test'};
  transport=async(input,init)=>{
   const r=new Request(input,init),u=new URL(r.url);
   if(u.pathname.endsWith('/rpc/record_meta_promo_visit'))return Response.json({eligible:true,blocked:false,visitor_token:'11111111-1111-4111-8111-111111111111'});
   if(u.pathname==='/v1/customers')return Response.json({data:[{id:'cus_original'}]});
   if(u.pathname.endsWith('/rpc/prepare_meta_promo_attempt')) {const b=await r.json();assertEquals(b.p_email,'fixture@example.test');assertEquals(b.p_code,'BF-fixture');return Response.json(promoAttempt);}
   if(u.pathname==='/v1/payment_intents'&&r.method==='POST') {const b=new URLSearchParams(await r.text());assertEquals(b.get('amount'),String(net));assertEquals(b.get('metadata[checkout_flow]'),'multi_kit_v1');return Response.json({id:'pi_promo'});}
   if(u.pathname.endsWith('/rpc/freeze_meta_promo_payment_params'))return Response.json((await r.json()).p_params);
   if(u.pathname.endsWith('/rpc/bind_meta_promo_payment'))return Response.json(null);
   if(u.pathname==='/v1/payment_intents/pi_promo')return Response.json({id:'pi_promo',customer:'cus_original',amount:net,currency:'gbp',status:'requires_payment_method',livemode:false,client_secret:'promo_secret'});
   if(u.pathname.endsWith('/rpc/reserve_multi_kit_stock'))return Response.json({state:'held',expires_at:new Date(Date.now()+600000).toISOString()});
   if(u.pathname.endsWith('/leads'))return Response.json({});
   throw Error(`Unexpected ${u.pathname}`);
  };
  const res=await submit({...request,items:input,promo_code:'BF-fixture',promo_visitor_token:'11111111-1111-4111-8111-111111111111',attribution_checked:true});
  assertEquals(res.status,200);const body=await res.json();assertEquals(body.checkout_flow,'multi_kit_v1');assertEquals(body.amount_pence,net);assertEquals(body.order_items,netLines);assertEquals(body.promo,{code:'BF-fixture',discount_percent:10,subtotal_pence:subtotal,discount_pence:subtotal/10});
 }
});
Deno.test('blocked or disabled promo fails explicitly before any Stripe customer/payment side effect',async()=>{
 let stripeTouched=false;
 transport=async(input,init)=>{const r=new Request(input,init),u=new URL(r.url);if(u.hostname==='api.stripe.com')stripeTouched=true;if(u.pathname.endsWith('/rpc/record_meta_promo_visit'))return Response.json({eligible:false,blocked:true});throw Error('No external calls allowed');};
 const body={...request,promo_code:'BF-fixture',promo_visitor_token:'11111111-1111-4111-8111-111111111111',attribution_checked:true};
 assertEquals((await submit(body)).status,409);assertEquals(stripeTouched,false);
 Deno.env.set('META_PROMO_ENABLED','false');assertEquals((await submit(body)).status,409);Deno.env.set('META_PROMO_ENABLED','true');
});
