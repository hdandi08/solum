import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import {
  auditLegacyDevPayments,
  reconcileReservation,
} from "../_shared/checkoutReservation.ts";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
Deno.serve(async (req) => {
  const secret = Deno.env.get("CHECKOUT_RESERVATION_WORKER_SECRET");
  if (
    req.method !== "POST" || !secret ||
    req.headers.get("authorization") !== `Bearer ${secret}`
  ) return new Response("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "audit_legacy_dev") {
    try {
      return Response.json({
        resources: await auditLegacyDevPayments(
          stripe,
          Array.isArray(body.cancel_ids) ? body.cancel_ids : [],
        ),
      });
    } catch {
      return Response.json({ error: "legacy_audit_failed" }, { status: 409 });
    }
  }
  const { data, error } = await db.from("checkout_reservations").select(
    "resource_id,resource_kind,expires_at",
  ).eq("state", "held").lte("expires_at", new Date().toISOString()).order(
    "updated_at",
  ).limit(50);
  if (error) {
    return Response.json({ error: "reservation_scan_failed" }, { status: 503 });
  }
  let released = 0, consumed = 0, held = 0, failed = 0;
  for (const row of data ?? []) {
    try {
      const outcome = await reconcileReservation(db, stripe, row);
      if (outcome === "released") released++;
      else if (outcome === "consumed") consumed++;
      else held++;
    } catch {
      failed++;
      console.error("RESERVATION_RECONCILIATION_FAILED", {
        resource_id: row.resource_id,
      });
    }
    // Rotate uncertain/processing rows so a full batch cannot starve later holds.
    const touch = await db.from("checkout_reservations").update({
      updated_at: new Date().toISOString(),
    }).eq("resource_id", row.resource_id).eq("state", "held");
    if (touch.error) failed++;
  }
  return Response.json({ released, consumed, held, failed }, {
    status: failed ? 503 : 200,
  });
});
