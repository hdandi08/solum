import { describe, expect, it } from 'vitest';
import {
  buildExpressPaymentIntentBody,
  EXPRESS_CHECKOUT_EVENTS,
  expressCheckoutElementOptions,
  expressElementsOptions,
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
      availability: 'express_availability',
      clicked: 'express_clicked',
      cancelled: 'express_cancelled',
      error: 'express_error',
      initiated: 'checkout_initiated',
    });
  });

  it('offers every previously enabled wallet while keeping card-compatible types', () => {
    expect(expressCheckoutElementOptions()).toEqual({
      buttonHeight: 48,
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
        applePay: 'auto',
        googlePay: 'auto',
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
      paymentMethodTypes: ['card', 'link', 'paypal'],
      appearance: { theme: 'night' },
    });
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
    });
    expect(result.body).not.toHaveProperty('awc');
  });
});
