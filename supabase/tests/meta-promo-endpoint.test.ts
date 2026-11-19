import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Deno.env.set("SUPABASE_URL", "https://rodvvmfzkyjsqbufkjbc.supabase.co");
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fixture");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-role");
for (
  const key of [
    "META_PROMO_ENABLED",
    "MULTI_KIT_CHECKOUT_ENABLED",
    "CHECKOUT_RESERVATIONS_ENABLED",
  ]
) Deno.env.set(key, "true");
Deno.env.set("META_PROMO_ENTRY_SECRET", "fixture-entry-secret");
let transport: typeof fetch = () =>
  Promise.reject(Error("Unexpected external request"));
globalThis.fetch = (...args) => transport(...args);
let handler: (r: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
}) as typeof Deno.serve;
await import("../functions/meta-promo/index.ts");
Deno.serve = serve;
const submit = (body: any) =>
  handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
Deno.test("DEV claim stores exact consent and returns preview without outbound email", async () => {
  transport = async (input, init) => {
    const req = new Request(input, init),
      url = new URL(req.url),
      body = await req.json();
    if (url.pathname.endsWith("/rpc/rate_limit_meta_promo")) {
      return Response.json(true);
    }
    if (url.pathname.endsWith("/rpc/record_meta_promo_visit")) {
      return Response.json({
        visitor_token: "11111111-1111-4111-8111-111111111111",
        eligible: true,
        blocked: false,
      });
    }
    if (url.pathname.endsWith("/rpc/claim_meta_promo")) {
      assertEquals(body.p_email, "fixture@example.test");
      assertEquals(body.p_marketing_consent, false);
      assertEquals(body.p_consent_text, "Send me SOLUM news and offers");
      assertEquals(body.p_consent_version, "black-friday-2026-v1");
      return Response.json({
        code: "BF-fixture",
        email: body.p_email,
        discount_percent: 10,
        ends_at: "2026-12-01T00:00:00Z",
      });
    }
    throw Error(`Unexpected outbound ${url.hostname}${url.pathname}`);
  };
  const res = await submit({
    action: "claim",
    visitor_token: "11111111-1111-4111-8111-111111111111",
    email: " Fixture@Example.test ",
    marketing_consent: false,
    attribution_checked: true,
  });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).email_delivery, "preview");
  Deno.env.set("META_PROMO_ENABLED", "false");
  assertEquals((await submit({ action: "claim" })).status, 409);
  Deno.env.set("META_PROMO_ENABLED", "true");
});
Deno.test("invalid consent, unknown action and affiliate claim cannot acquire grant", async () => {
  let claim = false;
  transport = async (input) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    if (url.pathname.endsWith("/rpc/rate_limit_meta_promo")) {
      return Response.json(true);
    }
    if (url.pathname.endsWith("/rpc/record_meta_promo_visit")) {
      return Response.json({
        visitor_token: "11111111-1111-4111-8111-111111111111",
        eligible: false,
        blocked: true,
      });
    }
    claim = true;
    throw Error("Unexpected");
  };
  assertEquals(
    (await submit({
      action: "claim",
      visitor_token: "11111111-1111-4111-8111-111111111111",
      email: "fixture@example.test",
      marketing_consent: false,
      attribution: { awc: "partner" },
      attribution_checked: true,
    })).status,
    409,
  );
  assertEquals(claim, false);
  assertEquals((await submit({ action: "unknown" })).status, 400);
});
