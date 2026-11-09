import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getDispatchDate } from '../lib/dispatch.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({ default: { __loaded: false } }));
vi.mock('../lib/analytics.js', () => ({
  capture: vi.fn(),
  getMetaIds: () => ({}),
  getTikTokIds: () => ({}),
}));
vi.mock('../lib/awinAttribution.js', () => ({ captureAwinAttribution: () => ({}) }));

let IabCheckoutGate;
beforeAll(async () => {
  globalThis.React = React;
  IabCheckoutGate = (await import('./IabCheckoutGate.jsx')).default;
});

describe('IabCheckoutGate', () => {
  it.each([
    [new Date(2026, 10, 9, 17, 59), '2026-11-10', 'Tuesday 10 November'],
    [new Date(2026, 10, 9, 18, 0), '2026-11-11', 'Wednesday 11 November'],
  ])('shows dispatch before payment using the order cutoff: %s', (now, iso, label) => {
    const page = renderToStaticMarkup(<IabCheckoutGate kit="ritual" kitName="Ritual" price={85} dispatch={getDispatchDate(now)} onContinue={() => {}} expressReady expressAvailable><div>Wallet buttons</div></IabCheckoutGate>);
    expect(page).toContain(`dateTime="${iso}"`);
    expect(page).toContain(label);
    expect(page.indexOf('Ships ')).toBeLessThan(page.indexOf('Wallet buttons'));
    expect(page).toContain('href="/terms"');
    expect(page).toContain('href="/privacy"');
  });

  it('shows price and mounts available express checkout before the card fallback', () => {
    const page = renderToStaticMarkup(
      <IabCheckoutGate
        kit="ritual"
        kitName="Ritual"
        price={85}
        source="first_batch"
        onContinue={() => {}}
        expressReady={false}
        expressAvailable={false}
      >
        <div data-testid="stripe-express">Stripe express checkout</div>
      </IabCheckoutGate>,
    );

    expect(page).toContain('RITUAL · £85 total');
    expect(page).toContain('Free UK delivery · no hidden costs');
    expect(page).toContain('data-testid="stripe-express"');
    expect(page.indexOf('Stripe express checkout')).toBeLessThan(page.indexOf('pay by card'));
  });
});
