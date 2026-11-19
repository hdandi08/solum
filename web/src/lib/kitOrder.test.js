import { describe, expect, it } from 'vitest';
import { normalizeKitItems, kitOrder, changeKitQuantity, kitStockError, multiKitCheckoutEnabled, paymentKitOrder, saveKitSelection, restoreKitSelection, kitSelectionParam, parseKitSelectionParam } from './kitOrder.js';

const mixed = [{ kit_id: 'ritual', quantity: 2 }, { kit_id: 'ground', quantity: 1 }];
const dev = { VITE_MULTI_KIT_CHECKOUT_ENABLED: 'true', VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co', VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_example' };
describe('kit order', () => {
  it('normalizes duplicate real kits in stable kit order with the £235 mixed total', () => {
    expect(normalizeKitItems([...mixed, { kit_id: 'ground', quantity: 1 }])).toEqual([{ kit_id: 'ground', quantity: 2 }, { kit_id: 'ritual', quantity: 2 }]);
    expect(kitOrder(mixed)).toMatchObject({ totalQuantity: 3, amountPence: 23500, label: '3 kits', items: [{ kit_id: 'ground', quantity: 1, unit_amount_pence: 6500, line_amount_pence: 6500 }, { kit_id: 'ritual', quantity: 2, unit_amount_pence: 8500, line_amount_pence: 17000 }] });
  });
  it.each([[], [{ kit_id: 'sovereign', quantity: 1 }], [{ kit_id: 'ritual', quantity: 0 }], [{ kit_id: 'ritual', quantity: -1 }], [{ kit_id: 'ritual', quantity: 1.5 }], [{ kit_id: 'ritual', quantity: '2' }], [{ kit_id: 'ground', quantity: 3 }, { kit_id: 'ritual', quantity: 3 }], null])('rejects invalid selection %j', items => expect(() => normalizeKitItems(items)).toThrow());
  it('keeps the last kit, limits five overall and respects stock without mutating the applied selection', () => {
    const original = [{ kit_id: 'ritual', quantity: 1 }];
    expect(changeKitQuantity(original, 'ritual', -1)).toEqual(original);
    expect(changeKitQuantity(original, 'ground', 1, { ground: { count: 0, available: false } })).toEqual(original);
    expect(changeKitQuantity([{ kit_id: 'ritual', quantity: 5 }], 'ground', 1)).toEqual([{ kit_id: 'ritual', quantity: 5 }]);
    const draft = changeKitQuantity(original, 'ground', 1, { ground: { count: 2, available: true } });
    expect(draft).toEqual([{ kit_id: 'ground', quantity: 1 }, ...original]);
    expect(original).toEqual([{ kit_id: 'ritual', quantity: 1 }]);
    expect(changeKitQuantity(draft, 'ground', -1)).toEqual(original);
  });
  it('reports insufficient stock per kit and leaves unknown availability to the server', () => {
    expect(kitStockError(mixed, null)).toBe('');
    expect(kitStockError(mixed, { ritual: { count: 1, available: true } })).toContain('RITUAL');
    expect(kitStockError(mixed, { ritual: { count: 5, available: true }, ground: { count: 1, available: true } })).toBe('');
  });
  it('requires all three dev safeguards, never enabling on production or a URL lookalike', () => {
    expect(multiKitCheckoutEnabled(dev)).toBe(true);
    for (const patch of [{ VITE_MULTI_KIT_CHECKOUT_ENABLED: 'false' }, { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_example' }, { VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co.evil.test' }, { VITE_SUPABASE_URL: 'https://production.supabase.co' }]) expect(multiKitCheckoutEnabled({ ...dev, ...patch })).toBe(false);
  });
  it('accepts only a complete matching server snapshot before showing a payable total', () => {
    const order = kitOrder(mixed);
    const payInfo = { checkout_flow: 'multi_kit_v1', order_items: order.items, total_quantity: 3, amount_pence: 23500 };
    expect(paymentKitOrder(payInfo, mixed)).toEqual(order);
    for (const patch of [{ amount_pence: 8500 }, { total_quantity: 1 }, { checkout_flow: undefined }, { order_items: [order.items[0]] }, { order_items: order.items.map(item => ({ ...item, line_amount_pence: 1 })) }]) expect(() => paymentKitOrder({ ...payInfo, ...patch }, mixed)).toThrow();
  });
  it('restores quantities from storage or a browser-breakout URL without trusting prices', () => {
    const values = new Map(); const storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) };
    saveKitSelection(mixed, storage);
    expect(restoreKitSelection('ritual', storage)).toEqual(normalizeKitItems(mixed));
    expect(parseKitSelectionParam(kitSelectionParam(mixed))).toEqual(normalizeKitItems(mixed));
    expect(parseKitSelectionParam('ritual:99')).toBeNull();
    values.clear(); expect(restoreKitSelection('ground', storage)).toEqual([{ kit_id: 'ground', quantity: 1 }]);
  });
});

it('keeps checkout usable when the browser denies access to session storage', () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable:true, get:()=>{throw Error('blocked');} });
  try {
    expect(()=>saveKitSelection([{kit_id:'ground',quantity:1}])).not.toThrow();
    expect(restoreKitSelection('ground')).toEqual([{kit_id:'ground',quantity:1}]);
  } finally { if (old) Object.defineProperty(globalThis,'sessionStorage',old); else delete globalThis.sessionStorage; }
});

it('rejects unsafe or unexpected payment prices even if their line arithmetic adds up', () => {
  const items=[{kit_id:'ritual',quantity:2,unit_amount_pence:9000,line_amount_pence:18000}];
  expect(()=>paymentKitOrder({checkout_flow:'multi_kit_v1',order_items:items,total_quantity:2,amount_pence:18000},items)).toThrow();
});

it('separates safe dev/test recovery capability from enabling new multi-kit orders', async () => {
  const { multiKitEnvironmentAllowed } = await import('./kitOrder.js');
  expect(multiKitEnvironmentAllowed({...dev,VITE_MULTI_KIT_CHECKOUT_ENABLED:'false'})).toBe(true);
  expect(multiKitCheckoutEnabled({...dev,VITE_MULTI_KIT_CHECKOUT_ENABLED:'false'})).toBe(false);
  expect(multiKitEnvironmentAllowed({...dev,VITE_SUPABASE_URL:'https://production.supabase.co'})).toBe(false);
});
