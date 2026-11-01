// Stripe secrets/URLs are exposed only after an atomic stock hold succeeds.
// The worker, not a browser clock, decides when stock is safe to return.
export const reservationsEnabled = () =>
  Deno.env.get("CHECKOUT_RESERVATIONS_ENABLED") === "true";
export class ReservationError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

async function cancelUnexposed(stripe: any, id: string, kind: string) {
  try {
    if (kind === "payment_intent") await stripe.paymentIntents.cancel(id);
    else await stripe.checkout.sessions.expire(id);
  } catch {
    /* Unknown outcome: any bound hold is left for durable reconciliation. */
  }
}

export async function reservePayment(
  db: any,
  stripe: any,
  id: string,
  kind: string,
  kit: string,
  enabled = reservationsEnabled(),
) {
  if (!enabled) return {};
  const current = kind === "payment_intent"
    ? await stripe.paymentIntents.retrieve(id)
    : await stripe.checkout.sessions.retrieve(id);
  if ((kind === "payment_intent" && current.status === "succeeded") || (kind === "checkout_session" && current.payment_status === "paid")) return {error:"payment_completed",status:409};
  if (kind === "payment_intent" && ["processing","requires_capture"].includes(current.status)) return {error:"payment_processing",status:409};
  const terminal = kind === "payment_intent"
    ? current.status === "canceled"
    : current.status === "expired";
  if (terminal) {
    // A prior ambiguous RPC may have committed before cancellation. Retry the
    // idempotent settlement even when the original caller never saw its row.
    await db.rpc("settle_checkout_reservation", {
      p_resource_id: id,
      p_outcome: "released",
    });
    return { error: "reservation_expired", status: 409 };
  }
  let data, error;
  try {
    ({ data, error } = await db.rpc("reserve_checkout_stock", {
      p_kit_id: kit,
      p_resource_id: id,
      p_resource_kind: kind,
    }));
  } catch {
    error = true;
  }
  if (
    error || !data ||
    !["held", "sold_out", "released", "consumed"].includes(data.state)
  ) {
    await cancelUnexposed(stripe, id, kind);
    return { error: "inventory_unavailable", status: 503 };
  }
  if (
    data.state !== "held" || !Number.isFinite(Date.parse(data.expires_at)) ||
    Date.parse(data.expires_at) <= Date.now()
  ) {
    await cancelUnexposed(stripe, id, kind);
    return {
      error: data.state === "sold_out" ? "sold_out" : "reservation_expired",
      status: 409,
    };
  }
  return { reservation_expires_at: data.expires_at };
}

export async function prepareCheckoutAttempt(db: any, kind: string, body: any) {
  if (!reservationsEnabled()) {
    return {
      key: null,
      created_at: new Date().toISOString(),
      customer_id: null,
    };
  }
  const attempt = /^[a-f\d-]{36}$/i.test(body.reservation_request_id ?? "")
    ? body.reservation_request_id
    : crypto.randomUUID();
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify({ kind, body, attempt })),
  );
  const key = `stock-${
    Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0"))
      .join("")
  }`;
  const { data, error } = await db.rpc("prepare_checkout_attempt", {
    p_key: key,
  });
  if (error || !data) throw new ReservationError("inventory_unavailable", 503);
  if (Date.now() - Date.parse(data.created_at) > 24 * 60 * 60 * 1000) {
    throw new ReservationError("reservation_expired", 409);
  }
  return { ...data, key };
}
export async function bindCheckoutCustomer(
  db: any,
  attempt: any,
  candidate: string,
) {
  if (!attempt.key) return candidate;
  const { data, error } = await db.rpc("prepare_checkout_attempt", {
    p_key: attempt.key,
    p_customer_id: candidate,
  });
  if (error || !data?.customer_id) {
    throw new ReservationError("inventory_unavailable", 503);
  }
  return data.customer_id;
}
export function checkoutAttemptTime(attempt: any) {
  return new Date(
    new Date(attempt.created_at).toLocaleString("en-US", {
      timeZone: "Europe/London",
    }),
  );
}
export async function createReservedPayment(
  db: any,
  stripe: any,
  kind: string,
  kit: string,
  attempt: any,
  params: any,
) {
  const enabled = reservationsEnabled();
  const options = enabled ? [{ idempotencyKey: attempt.key }] : [];
  if (enabled) {
    params.metadata = { ...params.metadata, stock_reservation: "v1" };
    if (kind === "checkout_session") {
      params.payment_intent_data = {
        ...params.payment_intent_data,
        metadata: {
          ...params.payment_intent_data?.metadata,
          checkout_flow: "hosted",
        },
      };
    }
  }
  let resource = kind === "payment_intent"
    ? await stripe.paymentIntents.create(params, ...options)
    : await stripe.checkout.sessions.create(params, ...options);
  if (enabled) {
    resource = kind === "payment_intent"
      ? await stripe.paymentIntents.retrieve(resource.id)
      : await stripe.checkout.sessions.retrieve(resource.id);
  }
  const reservation = await reservePayment(
    db,
    stripe,
    resource.id,
    kind,
    kit,
    enabled,
  );
  if (reservation.error) {
    throw new ReservationError(reservation.error, reservation.status!);
  }
  return { ...resource, ...reservation };
}

