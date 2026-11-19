import { paymentKitOrder } from './kitOrder.js';
// Keep only Stripe's returned result across the checkout's full-page navigation.
// Client secrets and buyer details are never stored in this confirmation record.
const RESULT_PREFIX = 'solum_payment_result_';
const ORDER_PREFIX = 'solum_payment_order_';
const MAX_AGE = 24 * 60 * 60 * 1000;
const claimed = new Set();

function browserStorage() {
  try { return globalThis.sessionStorage; } catch { return undefined; }
}

function paymentResult(intent, kitId, items) {
  if (!/^pi_[A-Za-z0-9]+$/.test(intent?.id ?? '') || !['ground', 'ritual', 'sovereign'].includes(kitId)) return { status: 'unverified' };
  if (intent.status === 'processing') return { status: 'processing' };
  if (['canceled', 'requires_payment_method'].includes(intent.status)) return { status: 'failed' };
  if (intent.status !== 'succeeded' || intent.currency !== 'gbp' || !Number.isSafeInteger(intent.amount) || intent.amount <= 0) return { status: 'unverified' };
  let order;
  if (items) {
    try { order = paymentKitOrder({ checkout_flow: 'multi_kit_v1', order_items: items, total_quantity: items.reduce((sum, item) => sum + item.quantity, 0), amount_pence: intent.amount }, items); } catch { return { status: 'unverified' }; }
  } else if (intent.metadata?.checkout_flow === 'multi_kit_v1') return { status: 'unverified' };
  if (order?.totalQuantity > 1) return { status: 'confirmed', purchase: { eventId: intent.id, value: intent.amount / 100, kitId: null, items: order.items, totalQuantity: order.totalQuantity, livemode: intent.livemode === true } };
  return { status: 'confirmed', purchase: { eventId: intent.id, value: intent.amount / 100, kitId, livemode: intent.livemode === true } };
}

function rememberedItems(reference, storage) {
  try {
    const saved = JSON.parse(storage?.getItem(`${ORDER_PREFIX}${reference}`) ?? 'null');
    const age = Date.now() - saved?.savedAt;
    return Number.isFinite(age) && age >= 0 && age <= MAX_AGE ? saved.items : undefined;
  } catch { return undefined; }
}

export function rememberPaymentOrder(clientSecret, items, storage = browserStorage()) {
  const reference = clientSecret?.split('_secret_')[0];
  if (!/^pi_[A-Za-z0-9]+$/.test(reference ?? '')) return;
  try { storage?.setItem(`${ORDER_PREFIX}${reference}`, JSON.stringify({ items, savedAt: Date.now() })); } catch { /* Redirect recovery may be unavailable; never infer quantities from a URL amount. */ }
}

export function rememberPaymentResult(intent, kitId, storage = browserStorage(), items = rememberedItems(intent?.id, storage)) {
  const result = paymentResult(intent, kitId, items);
  if (!['confirmed', 'processing'].includes(result.status)) return;
  const receipt = { intent: { id: intent.id, status: intent.status, amount: intent.amount, currency: intent.currency, livemode: intent.livemode }, kitId, ...(items ? { items } : {}), savedAt: Date.now() };
  try { storage?.setItem(`${RESULT_PREFIX}${intent.id}`, JSON.stringify(receipt)); } catch { /* Navigation state carries the same receipt when storage is blocked. */ }
  return receipt;
}

export async function resolvePurchaseConfirmation({ reference, clientSecret, kitId, stripe, inlineResult, storage = browserStorage() }) {
  if (!/^pi_[A-Za-z0-9]+$/.test(reference ?? '')) return { status: 'unverified' };
  if (clientSecret) {
    if (clientSecret.split('_secret_')[0] !== reference || !stripe) return { status: 'unverified' };
    try {
      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
      if (error || paymentIntent?.id !== reference) return { status: 'unverified' };
      const result = paymentResult(paymentIntent, kitId, rememberedItems(reference, storage));
      rememberPaymentResult(paymentIntent, kitId, storage);
      return result;
    } catch { return { status: 'unverified' }; }
  }
  try {
    const saved = inlineResult ?? JSON.parse(storage?.getItem(`${RESULT_PREFIX}${reference}`) ?? 'null');
    const age = Date.now() - saved?.savedAt;
    if (!saved || !Number.isFinite(age) || age < 0 || age > MAX_AGE || saved.intent?.id !== reference) return { status: 'unverified' };
    return paymentResult(saved.intent, saved.kitId, saved.items);
  } catch { return { status: 'unverified' }; }
}

export function claimPurchaseEvent(confirmation, storage = browserStorage()) {
  const id = confirmation?.purchase?.eventId;
  if (confirmation?.status !== 'confirmed' || !id || claimed.has(id)) return false;
  const key = `solum_purchase_fired_${id}`;
  try { if (storage?.getItem(key)) return false; } catch { /* Use the in-memory guard. */ }
  claimed.add(id);
  try { storage?.setItem(key, '1'); } catch { /* The event still deduplicates with the webhook by PaymentIntent ID. */ }
  return true;
}
