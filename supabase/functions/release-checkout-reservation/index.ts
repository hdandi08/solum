import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import {
  releaseOwnedReservation,
  ReservationError,
} from "../_shared/checkoutReservation.ts";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }
  try {
    const { client_secret } = await req.json();
    const id = typeof client_secret === "string"
      ? client_secret.split("_secret_")[0]
      : "";
    const { data, error } = await db.from("checkout_reservations").select(
      "resource_id",
    ).eq("resource_id", id).maybeSingle();
    if (error || !data) {
      throw new ReservationError("inventory_unavailable", 503);
    }
    return Response.json(
      await releaseOwnedReservation(db, stripe, client_secret),
      { headers },
    );
  } catch (error) {
    return Response.json({
      error: error instanceof ReservationError
        ? error.code
        : "inventory_unavailable",
    }, {
      status: error instanceof ReservationError ? error.status : 503,
      headers,
    });
  }
});
