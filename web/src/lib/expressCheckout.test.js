import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildExpressPaymentIntentBody,
  startExpressLoadTracking,
  EXPRESS_CHECKOUT_EVENTS,
  expressCheckoutElementOptions,
  expressElementsOptions,
  expressWalletAvailability,
  notifyExpressPaymentFailed,
} from './expressCheckout.js';

const walletEvent = {
  expressPaymentType: 'apple_pay',
  billingDetails: {
    name: 'Harsha Dandi',
    email: ' Buyer@Example.com ',
    phone: '07700 900000',
  },
  shippingAddress: {
    name: 'Harsha Dandi',
    address: {
      line1: '14 Example Street',
      line2: '',
      city: 'London',
      state: 'Greater London',
      postal_code: 'SW1A 1AA',
      country: 'GB',
    },
  },
};

describe('Express Checkout configuration', () => {
  it('keeps the established PostHog event names available to the restored flow', () => {
    expect(EXPRESS_CHECKOUT_EVENTS).toEqual({
      loading: 'express_loading',
      slow: 'express_slow',
      availability: 'express_availability',
      clicked: 'express_clicked',
      cancelled: 'express_cancelled',
      error: 'express_error',
      initiated: 'checkout_initiated',
    });
  });

  it('requests Apple Pay on every supported platform without an overflow menu', () => {
    expect(expressCheckoutElementOptions()).toEqual({
      buttonHeight: 48,
      layout: { maxColumns: 2, overflow: 'never' },
      paymentMethodOrder: ['apple_pay', 'google_pay', 'link', 'paypal'],
      emailRequired: true,
      shippingAddressRequired: true,
      phoneNumberRequired: false,
      allowedShippingCountries: ['GB'],
      shippingRates: [{
        id: 'delivery-included',
        displayName: 'UK delivery included',
        amount: 0,
      }],
      paymentMethods: {
        applePay: 'always',
        googlePay: 'always',
        link: 'auto',
        paypal: 'auto',
        amazonPay: 'never',
        klarna: 'never',
      },
    });
    expect(expressElementsOptions({ amountPence: 8500, appearance: { theme: 'night' } })).toEqual({
      mode: 'payment',
      amount: 8500,
      currency: 'gbp',
      appearance: { theme: 'night' },
    });
  });

  it('does not treat an empty or false wallet map as available', () => {
    expect(expressWalletAvailability(undefined).available).toBe(false);
    expect(expressWalletAvailability({}).available).toBe(false);
    expect(expressWalletAvailability({ applePay: false, link: false }).available).toBe(false);
    expect(expressWalletAvailability({ applePay: true })).toMatchObject({ available: true, apple_pay: true });
    expect(expressWalletAvailability({ applePay: { available: false } }).available).toBe(false);
    expect(expressWalletAvailability({ applePay: { available: true } })).toMatchObject({ available: true, apple_pay: true });
  });

  it('closes an unsuccessful Stripe wallet sheet with a bounded public message', () => {
    const calls = [];
    notifyExpressPaymentFailed({ paymentFailed: (payload) => calls.push(payload) }, ' Try card instead. ');

    expect(calls).toEqual([{ reason: 'fail', message: 'Try card instead.' }]);
  });
});

describe('buildExpressPaymentIntentBody', () => {
  it('carries wallet contact, shipping, campaign IDs, and direct AWIN attribution', async () => {
    const result = await buildExpressPaymentIntentBody({
      event: walletEvent,
      kitId: 'ritual',
      source: 'first_batch',
      siteHost: 'www.bysolum.co.uk',
      tikTokIds: { ttclid: 'tt-click', ttp: 'tt-cookie' },
      metaIds: { fbp: 'fb.1.browser', fbc: 'fb.1.click' },
      attribution: { awc: '129171_direct', channel: 'aw' },
    }, async () => { throw new Error('direct AWC must not resolve a token'); });

    expect(result).toEqual({
      buyer: { email: 'buyer@example.com', firstName: 'Harsha' },
      body: {
        kit_id: 'ritual',
        email: 'buyer@example.com',
        first_name: 'Harsha',
        last_name: 'Dandi',
        phone: '07700 900000',
        source: 'first_batch',
        site_host: 'www.bysolum.co.uk',
        ttclid: 'tt-click',
        ttp: 'tt-cookie',
        fbp: 'fb.1.browser',
        fbc: 'fb.1.click',
        awc: '129171_direct',
        awin_channel: 'aw',
        line1: '14 Example Street',
        line2: null,
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        payment_flow: 'express_wallet',
      },
    });
  });

  it('uses the opaque AWIN recovery token when direct browser attribution is absent', async () => {
    const result = await buildExpressPaymentIntentBody({
      event: walletEvent,
      kitId: 'ground',
      source: 'first_batch',
      siteHost: 'dev.d3pa095gzazg3c.amplifyapp.com',
      attribution: { channel: 'aw' },
    }, async () => 'opaque-token');

    expect(result.body).toMatchObject({
      kit_id: 'ground',
      awin_channel: 'aw',
      awin_attribution_token: 'opaque-token',
      payment_flow: 'express_wallet',
    });
    expect(result.body).not.toHaveProperty('awc');
  });
});


describe('express loading telemetry', () => {
  afterEach(() => vi.useRealTimers());
  it('records a slow load even when wallets never become ready', () => {
    vi.useFakeTimers();
    let clock = 1000;
    const capture = vi.fn();
    const load = startExpressLoadTracking({ capture, kit: 'ritual', source: 'first_batch', now: () => clock });
    expect(capture).toHaveBeenCalledWith('express_loading', { kit: 'ritual', source: 'first_batch' });
    clock = 5000;
    vi.advanceTimersByTime(4000);
    expect(capture).toHaveBeenCalledWith('express_slow', { kit: 'ritual', source: 'first_batch', load_ms: 4000 });
    load.stop();
  });
  it('does not report a ready wallet as slow', () => {
    vi.useFakeTimers();
    let clock = 1000;
    const capture = vi.fn();
    const load = startExpressLoadTracking({ capture, kit: 'ground', source: 'first_batch', now: () => clock });
    clock = 1800;
    expect(load.finish()).toEqual({ load_ms: 800, page_elapsed_ms: 1800 });
    vi.advanceTimersByTime(5000);
    expect(capture).not.toHaveBeenCalledWith('express_slow', expect.anything());
  });
  it('cancels pending telemetry when checkout unmounts', () => {
    vi.useFakeTimers();
    const capture = vi.fn();
    const load = startExpressLoadTracking({ capture, kit: 'ritual', source: 'first_batch', now: () => 1000 });
    load.stop();
    vi.advanceTimersByTime(5000);
    expect(capture).toHaveBeenCalledTimes(1);
  });
});
