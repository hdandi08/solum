import { ReservationError } from "./checkoutReservation.ts";

export type KitItem = {
  kit_id: string;
  quantity: number;
  unit_amount_pence: number;
  line_amount_pence: number;
};
export type KitSelection = {
  items: KitItem[];
  total_quantity: number;
  amount_pence: number;
};
const PRICES: Record<string, number> = { ground: 6500, ritual: 8500 };
const DEV_URL = "https://rodvvmfzkyjsqbufkjbc.supabase.co";
const PROD_URL = "https://gvfptmjluxpngfjendbi.supabase.co";

// Only browser quantities are accepted. Prices are always constructed here.
export function canonicalKitItems(input: unknown): KitSelection {
  if (!Array.isArray(input) || !input.length || input.length > 5) {
    throw new ReservationError("invalid_items", 400);
  }
  const quantities: Record<string, number> = {};
  for (const item of input) {
    if (
      !item || typeof item !== "object" || Array.isArray(item) ||
      Object.keys(item).some((key) => !["kit_id", "quantity"].includes(key)) ||
      typeof item.kit_id !== "string" || !Object.hasOwn(PRICES, item.kit_id) ||
      !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
      item.quantity > 5
    ) {
      throw new ReservationError("invalid_items", 400);
    }
    quantities[item.kit_id] = (quantities[item.kit_id] ?? 0) + item.quantity;
  }
  const items = Object.keys(quantities).sort().map((kit_id) => ({
    kit_id,
    quantity: quantities[kit_id],
    unit_amount_pence: PRICES[kit_id],
    line_amount_pence: PRICES[kit_id] * quantities[kit_id],
  }));
  const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  if (total_quantity > 5) throw new ReservationError("invalid_items", 400);
  return {
    items,
    total_quantity,
    amount_pence: items.reduce((sum, item) => sum + item.line_amount_pence, 0),
  };
}

