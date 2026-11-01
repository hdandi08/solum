import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExpressCheckout from './ExpressCheckout.jsx';

const stripe = vi.hoisted(() => ({ confirmPayment: vi.fn() }));
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => stripe,
  useElements: () => ({ submit: async () => ({}) }),
  ExpressCheckoutElement: () => null,
}));
vi.mock('../lib/analytics.js', () => ({
  capture: () => {}, fbInitiateCheckout: () => {}, identify: () => {},
  ttqAddPaymentInfo: () => {}, ttqIdentify: () => {}, ttqInitiateCheckout: () => {},
  getMetaIds: () => ({}), getTikTokIds: () => ({}),
}));
vi.mock('../lib/awinAttribution.js', () => ({
  captureAwinAttribution: () => ({}), resolveAwinPaymentIntentMetadata: async () => ({}),
}));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('wallet stock rejection', () => {
  it('closes a sold-out wallet and passes buyer details to the waitlist without confirming payment', async () => {
    vi.stubGlobal('React', React);
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'sold_out', message: 'This kit is currently sold out.' }, { status: 409 })));
    const onSoldOut = vi.fn();
    const paymentFailed = vi.fn();
    const element = ExpressCheckout({
      kitId: 'ritual', kitName: 'RITUAL', price: 85, source: 'first_batch',
      supabaseUrl: 'https://example.com', authHeaders: {}, onError: vi.fn(),
      onSoldOut, onAvailability: vi.fn(),
    });
    await element.props.onConfirm({
      expressPaymentType: 'apple_pay', paymentFailed,
      billingDetails: { email: 'harsha@ecompilers.com', name: 'Harsha Dandi' },
      shippingAddress: { name: 'Harsha Dandi', address: { line1: '10 Test Street', city: 'London', postal_code: 'SW1A 1AA' } },
    });
    expect(paymentFailed).toHaveBeenCalledOnce();
    expect(onSoldOut).toHaveBeenCalledWith(expect.objectContaining({ email: 'harsha@ecompilers.com', first_name: 'Harsha', kit_id: 'ritual' }));
    expect(stripe.confirmPayment).not.toHaveBeenCalled();
  });
});
