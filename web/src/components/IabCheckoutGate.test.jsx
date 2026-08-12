import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
