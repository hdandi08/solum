import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BuyIntroduction from './BuyIntroduction.jsx';

globalThis.React = React;
const render = (entry, kitId = 'ritual') => renderToStaticMarkup(
  <MemoryRouter initialEntries={[entry]}><BuyIntroduction kitId={kitId} /></MemoryRouter>
);

describe('buy entry experience', () => {
  it.each(['/buy', '/buy?kit=ritual&utm_source=meta'])('shows the guided ritual introduction for direct %s arrivals', entry => {
    const html = render(entry);
    expect(html).toContain('The shower routine for men who want to feel their best.');
    expect(html).toContain('An award-winning kit');
    expect(html).toContain('to take you beyond a 3-in-1.');
    expect(html).toContain('22-minute weekly spa reset.');
    expect(html).toContain('Signature fragrance · Cedarwood + Vetiver');
    expect(html).toContain('checkout-proof-condensed');
  });

  it.each(['ritual', 'ground'])('skips the sales introduction after choosing %s on site', kitId => {
    const html = render({ pathname: '/buy', search: `?kit=${kitId}`, state: { checkoutEntry: 'site' } }, kitId);
    expect(html).toContain('>Checkout</h1>');
    expect(html).not.toContain('The shower routine for men who want to feel their best.');
    expect(html).not.toContain('to take you beyond a 3-in-1.');
    expect(html).not.toContain('Signature fragrance · Cedarwood + Vetiver');
    expect(html).toContain('checkout-proof-condensed');
    expect(html).toContain('RITUAL · Best Grooming Kit');
    for (const name of ['T3', 'Luxury Lifestyle Magazine', 'Carl Thompson', 'Men’s Fashion Magazine']) {
      expect(html).toContain(`alt="${name}"`);
    }
  });

  it('does not mistake unrelated navigation state for a kit decision', () => {
    const html = render({ pathname: '/buy', state: { previousPage: '/contact' } }, 'ground');
    expect(html).toContain('The shower routine for men who want to feel their best.');
    expect(html).toContain('A complete kit');
    expect(html).not.toContain('An award-winning kit');
  });
});
