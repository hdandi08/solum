import {
  canonicalKitItems,
  type KitSelection,
  multiKitCheckoutEnabled,
} from "./multiKitOrder.ts";
import { ReservationError } from "./checkoutReservation.ts";
export const META_PROMO_CAMPAIGN = "black-friday-2026";
export const META_PROMO_ENDS_AT = "2026-12-01T00:00:00Z";
export const META_PROMO_CONSENT_TEXT = "Send me SOLUM news and offers";
export const META_PROMO_CONSENT_VERSION = "black-friday-2026-v1";
const getEnv = (key: string) => Deno.env.get(key);
export function metaPromoEnvironmentAllowed(env = getEnv) {
  return env("SUPABASE_URL") === "https://rodvvmfzkyjsqbufkjbc.supabase.co" &&
    !!env("STRIPE_SECRET_KEY")?.startsWith("sk_test_");
}
export function metaPromoEnabled(env = getEnv): boolean {
  return metaPromoEnvironmentAllowed(env) && multiKitCheckoutEnabled(env) &&
    env("META_PROMO_ENABLED") === "true" && !!env("META_PROMO_ENTRY_SECRET");
}
export async function signMetaPromoEntry(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(
          `${META_PROMO_CAMPAIGN}:${META_PROMO_ENDS_AT}`,
        ),
      ),
    ),
  ).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function verifyEntry(entry: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/.test(entry)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(entry.match(/../g)!, (x) => parseInt(x, 16)),
    new TextEncoder().encode(`${META_PROMO_CAMPAIGN}:${META_PROMO_ENDS_AT}`),
  );
}
// Extension list: add known partner names/keys here as channels are introduced.
// Any AWIN token (even malformed/expired) is attribution evidence and fails closed.
const AFFILIATE_KEYS =
  /^(awc|awinaffid|awinmid|affiliate|affiliate_id|aff_id|affid|partner|partner_id|partnerid|referral|referral_id|ref|clickref|irclickid|irgwc|ranmid|raneaid|rancid|sscid|cjevent|cjdata)$/i;
const AFFILIATE_CHANNEL =
  /^(aw|awin|affiliate|affiliates|affiliate_marketing|partner|partners|partnership|referral|impact|impactradius|rakuten|cj|commissionjunction|shareasale|webgains|tradedoubler)$/i;
