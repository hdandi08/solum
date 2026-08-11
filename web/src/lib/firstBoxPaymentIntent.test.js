import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFirstBoxPaymentIntentBody } from './firstBoxPaymentIntent.js';
import { resolveAwcToken } from './awinCookieBridge.js';

const originalLocation = globalThis.location;
const input = {
  kitId: 'ritual',
  form: {
    email: ' Buyer@Example.com ',
    first_name: ' Harsha ',
    last_name: ' Dandi ',
    phone: ' 07700 900000 ',
    line1: ' 14 Example Street ',
    line2: ' ',
    city: ' London ',
    county: ' Greater London ',
    postcode: ' SW1A 1AA ',
  },
  source: 'first_batch',
  siteHost: 'www.bysolum.co.uk',
  tikTokIds: { ttclid: 'tt-click', ttp: 'tt-cookie' },
};

const baseBody = {
  kit_id: 'ritual',
  email: 'buyer@example.com',
  first_name: 'Harsha',
  last_name: 'Dandi',
  phone: '07700 900000',
  source: 'first_batch',
  site_host: 'www.bysolum.co.uk',
  ttclid: 'tt-click',
  ttp: 'tt-cookie',
  line1: '14 Example Street',
  line2: null,
  city: 'London',
  county: 'Greater London',
  postcode: 'SW1A 1AA',
};

afterEach(() => {
  vi.useRealTimers();
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

describe('buildFirstBoxPaymentIntentBody', () => {
  it('puts direct AWC in the final request and never asks for a token', async () => {
    const body = await buildFirstBoxPaymentIntentBody({
      ...input,
      attribution: { awc: '129171_direct', channel: 'aw' },
    }, async () => { throw new Error('must not resolve'); });

    expect(body).toEqual({
      ...baseBody,
      awc: '129171_direct',
      awin_channel: 'aw',
    });
  });

  it('puts only the opaque fallback token in its exact request field', async () => {
    const body = await buildFirstBoxPaymentIntentBody({
      ...input,
      attribution: { channel: 'display' },
    }, async () => 'opaque-token');

    expect(body).toEqual({
      ...baseBody,
      awin_channel: 'display',
      awin_attribution_token: 'opaque-token',
    });
    expect(body).not.toHaveProperty('awc');
  });

  it('continues after the real 500 ms timeout with no AWIN fields', async () => {
    vi.useFakeTimers();
    globalThis.location = { hostname: 'localhost' };
    const abortAwareFetch = async (_url, { signal }) => await new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });

    const pending = buildFirstBoxPaymentIntentBody({
      ...input,
      attribution: { awc: 'unsafe value', channel: 'invalid' },
    }, () => resolveAwcToken(abortAwareFetch));
    await vi.advanceTimersByTimeAsync(500);
    const body = await pending;

    expect(body).toEqual(baseBody);
    expect(body).not.toHaveProperty('awc');
    expect(body).not.toHaveProperty('awin_attribution_token');
    expect(body).not.toHaveProperty('awin_channel');
    expect(vi.getTimerCount()).toBe(0);
  });
});
