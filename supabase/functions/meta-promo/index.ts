import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import {
  META_PROMO_CONSENT_TEXT,
  META_PROMO_CONSENT_VERSION,
  META_PROMO_ENDS_AT,
  metaPromoEnabled,
  recordPromoVisit,
} from "../_shared/metaPromo.ts";
import { ReservationError } from "../_shared/checkoutReservation.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const json = (body: any, status = 200) =>
  Response.json(body, { status, headers: cors });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!metaPromoEnabled()) {
    return json(
      { error: "Offer is unavailable.", code: "promo_unavailable" },
      409,
    );
  }
  try {
    if (Number(req.headers.get("content-length")) > 12000) {
      return json({ error: "Invalid request" }, 400);
    }
    const raw = await req.text();
    if (raw.length > 12000) return json({ error: "Invalid request" }, 400);
    const body = JSON.parse(raw);
    if (!body || !["visit", "claim"].includes(body.action)) {
      return json({ error: "Invalid action" }, 400);
    }
    if (
      body.visitor_token !== undefined &&
      !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
        body.visitor_token,
      )
    ) return json({ error: "Invalid visitor" }, 400);
    // Hash the network address with a private key: no raw IPs are persisted.
    const ip = req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `${Deno.env.get("META_PROMO_ENTRY_SECRET")}:${ip}`,
      ),
    );
    const bucket = Array.from(new Uint8Array(digest)).map((x) =>
      x.toString(16).padStart(2, "0")
    ).join("");
    const limit = await db.rpc("rate_limit_meta_promo", {
      p_bucket: bucket,
      p_action: body.action,
    });
    if (limit.error || limit.data !== true) {
      return json({ error: "Please try again later." }, 429);
    }
    const visit = await recordPromoVisit(db, body);
    if (body.action === "visit") {
      return json({
        ...visit,
        ends_at: META_PROMO_ENDS_AT,
        discount_percent: 10,
      });
    }
    if (!visit.eligible || visit.blocked || body.attribution_checked !== true) {
      return json(
        { error: "Offer is unavailable.", code: "promo_unavailable" },
        409,
      );
    }
    const email = typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
    if (
      !body.visitor_token || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof body.marketing_consent !== "boolean"
    ) return json({ error: "Enter a valid email and consent choice." }, 400);
    const { data, error } = await db.rpc("claim_meta_promo", {
      p_visitor_token: body.visitor_token,
      p_email: email,
      p_marketing_consent: body.marketing_consent,
      p_consent_text: META_PROMO_CONSENT_TEXT,
      p_consent_version: META_PROMO_CONSENT_VERSION,
    });
    if (error || !data?.code) {
      return json(
        { error: "Offer is unavailable.", code: "promo_unavailable" },
        409,
      );
    }
    // DEV is preview only: never call a mail transport or claim an email was sent.
    return json({ ...data, email_delivery: "preview" });
  } catch (error) {
    if (error instanceof ReservationError) {
      return json(
        { error: "Offer is unavailable.", code: error.code },
        error.status,
      );
    }
    if (error instanceof SyntaxError) {
      return json({ error: "Invalid request" }, 400);
    }
    console.error("META_PROMO_REQUEST_FAILED");
    return json(
      { error: "Offer is unavailable.", code: "promo_unavailable" },
      409,
    );
  }
});
