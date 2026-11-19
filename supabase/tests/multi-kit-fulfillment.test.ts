import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Deno.env.set("SUPABASE_URL", "https://rodvvmfzkyjsqbufkjbc.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-role");
Deno.env.set("SUPABASE_ANON_KEY", "fixture-anon");
Deno.env.set("SENDCLOUD_PUBLIC_KEY", "fixture-public");
Deno.env.set("SENDCLOUD_SECRET_KEY", "fixture-secret");
Deno.env.delete("SENDCLOUD_WEBHOOK_SECRET");
let transport: typeof fetch = () =>
  Promise.reject(Error("Unexpected external request"));
globalThis.fetch = (...args) => transport(...args);
let label: (r: Request) => Promise<Response>,
  callback: (r: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: typeof label) => {
  label = fn;
}) as typeof Deno.serve;
await import("../functions/create-sendcloud-parcel/index.ts");
Deno.serve = ((fn: typeof callback) => {
  callback = fn;
}) as typeof Deno.serve;
await import("../functions/sendcloud-webhook/index.ts");
Deno.serve = serve;
const orderId = "11111111-1111-4111-8111-111111111111";
const encode = (value: unknown) =>
  btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_")
    .replaceAll("=", "");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${
  encode({
    sub: orderId,
    email: "fixture@example.test",
    aal: "aal2",
    app_metadata: { role: "admin" },
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
}.${encode("fixture-signature")}`;
for (const get_label of [false, true]) {
  Deno.test(`legacy label ${get_label ? "download" : "creation"} refuses repeated or mixed multi-kit orders before any carrier request`, async () => {
    let providerCalls = 0;
    transport = async (input, init) => {
      const r = new Request(input, init), u = new URL(r.url);
      if (u.pathname === "/auth/v1/user") {
        return Response.json({ id: orderId, email: "fixture@example.test" });
      }
      if (u.pathname.endsWith("/orders")) {
        return Response.json({
          id: orderId,
          customer_id: orderId,
          kit_id: "ritual",
          kit_quantity: 2,
          checkout_version: "multi_kit_v1",
          status: "paid",
          sendcloud_parcel_id: get_label ? "existing-fixture" : null,
          customers: null,
        });
      }
      providerCalls++;
      throw Error(`Provider must not be called ${u.pathname}`);
    };
    const res = await label(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          origin: "https://admin-dev.bysolum.co.uk",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId, get_label }),
      }),
    );
    assertEquals(res.status, 409);
    assertEquals(
      (await res.json()).error.code,
      "MULTI_KIT_FULFILLMENT_UNAVAILABLE",
    );
    assertEquals(providerCalls, 0);
  });
}
Deno.test("legacy carrier callback ignores multi-kit status and tracking without retry or any mutation", async () => {
  const methods: string[] = [];
  transport = async (input, init) => {
    const r = new Request(input, init);
    methods.push(r.method);
    if (new URL(r.url).pathname.endsWith("/orders") && r.method === "GET") {
      return Response.json({
        dispatch_status: "pending",
        kit_quantity: 3,
        checkout_version: "multi_kit_v1",
      });
    }
    throw Error("No multi-kit mutation or email is allowed");
  };
  const res = await callback(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        action: "parcel_status_changed",
        parcel: {
          id: 123,
          order_number: orderId,
          status: { id: 11 },
          tracking_number: "fixture-tracking",
        },
      }),
    }),
  );
  assertEquals(res.status, 200);
  assertEquals(methods, ["GET"]);
});
