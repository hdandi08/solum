// One recurring subscription per paid first-box PaymentIntent, across retries and
// both webhook routes. A durable mapping outlives Stripe's 24-hour retry window.
export async function ensureCheckoutSubscription(
  db: any,
  stripe: any,
  pi: any,
  metadata: any,
): Promise<string> {
  const { data, error } = await db.from("checkout_subscription_links").select(
    "subscription_id",
  ).eq("payment_id", pi.id).maybeSingle();
  if (error) throw Error("subscription_mapping_unavailable");
  if (data) return data.subscription_id;
  let subscription;
  // Historical retries must recover an existing Stripe subscription, never
  // blindly create another after Stripe may have discarded its idempotency key.
  if (Date.now() / 1000 - pi.created > 23 * 3600) {
    const list = await stripe.subscriptions.list({
      customer: pi.customer,
      status: "all",
      limit: 100,
    });
    subscription = list.data.find((item: any) =>
      item.metadata?.checkout_payment_id === pi.id
    );
    if (!subscription) {
      throw Error("historical_subscription_requires_reconciliation");
    }
  } else {
    const price = await stripe.prices.create({
      currency: "gbp",
      unit_amount: parseInt(metadata.monthly_pence ?? "4800"),
      recurring: { interval: "month" },
      product_data: {
        name: `SOLUM ${(metadata.kit_id ?? "").toUpperCase()} — Monthly Refill`,
      },
    }, { idempotencyKey: `checkout-refill-price/${pi.id}` });
    subscription = await stripe.subscriptions.create({
      customer: pi.customer,
      items: [{ price: price.id }],
      trial_end: metadata.first_charge_ts
        ? parseInt(metadata.first_charge_ts)
        : pi.created + 30 * 24 * 3600,
      default_payment_method: pi.payment_method,
      metadata: {
        kit_id: metadata.kit_id ?? "",
        birth_year: metadata.birth_year ?? "",
        birth_month: metadata.birth_month ?? "",
        checkout_payment_id: pi.id,
      },
    }, { idempotencyKey: `checkout-subscription/${pi.id}` });
  }
  const saved = await db.from("checkout_subscription_links").upsert({
    payment_id: pi.id,
    subscription_id: subscription.id,
  }, { onConflict: "payment_id" });
  if (saved.error) throw Error("subscription_mapping_save_failed");
  return subscription.id;
}