export function promoAffiliateEvidence(body: any): boolean {
  if (body?.awin_attribution_token) return true;
  const records = [body, body?.attribution, body?.campaign_attribution];
  const urlEntries: [string, string][] = [];
  try {
    if (typeof body?.landing_url === "string") {
      urlEntries.push(...new URL(body.landing_url).searchParams);
    }
  } catch { /* Admission itself rejects malformed URLs. */ }
  const entries = [
    ...records.flatMap((record) =>
      record && typeof record === "object" ? Object.entries(record) : []
    ),
    ...urlEntries,
  ];
  return entries.some(([key, value]) =>
    value !== null && value !== undefined && String(value).trim() !== "" &&
    ((AFFILIATE_KEYS.test(key)) ||
      (/^(utm_source|utm_medium|source|medium|channel|awin_channel)$/i.test(
        key,
      ) && AFFILIATE_CHANNEL.test(String(value).trim())))
  );
}
export async function metaPromoAdmission(
  body: any,
  secret: string,
  now = Date.now,
): Promise<{ eligible: boolean; blocked: boolean }> {
  if (promoAffiliateEvidence(body)) return { eligible: false, blocked: true };
  if (
    body?.attribution_checked !== true ||
    now() >= Date.parse(META_PROMO_ENDS_AT)
  ) return { eligible: false, blocked: false };
  try {
    const url = new URL(body.landing_url);
    // Reject ambiguous source/entry parameter pollution rather than choosing one.
    if (
      ["offer_entry", "utm_source", "utm_medium"].some((key) =>
        url.searchParams.getAll(key).length !== 1
      )
    ) return { eligible: false, blocked: false };
    const source = url.searchParams.get("utm_source")?.toLowerCase();
    const medium = url.searchParams.get("utm_medium")?.toLowerCase();
    return {
      eligible:
        ["meta", "facebook", "instagram", "fb", "ig"].includes(source ?? "") &&
        ["paid_social", "paidsocial", "cpc", "paid"].includes(medium ?? "") &&
        await verifyEntry(url.searchParams.get("offer_entry") ?? "", secret),
      blocked: false,
    };
  } catch {
    return { eligible: false, blocked: false };
  }
}
export function discountedKitSelection(selection: KitSelection) {
  const items = selection.items.map((item) => ({
    ...item,
    unit_amount_pence: item.unit_amount_pence * 9 / 10,
    line_amount_pence: item.line_amount_pence * 9 / 10,
  }));
  return {
    ...selection,
    items,
    subtotal_pence: selection.amount_pence,
    discount_pence: selection.amount_pence / 10,
    amount_pence: selection.amount_pence * 9 / 10,
  };
}
export function promoResponse(attempt: any) {
  return {
    code: attempt.promo_code,
    discount_percent: 10,
    subtotal_pence: attempt.subtotal_pence,
    discount_pence: attempt.discount_pence,
  };
}
export async function recordPromoVisit(db: any, body: any, env = getEnv) {
  const admission = await metaPromoAdmission(
    body,
    env("META_PROMO_ENTRY_SECRET") ?? "",
  );
  const { data, error } = await db.rpc("record_meta_promo_visit", {
    p_visitor_token: body.visitor_token ?? body.promo_visitor_token ?? null,
    p_eligible: admission.eligible,
    p_blocked: admission.blocked,
    p_checked: body.attribution_checked === true,
  });
  if (error || !data?.visitor_token) {
    throw new ReservationError("promo_unavailable", 409);
  }
  return data;
}
export async function validatePromoPayment(
  db: any,
  body: any,
  env = getEnv,
): Promise<void> {
  if (
    !metaPromoEnabled(env) || typeof body.promo_code !== "string" ||
    typeof body.promo_visitor_token !== "string"
  ) throw new ReservationError("promo_unavailable", 409);
  // Do not admit new visitors during payment: only a previously eligible ledger
  // entry may redeem. Record every newly observed affiliate signal first.
  const { data, error } = await db.rpc("record_meta_promo_visit", {
    p_visitor_token: body.promo_visitor_token,
    p_eligible: false,
    p_blocked: promoAffiliateEvidence(body),
    p_checked: body.attribution_checked === true,
  });
  if (
    error || !data?.eligible || data.blocked ||
    body.attribution_checked !== true || promoAffiliateEvidence(body)
  ) throw new ReservationError("promo_unavailable", 409);
}
export async function preparePromoAttempt(
  db: any,
  body: any,
  selection: KitSelection,
  customer: string,
): Promise<any> {
  if (
    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
      body.reservation_request_id ?? "",
    )
  ) throw new ReservationError("promo_unavailable", 409);
  const { data, error } = await db.rpc("prepare_meta_promo_attempt", {
    p_request_key: `multi-${body.reservation_request_id}`,
    p_items: selection.items,
    p_stripe_customer_id: customer,
    p_code: body.promo_code,
    p_visitor_token: body.promo_visitor_token,
    p_email: typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "",
  });
  if (error || !data?.id || !data.stripe_customer_id || !data.promo_claim_id) {
    throw new ReservationError("promo_unavailable", 409);
  }
  const expected = discountedKitSelection(
    canonicalKitItems(
      selection.items.map((item) => ({
        kit_id: item.kit_id,
        quantity: item.quantity,
      })),
    ),
  );
  const returned = (data.items ?? []).map((item: any) => ({
    kit_id: item.kit_id,
    quantity: item.quantity,
    unit_amount_pence: item.unit_amount_pence,
    line_amount_pence: item.line_amount_pence,
  }));
  if (
    JSON.stringify(returned) !== JSON.stringify(expected.items) ||
    data.amount_pence !== expected.amount_pence ||
    data.total_quantity !== expected.total_quantity ||
    data.subtotal_pence !== expected.subtotal_pence ||
    data.discount_pence !== expected.discount_pence ||
    data.promo_code !== body.promo_code ||
    !Number.isFinite(Date.parse(data.created_at)) ||
    Date.now() - Date.parse(data.created_at) > 86400000
  ) throw new ReservationError("promo_unavailable", 409);
  return data;
}
export function verifyPromoPaidEmail(attempt: any, email: string) {
  if (
    attempt.promo_claim_id &&
    (!metaPromoEnvironmentAllowed() || email !== attempt.promo_email)
  ) throw Error("promo_payment_email_mismatch");
}
export function promoEmailFinancials(
  promo?: { subtotal_pence: number; discount_pence: number } | null,
) {
  return promo
    ? `Original subtotal: £${
      (promo.subtotal_pence / 100).toFixed(2)
    }<br>Black Friday saving (10%): £${
      (promo.discount_pence / 100).toFixed(2)
    }<br>`
    : "";
}
