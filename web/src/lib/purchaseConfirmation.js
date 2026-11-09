// Keep only Stripe's returned result across the checkout's full-page navigation.
// Client secrets and buyer details are never stored in this confirmation record.
const RESULT_PREFIX = 'solum_payment_result_';
const MAX_AGE = 24 * 60 * 60 * 1000;
const claimed = new Set();

function browserStorage() {
  try { return globalThis.sessionStorage; } catch { return undefined; }
}

function paymentResult(intent, kitId) {
  if (!/^pi_[A-Za-z0-9]+$/.test(intent?.id ?? '') || !['ground', 'ritual', 'sovereign'].includes(kitId)) return { status: 'unverified' };
  if (intent.status === 'processing') return { status: 'processing' };
  if (['canceled', 'requires_payment_method'].includes(intent.status)) return { status: 'failed' };
  if (intent.status !== 'succeeded' || intent.currency !== 'gbp' || !Number.isSafeInteger(intent.amount) || intent.amount <= 0) return { status: 'unverified' };
  return { status: 'confirmed', purchase: { eventId: intent.id, value: intent.amount / 100, kitId, livemode: intent.livemode === true } };
}

export function rememberPaymentResult(intent, kitId, storage = browserStorage()) {
  const result = paymentResult(intent, kitId);
  if (!['confirmed', 'processing'].includes(result.status)) return;
  const receipt = { intent: { id: intent.id, status: intent.status, amount: intent.amount, currency: intent.currency, livemode: intent.livemode }, kitId, savedAt: Date.now() };
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
      const result = paymentResult(paymentIntent, kitId);
      rememberPaymentResult(paymentIntent, kitId, storage);
      return result;
    } catch { return { status: 'unverified' }; }
  }
  try {
    const saved = inlineResult ?? JSON.parse(storage?.getItem(`${RESULT_PREFIX}${reference}`) ?? 'null');
    const age = Date.now() - saved?.savedAt;
    if (!saved || !Number.isFinite(age) || age < 0 || age > MAX_AGE || saved.intent?.id !== reference) return { status: 'unverified' };
    return paymentResult(saved.intent, saved.kitId);
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
