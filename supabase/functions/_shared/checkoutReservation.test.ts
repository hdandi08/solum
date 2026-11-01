import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reconcileReservation, reservePayment } from "./checkoutReservation.ts";
const now = Date.parse("2026-11-01T12:12:00Z");
const row = {
  resource_id: "pi_test",
  resource_kind: "payment_intent",
  expires_at: "2026-11-01T12:12:00Z",
};
function harness(status: string, cancelStatus = "canceled") {
  const calls: string[] = [];
  const db = {
    rpc: (_name: string, args: Record<string, string>) => {
      calls.push(args.p_outcome);
      return Promise.resolve({ data: args.p_outcome, error: null });
    },
  };
  const stripe = {
    paymentIntents: {
      retrieve: () => Promise.resolve({ status }),
      cancel: () => {
        calls.push("cancel");
        return Promise.resolve({ status: cancelStatus });
      },
    },
    checkout: {
      sessions: {
        retrieve: () => Promise.resolve({ status, payment_status: "unpaid" }),
        expire: () => {
          calls.push("expire");
          return Promise.resolve({
            status: "expired",
            payment_status: "unpaid",
          });
        },
      },
    },
  };
  return { calls, db, stripe };
}
Deno.test("expiry cancels before releasing stock", async () => {
  const h = harness("requires_payment_method");
  await reconcileReservation(h.db, h.stripe, row, now);
  assertEquals(h.calls, ["cancel", "released"]);
});
Deno.test("paid and processing payments never release", async () => {
  for (const status of ["succeeded", "processing", "requires_capture"]) {
    const h = harness(status);
    await reconcileReservation(h.db, h.stripe, row, now);
    assertEquals(h.calls, status === "succeeded" ? ["consumed"] : []);
  }
});
Deno.test("authentication gets five minutes grace", async () => {
  const h = harness("requires_action");
  await reconcileReservation(h.db, h.stripe, row, now);
  assertEquals(h.calls, []);
  await reconcileReservation(h.db, h.stripe, row, now + 300000);
  assertEquals(h.calls, ["cancel", "released"]);
});
Deno.test("failed or ambiguous cancellation keeps stock held", async () => {
  const h = harness("requires_confirmation", "processing");
  await reconcileReservation(h.db, h.stripe, row, now);
  assertEquals(h.calls, ["cancel"]);
  h.stripe.paymentIntents.cancel = () => Promise.reject(Error("timeout"));
  await assertRejects(() => reconcileReservation(h.db, h.stripe, row, now));
  assertEquals(h.calls, ["cancel"]);
});
Deno.test("not-yet-expired holds are untouched", async () => {
  const h = harness("requires_payment_method");
  await reconcileReservation(h.db, h.stripe, row, now - 1);
  assertEquals(h.calls, []);
});
Deno.test("open hosted checkout expires before release; completed unpaid stays held", async () => {
  for (const state of ["open", "complete"]) {
    const h = harness(state);
    await reconcileReservation(h.db, h.stripe, {
      ...row,
      resource_kind: "checkout_session",
      resource_id: "cs_test",
    }, now);
    assertEquals(h.calls, state === "open" ? ["expire", "released"] : []);
  }
});
Deno.test("no secret may be exposed if reservation fails", async () => {
  const h = harness("requires_payment_method");
  h.db.rpc = () =>
    Promise.resolve({ data: { state: "sold_out" }, error: null }) as any;
  const result = await reservePayment(
    h.db,
    h.stripe,
    "pi_test",
    "payment_intent",
    "ground",
    true,
  );
  assertEquals(result.error, "sold_out");
  assertEquals(h.calls, ["cancel"]);
});
Deno.test("failed database reservation cancels unexposed payment and returns unavailable", async () => {
  const h = harness("requires_payment_method");
  h.db.rpc = () => Promise.resolve({ data: null, error: Error("db") }) as any;
  const result = await reservePayment(
    h.db,
    h.stripe,
    "pi_test",
    "payment_intent",
    "ground",
    true,
  );
  assertEquals(result.error, "inventory_unavailable");
  assertEquals(h.calls, ["cancel"]);
});
Deno.test("an ambiguous reserve response cannot re-expose a canceled intent", async () => {
  const h = harness("canceled");
  h.db.rpc = () =>
    Promise.resolve({
      data: {
        state: "held",
        expires_at: new Date(Date.now() + 720000).toISOString(),
      },
      error: null,
    }) as any;
  const result = await reservePayment(
    h.db,
    h.stripe,
    "pi_test",
    "payment_intent",
    "ground",
    true,
  );
  assertEquals(result.error, "reservation_expired");
});
import { releaseOwnedReservation } from "./checkoutReservation.ts";
Deno.test("editing requires the matching client secret and cannot release a paid payment", async () => {
  const h = harness("requires_payment_method");
  h.stripe.paymentIntents.retrieve = () =>
    Promise.resolve({
      status: "requires_payment_method",
      client_secret: "pi_test_secret_owner",
    }) as any;
  await assertRejects(() =>
    releaseOwnedReservation(h.db, h.stripe, "pi_test_secret_wrong")
  );
  assertEquals(h.calls, []);
  await releaseOwnedReservation(h.db, h.stripe, "pi_test_secret_owner");
  assertEquals(h.calls, ["cancel", "released"]);
  const paid = harness("succeeded");
  paid.stripe.paymentIntents.retrieve = () =>
    Promise.resolve({
      status: "succeeded",
      client_secret: "pi_test_secret_owner",
    }) as any;
  await assertRejects(() =>
    releaseOwnedReservation(paid.db, paid.stripe, "pi_test_secret_owner")
  );
  assertEquals(paid.calls, []);
});
Deno.test('replaying a paid or processing intent cannot reset the checkout attempt',async()=>{
 for(const status of ['succeeded','processing','requires_capture']) {
  const h=harness(status);
  const result=await reservePayment(h.db,h.stripe,'pi_test','payment_intent','ritual',true);
  assertEquals(result.error,status==='succeeded'?'payment_completed':'payment_processing');
  assertEquals(h.calls,[]);
 }
});
import {auditLegacyDevPayments} from './checkoutReservation.ts';
Deno.test('legacy cancellation maintenance is forbidden outside dev test mode',async()=>{
 const keys=['SUPABASE_URL','STRIPE_SECRET_KEY','CHECKOUT_RESERVATIONS_ENABLED'];
 const original=keys.map(k=>Deno.env.get(k));
 try {
  Deno.env.set('SUPABASE_URL','https://gvfptmjluxpngfjendbi.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');Deno.env.set('CHECKOUT_RESERVATIONS_ENABLED','false');
  await assertRejects(()=>auditLegacyDevPayments({}));
  Deno.env.set('SUPABASE_URL','https://rodvvmfzkyjsqbufkjbc.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_live_fixture');
  await assertRejects(()=>auditLegacyDevPayments({}));
  Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');Deno.env.set('CHECKOUT_RESERVATIONS_ENABLED','true');
  await assertRejects(()=>auditLegacyDevPayments({}));
 } finally {keys.forEach((k,i)=>original[i]===undefined?Deno.env.delete(k):Deno.env.set(k,original[i]!));}
});