export async function reconcileReservation(
  db: any,
  stripe: any,
  row: any,
  now = Date.now(),
) {
  const expiry = Date.parse(row.expires_at);
  if (!Number.isFinite(expiry) || now < expiry) return "held";
  let outcome: "released" | "consumed" | undefined;
  if (row.resource_kind === "payment_intent") {
    let pi = await stripe.paymentIntents.retrieve(row.resource_id);
    if (pi.status === "succeeded") outcome = "consumed";
    else if (pi.status === "canceled") outcome = "released";
    else if (
      ["requires_payment_method", "requires_confirmation"].includes(
        pi.status,
      ) || (pi.status === "requires_action" && now >= expiry + 300000)
    ) {
      pi = await stripe.paymentIntents.cancel(row.resource_id, {
        cancellation_reason: "abandoned",
      });
      if (pi.status === "canceled") outcome = "released";
      else if (pi.status === "succeeded") outcome = "consumed";
    }
  } else if (row.resource_kind === "checkout_session") {
    let session = await stripe.checkout.sessions.retrieve(row.resource_id);
    if (session.status === "open") {
      session = await stripe.checkout.sessions.expire(row.resource_id);
    }
    if (session.payment_status === "paid") outcome = "consumed";
    else if (session.status === "expired") outcome = "released";
    // A completed unpaid session may be processing an asynchronous payment.
  } else throw Error("unknown_reservation_kind");
  if (!outcome) return "held";
  const { error } = await db.rpc("settle_checkout_reservation", {
    p_resource_id: row.resource_id,
    p_outcome: outcome,
  });
  if (error) throw Error("reservation_settlement_failed");
  return outcome;
}

export async function releaseOwnedReservation(
  db: any,
  stripe: any,
  clientSecret: string,
) {
  if (
    typeof clientSecret !== "string" ||
    !/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(clientSecret)
  ) throw new ReservationError("invalid_reservation", 400);
  const id = clientSecret.split("_secret_")[0];
  let pi = await stripe.paymentIntents.retrieve(id);
  if (pi.client_secret !== clientSecret) {
    throw new ReservationError("invalid_reservation", 403);
  }
  if (pi.status === "succeeded") {
    throw new ReservationError("payment_completed", 409);
  }
  if (["processing", "requires_capture"].includes(pi.status)) {
    throw new ReservationError("payment_processing", 409);
  }
  if (pi.status !== "canceled") {
    pi = await stripe.paymentIntents.cancel(id, {
      cancellation_reason: "requested_by_customer",
    });
  }
  if (pi.status !== "canceled") {
    throw new ReservationError("payment_processing", 409);
  }
  const { error } = await db.rpc("settle_checkout_reservation", {
    p_resource_id: id,
    p_outcome: "released",
  });
  if (error) throw new ReservationError("inventory_unavailable", 503);
  return { released: true };
}

// Dev rollout only: identify legacy unpaid test resources before enabling holds.
// No production caller can invoke this path, and cancellation requires explicit IDs.
export async function auditLegacyDevPayments(
  stripe: any,
  cancelIds: string[] = [],
) {
  if (
    !Deno.env.get("SUPABASE_URL")?.includes("rodvvmfzkyjsqbufkjbc") ||
    !Deno.env.get("STRIPE_SECRET_KEY")?.startsWith("sk_test_") ||
    reservationsEnabled()
  ) throw Error("legacy_audit_not_allowed");
  const found: any[] = [];
  for (const kind of ["payment_intent", "checkout_session"]) {
    let after: string | undefined;
    for (let page = 0; page < 20; page++) {
      const list = kind === "payment_intent"
        ? await stripe.paymentIntents.list({
          limit: 100,
          ...(after ? { starting_after: after } : {}),
        })
        : await stripe.checkout.sessions.list({
          limit: 100,
          ...(after ? { starting_after: after } : {}),
        });
      for (const item of list.data) {
        if (
          item.livemode ||
          !["ground", "ritual"].includes(item.metadata?.kit_id) ||
          item.metadata?.stock_reservation === "v1"
        ) continue;
        if (
          kind === "payment_intent" && !item.description?.startsWith("SOLUM")
        ) continue;
        if (
          kind === "payment_intent"
            ? ["succeeded", "canceled"].includes(item.status)
            : ["expired"].includes(item.status) ||
              item.payment_status === "paid"
        ) continue;
        const candidate = {
          id: item.id,
          kind,
          status: item.status,
          canceled: false,
        };
        if (cancelIds.includes(item.id)) {
          try {
            if (
              kind === "payment_intent" &&
              [
                "requires_payment_method",
                "requires_confirmation",
                "requires_action",
              ].includes(item.status)
            ) {
              const result = await stripe.paymentIntents.cancel(item.id, {
                cancellation_reason: "abandoned",
              });
              candidate.canceled = result.status === "canceled";
            } else if (kind === "checkout_session" && item.status === "open") {
              const result = await stripe.checkout.sessions.expire(item.id);
              candidate.canceled = result.status === "expired";
            }
          } catch { /* return unresolved candidate; activation must stop */ }
        }
        found.push(candidate);
      }
      if (!list.has_more) break;
      if (page === 19) throw Error("legacy_audit_truncated");
      after = list.data.at(-1).id;
    }
  }
  return found;
}

export function reservationErrorBody(code: string) {
 const messages:Record<string,string>={sold_out:'This kit is currently sold out.',reservation_expired:'Your reservation has ended. Please continue again to check availability.',inventory_unavailable:'We could not check stock just now. Please try again shortly.',payment_completed:'This payment has already completed. Please check your order confirmation.',payment_processing:'Your payment is still processing. Please wait before trying again.'};
 return {error:code,message:messages[code]??'We could not update your reservation. Please try again.'};
}