export function multiKitEnvironmentAllowed(
  env: (key: string) => string | undefined = (key) => Deno.env.get(key),
) {
  return (env("SUPABASE_URL") === DEV_URL && !!env("STRIPE_SECRET_KEY")?.startsWith("sk_test_"))
    || (env("SUPABASE_URL") === PROD_URL && !!env("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
}
export function multiKitPaymentModeAllowed(livemode: unknown) {
  return multiKitEnvironmentAllowed() && livemode === (Deno.env.get('SUPABASE_URL') === PROD_URL);
}
export function multiKitCheckoutEnabled(
  env: (key: string) => string | undefined = (key) => Deno.env.get(key),
) {
  return multiKitEnvironmentAllowed(env) &&
    env("CHECKOUT_RESERVATIONS_ENABLED") === "true" &&
    env("MULTI_KIT_CHECKOUT_ENABLED") === "true";
}

export function multiKitSummary(items: KitItem[]) {
  return items.map((item) => `${item.quantity} × ${item.kit_id.toUpperCase()}`)
    .join(" + ");
}
export function multiKitEmailLines(items: KitItem[]) {
  return items.map((item) =>
    `${item.quantity} × ${item.kit_id.toUpperCase()} — £${
      (item.line_amount_pence / 100).toFixed(2)
    }`
  ).join("<br>");
}

export async function prepareMultiKitAttempt(
  db: any,
  body: any,
  selection: KitSelection,
  customerId: string,
) {
  const requestId =
    /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
        body.reservation_request_id ?? "",
      )
      ? body.reservation_request_id
      : crypto.randomUUID();
  // The key deliberately excludes quantities: reusing it with edited items must
  // fail the database's immutable binding instead of creating another hold.
  const { data, error } = await db.rpc("prepare_multi_kit_attempt", {
    p_request_key: `multi-${requestId}`,
    p_items: selection.items,
    p_stripe_customer_id: customerId,
  });
  if (error || !data?.id || !data.stripe_customer_id) {
    throw new ReservationError("inventory_unavailable", 503);
  }
  if (
    !Number.isFinite(Date.parse(data.created_at)) ||
    Date.now() - Date.parse(data.created_at) > 86400000
  ) throw new ReservationError("reservation_expired", 409);
  if (JSON.stringify(data.items) !== JSON.stringify(selection.items)) {
    // Compare objects by values below: jsonb may return keys in a different order.
    const canonical = canonicalKitItems(
      data.items?.map((item: any) => ({
        kit_id: item.kit_id,
        quantity: item.quantity,
      })),
    );
    if (JSON.stringify(canonical.items) !== JSON.stringify(selection.items)) {
      throw new ReservationError("invalid_items", 409);
    }
  }
  if (
    data.total_quantity !== selection.total_quantity ||
    data.amount_pence !== selection.amount_pence
  ) throw new ReservationError("invalid_items", 409);
  return data;
}

async function cancelAndReleaseUnexposed(db: any, stripe: any, id: string, attempt?: any): Promise<boolean> {
  try {
    const cancelled = await stripe.paymentIntents.cancel(id);
    if (cancelled.status !== "canceled") return false;
    if (attempt?.promo_claim_id) {
      const released = await db.rpc('release_meta_promo_payment', {p_attempt_id:attempt.id,p_resource_id:id});
      return !released.error;
    }
    await db.rpc("settle_checkout_reservation", {p_resource_id:id,p_outcome:"released"});
    return true;
  } catch {
    // An unknown cancellation or release keeps the original key pinned.
    return false;
  }
}
export async function createMultiKitPayment(
  db: any,
  stripe: any,
  attempt: any,
  params: any,
) {
  if (attempt.promo_claim_id && (Deno.env.get('SUPABASE_URL') !== DEV_URL || !Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_') || Date.now() >= Date.parse('2026-12-01T00:00:00Z'))) {
    throw new ReservationError('promo_unavailable',409);
  }
  let intentParams: any = {
    ...params,
    amount: attempt.amount_pence,
    currency: "gbp",
    customer: attempt.stripe_customer_id,
    metadata: {
      ...params.metadata,
      checkout_flow: "multi_kit_v1",
      multi_kit_attempt_id: attempt.id,
      stock_reservation: "v1",
    },
  };
  if (attempt.promo_claim_id) {
    const frozen = await db.rpc('freeze_meta_promo_payment_params', {p_attempt_id:attempt.id,p_params:intentParams});
    const original = frozen.data;
    if (frozen.error || !original || original.amount !== attempt.amount_pence || original.currency !== 'gbp' || original.customer !== attempt.stripe_customer_id || original.metadata?.multi_kit_attempt_id !== attempt.id || original.metadata?.checkout_flow !== 'multi_kit_v1' || original.metadata?.email !== attempt.promo_email) {
      throw new ReservationError('inventory_unavailable',503);
    }
    intentParams = original;
  }
  let pi = await stripe.paymentIntents.create(intentParams, {idempotencyKey:`multi-kit/${attempt.id}`});
  if(attempt.promo_claim_id) {
    const bound=await db.rpc('bind_meta_promo_payment',{p_attempt_id:attempt.id,p_resource_id:pi.id});
    if(bound.error) throw new ReservationError('promo_unavailable',409);
  }
  try {
    pi = await stripe.paymentIntents.retrieve(pi.id);
  } catch {
    await cancelAndReleaseUnexposed(db, stripe, pi.id, attempt);
    throw new ReservationError("inventory_unavailable", 503);
  }
  if (pi.status === "succeeded") {
    throw new ReservationError("payment_completed", 409);
  }
  if (["processing", "requires_capture"].includes(pi.status)) {
    throw new ReservationError("payment_processing", 409);
  }
  if (pi.status === "canceled") {
    if(attempt.promo_claim_id) {
      let released;
      try { released=await db.rpc('release_meta_promo_payment',{p_attempt_id:attempt.id,p_resource_id:pi.id}); } catch { throw new ReservationError('inventory_unavailable',503); }
      if(released.error) throw new ReservationError('inventory_unavailable',503);
    }
    await db.rpc("settle_checkout_reservation", {
      p_resource_id: pi.id,
      p_outcome: "released",
    });
    throw new ReservationError("reservation_expired", 409);
  }
  if (
    pi.customer !== attempt.stripe_customer_id ||
    pi.amount !== attempt.amount_pence || pi.currency !== "gbp" ||
    !multiKitPaymentModeAllowed(pi.livemode)
  ) {
    await cancelAndReleaseUnexposed(db, stripe, pi.id, attempt);
    throw new ReservationError("inventory_unavailable", 503);
  }
  let result;
  try {
    result = await db.rpc("reserve_multi_kit_stock", {
      p_attempt_id: attempt.id,
      p_resource_id: pi.id,
    });
  } catch {
    result = { error: true };
  }
  const reservation = result?.data;
  if (
    result?.error || !reservation ||
    !["held", "sold_out", "released", "consumed"].includes(reservation.state)
  ) {
    await cancelAndReleaseUnexposed(db, stripe, pi.id, attempt);
    throw new ReservationError("inventory_unavailable", 503);
  }
  if (
    reservation.state !== "held" ||
    !Number.isFinite(Date.parse(reservation.expires_at)) ||
    Date.parse(reservation.expires_at) <= Date.now()
  ) {
    const retired = await cancelAndReleaseUnexposed(db, stripe, pi.id, attempt);
    const unknownRetirement = attempt.promo_claim_id && !retired;
    const error = new ReservationError(
      unknownRetirement ? "inventory_unavailable" : reservation.state === "sold_out" ? "sold_out" : "reservation_expired",
      unknownRetirement ? 503 : 409,
    );
    Object.assign(error, {
      kit_id: reservation.kit_id,
      available_count: reservation.available_count,
    });
    throw error;
  }
  return { ...pi, reservation_expires_at: reservation.expires_at };
}

export function verifyMultiKitPayment(pi: any, attempt: any) {
  if (
    !attempt || pi.metadata?.multi_kit_attempt_id !== attempt.id ||
    pi.id !== attempt.stripe_payment_id ||
    pi.customer !== attempt.stripe_customer_id || pi.status !== "succeeded" ||
    pi.currency !== "gbp" || pi.amount !== attempt.amount_pence ||
    pi.amount_received !== attempt.amount_pence
  ) throw Error("multi_kit_payment_mismatch");
}
export function verifiedMultiKitShipping(pi: any) {
  const sh = pi.shipping, address = sh?.address;
  if (
    !sh?.name?.trim() || address?.country !== "GB" || !address.line1?.trim() ||
    !address.city?.trim() || !address.postal_code?.trim()
  ) throw Error("multi_kit_shipping_required");
  return {
    name: sh.name.trim(),
    line1: address.line1.trim(),
    line2: address.line2 || null,
    city: address.city.trim(),
    postcode: address.postal_code.trim(),
    country: "GB",
    phone: sh.phone || pi.metadata?.phone || null,
  };
}
