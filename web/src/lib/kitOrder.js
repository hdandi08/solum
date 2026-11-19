// Browser estimates only. The payment endpoint owns the charged prices and stock.
export const KIT_UNIT_PENCE = Object.freeze({ ground: 6500, ritual: 8500 });
export const MAX_KIT_QUANTITY = 5;
const SELECTION_KEY = 'solum_buy_kit_items';
const DEV_SUPABASE_URL = 'https://rodvvmfzkyjsqbufkjbc.supabase.co';
const PROD_SUPABASE_URL = 'https://gvfptmjluxpngfjendbi.supabase.co';

export function multiKitEnvironmentAllowed(env = import.meta.env) {
  return (env.VITE_SUPABASE_URL === DEV_SUPABASE_URL && /^pk_test_\S+$/.test(env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''))
    || (env.VITE_SUPABASE_URL === PROD_SUPABASE_URL && /^pk_live_\S+$/.test(env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''));
}
export function multiKitCheckoutEnabled(env = import.meta.env) {
  return env.VITE_MULTI_KIT_CHECKOUT_ENABLED === 'true' && multiKitEnvironmentAllowed(env);
}

export function normalizeKitItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 5) throw Error('Choose between 1 and 5 kits.');
  const quantities = {};
  for (const item of items) {
    if (!item || !Object.hasOwn(KIT_UNIT_PENCE, item.kit_id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw Error('Choose whole quantities of GROUND or RITUAL.');
    quantities[item.kit_id] = (quantities[item.kit_id] ?? 0) + item.quantity;
  }
  if (Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0) > MAX_KIT_QUANTITY) throw Error('Choose up to 5 kits per order.');
  return Object.keys(quantities).sort().map(kit_id => ({ kit_id, quantity: quantities[kit_id] }));
}

export function kitOrder(selection, promo) {
  if (promo && (promo.discount_percent !== 10 || typeof promo.code !== 'string' || !promo.code.trim())) throw Error('The offer could not be verified. Please try again.');
  const items = normalizeKitItems(selection).map(item => ({ ...item, unit_amount_pence: KIT_UNIT_PENCE[item.kit_id] * (promo ? 0.9 : 1), line_amount_pence: item.quantity * KIT_UNIT_PENCE[item.kit_id] * (promo ? 0.9 : 1) }));
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPence = items.reduce((sum, item) => sum + item.quantity * KIT_UNIT_PENCE[item.kit_id], 0);
  return { items, totalQuantity, ...(promo ? {subtotalPence, discountPence: subtotalPence / 10, promo: {code: promo.code, discount_percent: 10}} : {}), amountPence: items.reduce((sum, item) => sum + item.line_amount_pence, 0), label: totalQuantity > 1 ? `${totalQuantity} kits` : items[0].kit_id.toUpperCase() };
}

export function kitStockError(items, inventory) {
  for (const { kit_id, quantity } of normalizeKitItems(items)) {
    const stock = inventory?.[kit_id];
    if (stock?.available === false || (Number.isFinite(stock?.count) && quantity > stock.count)) return `${kit_id.toUpperCase()}: ${Math.max(0, stock.count ?? 0)} available. Please update your quantities.`;
  }
  return '';
}

export function changeKitQuantity(items, kitId, delta, inventory) {
  const current = normalizeKitItems(items);
  if (!Object.hasOwn(KIT_UNIT_PENCE, kitId) || ![-1, 1].includes(delta)) return current;
  const quantity = (current.find(item => item.kit_id === kitId)?.quantity ?? 0) + delta;
  if (quantity < 0) return current;
  const next = current.filter(item => item.kit_id !== kitId);
  if (quantity) next.push({ kit_id: kitId, quantity });
  try {
    const normalized = normalizeKitItems(next);
    // Decrements always remain possible when availability drops under a draft.
    return delta > 0 && kitStockError(normalized, inventory) ? current : normalized;
  } catch { return current; }
}

export function paymentKitOrder(payInfo, expectedItems, expectedPromo) {
  // A saved paid snapshot can be verified without an active campaign. At a new
  // payment boundary callers also supply the claimed code to prevent fallback.
  const promo = expectedPromo ?? payInfo?.promo;
  const expected = kitOrder(expectedItems, promo);
  if (promo && (!payInfo?.promo || payInfo.promo.code !== promo.code || payInfo.promo.discount_percent !== 10
    || payInfo.promo.subtotal_pence !== expected.subtotalPence || payInfo.promo.discount_pence !== expected.discountPence)) throw Error('The offer total could not be verified. Please try again.');
  if (!promo && expected.totalQuantity === 1 && payInfo?.checkout_flow !== 'multi_kit_v1') {
    if (!Number.isSafeInteger(payInfo?.amount_pence) || payInfo.amount_pence !== expected.amountPence) throw Error('The payment total could not be verified. Please try again.');
    return expected;
  }
  const items = payInfo?.order_items;
  if (payInfo?.checkout_flow !== 'multi_kit_v1' || !Array.isArray(items) || items.length !== expected.items.length
    || JSON.stringify(normalizeKitItems(items)) !== JSON.stringify(normalizeKitItems(expectedItems))
    || payInfo.total_quantity !== expected.totalQuantity
    || !Number.isSafeInteger(payInfo.amount_pence)
    || items.some(item => item.unit_amount_pence !== KIT_UNIT_PENCE[item.kit_id] * (promo ? 0.9 : 1) || !Number.isSafeInteger(item.line_amount_pence) || item.line_amount_pence !== item.quantity * item.unit_amount_pence)
    || payInfo.amount_pence !== items.reduce((sum, item) => sum + item.line_amount_pence, 0)) throw Error('The payment total could not be verified. Please try again.');
  return { ...expected, items: [...items].sort((a, b) => a.kit_id.localeCompare(b.kit_id)), amountPence: payInfo.amount_pence };
}

function browserStorage() { try { return globalThis.sessionStorage; } catch { return undefined; } }

export function saveKitSelection(items, storage = browserStorage()) {
  try { storage?.setItem(SELECTION_KEY, JSON.stringify(normalizeKitItems(items))); } catch { /* Optional browser persistence. */ }
}
export function restoreKitSelection(kitId, storage = browserStorage()) {
  try { const items = normalizeKitItems(JSON.parse(storage?.getItem(SELECTION_KEY) ?? 'null')); if (items.some(item => item.kit_id === kitId)) return items; } catch { /* Start with the selected kit. */ }
  return [{ kit_id: kitId, quantity: 1 }];
}
export function kitSelectionParam(items) { return normalizeKitItems(items).map(item => `${item.kit_id}:${item.quantity}`).join(','); }
export function parseKitSelectionParam(value) {
  if (!value || !/^(ground|ritual):[1-5](,(ground|ritual):[1-5])?$/.test(value)) return null;
  try { return normalizeKitItems(value.split(',').map(line => { const [kit_id, quantity] = line.split(':'); return { kit_id, quantity: Number(quantity) }; })); } catch { return null; }
}
