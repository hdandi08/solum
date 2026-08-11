import { afterEach, describe, expect, it } from 'vitest';
import { resolveAwcToken, storeAwcCookie, trackingOrigin } from './awinCookieBridge.js';

const originalLocation = globalThis.location;

afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

describe('trackingOrigin', () => {
  it('uses production tracking only for the apex and www production hosts', () => {
    expect(trackingOrigin('bysolum.co.uk')).toBe('https://track.bysolum.co.uk');
    expect(trackingOrigin('www.bysolum.co.uk')).toBe('https://track.bysolum.co.uk');
    expect(trackingOrigin('preview.bysolum.co.uk')).toBe('https://track-dev.bysolum.co.uk');
    expect(trackingOrigin('localhost')).toBe('https://track-dev.bysolum.co.uk');
  });
});

describe('storeAwcCookie', () => {
  it('sends the checksum in a credentialed first-party request', async () => {
    globalThis.location = { hostname: 'www.bysolum.co.uk' };
    const calls = [];
    const fetchImpl = async (...args) => {
      calls.push(args);
      return { ok: true };
    };

    await expect(storeAwcCookie('129171_example', fetchImpl)).resolves.toBe(true);
    expect(calls).toEqual([[
      'https://track.bysolum.co.uk/awin/click',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awc: '129171_example' }),
      },
    ]]);
  });

  it('suppresses blank and oversized checksums before any request', async () => {
    globalThis.location = { hostname: 'localhost' };
    let requestCount = 0;
    const fetchImpl = async () => {
      requestCount += 1;
      return { ok: true };
    };

    await expect(storeAwcCookie('', fetchImpl)).resolves.toBe(false);
    await expect(storeAwcCookie('   ', fetchImpl)).resolves.toBe(false);
    await expect(storeAwcCookie('a'.repeat(501), fetchImpl)).resolves.toBe(false);
    expect(requestCount).toBe(0);
  });
});

describe('resolveAwcToken', () => {
  it('requests an opaque fallback token with credentials', async () => {
    globalThis.location = { hostname: 'localhost' };
    const calls = [];
    const fetchImpl = async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ token: 'opaque-token' }) };
    };

    await expect(resolveAwcToken(fetchImpl)).resolves.toBe('opaque-token');
    expect(calls).toEqual([[
      'https://track-dev.bysolum.co.uk/awin/resolve',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    ]]);
  });

  it('returns undefined for token null or an unsuccessful response', async () => {
    globalThis.location = { hostname: 'localhost' };

    await expect(resolveAwcToken(async () => ({
      ok: true,
      json: async () => ({ token: null }),
    }))).resolves.toBeUndefined();
    await expect(resolveAwcToken(async () => ({ ok: false }))).resolves.toBeUndefined();
  });
});
