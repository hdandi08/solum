import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLandingAwcCapture,
  resolveAwcToken,
  storeAwcCookie,
  trackingOrigin,
} from './awinCookieBridge.js';

const originalLocation = globalThis.location;

afterEach(() => {
  vi.useRealTimers();
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

describe('landing AWC capture', () => {
  it('stores a landing checksum only once when an effect is replayed', async () => {
    const stored = [];
    const captureLanding = createLandingAwcCapture(async (awc) => {
      stored.push(awc);
      return true;
    });

    expect(captureLanding('?source=aw&awc=129171_landing')).toBe(true);
    expect(captureLanding('?source=aw&awc=129171_landing')).toBe(false);
    await Promise.resolve();

    expect(stored).toEqual(['129171_landing']);
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
        signal: expect.any(AbortSignal),
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

  it('aborts a never-settling request after 500 ms and clears its timer', async () => {
    vi.useFakeTimers();
    globalThis.location = { hostname: 'localhost' };
    let observedSignal;
    let aborted = false;
    const fetchImpl = async (_url, options) => {
      observedSignal = options.signal;
      if (!observedSignal) return { ok: false };
      return await new Promise((_resolve, reject) => {
        observedSignal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('aborted'));
        }, { once: true });
      });
    };

    const resolution = resolveAwcToken(fetchImpl);
    await Promise.resolve();
    expect(observedSignal).toBeDefined();
    await vi.advanceTimersByTimeAsync(499);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resolution).resolves.toBeUndefined();
    expect(aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fails open for network and malformed JSON responses without leaking errors', async () => {
    globalThis.location = { hostname: 'localhost' };

    await expect(resolveAwcToken(async () => {
      throw new Error('network');
    })).resolves.toBeUndefined();
    await expect(resolveAwcToken(async () => ({
      ok: true,
      json: async () => { throw new SyntaxError('malformed'); },
    }))).resolves.toBeUndefined();
  });
});
