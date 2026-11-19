import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import KitQuantityEditor, { KitOrderLines } from './KitQuantityEditor.jsx';
import { kitOrder } from '../lib/kitOrder.js';
vi.stubGlobal('React', React);
describe('inline kit quantities', () => {
  it('opens with one kit, a disabled last-kit decrement, and the other kit opt-in', () => {
    const html = renderToStaticMarkup(<KitQuantityEditor items={[{ kit_id: 'ritual', quantity: 1 }]} inventory={{ ritual: { count: 5 }, ground: { count: 3 } }} onApply={() => {}} onCancel={() => {}} />);
    expect(html).toContain('aria-label="Decrease RITUAL quantity" disabled');
    expect(html).toContain('Add GROUND kit'); expect(html).toContain('Update order'); expect(html).toContain('Cancel');
  });
  it('renders one grouped row per type and the separate-parcel promise', () => {
    const order = kitOrder([{ kit_id: 'ritual', quantity: 2 }, { kit_id: 'ground', quantity: 1 }]);
    const html = renderToStaticMarkup(<KitOrderLines order={order} />);
    expect(html).toContain('2 × £85'); expect(html).toContain('£170'); expect(html).toContain('£65'); expect(html).toContain('Your 3 kits will be sent in separate parcels.');
  });
});
