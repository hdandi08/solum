import { describe, it, expect } from 'vitest';
import { readCookie, deriveFbc, newEventId, preferBridgeValue } from './metaCapi.js';

describe('readCookie', () => {
  it('reads a named cookie from a cookie string', () => {
    expect(readCookie('_fbp', '_ga=GA1.2; _fbp=fb.1.123.456; other=x')).toBe('fb.1.123.456');
  });
  it('matches the first cookie in the string', () => {
    expect(readCookie('_fbp', '_fbp=fb.1.9.9')).toBe('fb.1.9.9');
  });
  it('returns null when absent', () => {
    expect(readCookie('_fbc', '_fbp=fb.1.123.456')).toBeNull();
  });
  it('does not match a name suffix (_fbp vs x_fbp)', () => {
    expect(readCookie('_fbp', 'xx_fbp=wrong')).toBeNull();
  });
  it('decodes URI-encoded values', () => {
    expect(readCookie('c', 'c=a%3Db')).toBe('a=b');
  });
});

describe('deriveFbc', () => {
  it('prefers the _fbc cookie when present', () => {
    expect(deriveFbc('fb.1.111.abc', 'ignored-click-id')).toBe('fb.1.111.abc');
  });
  it('derives fbc from fbclid per Meta spec when cookie missing', () => {
    expect(deriveFbc(null, 'IwAR123', 1700000000000)).toBe('fb.1.1700000000000.IwAR123');
  });
  it('returns null with neither cookie nor fbclid', () => {
    expect(deriveFbc(null, null)).toBeNull();
  });
});

describe('cross-browser campaign precedence', () => {
  it('prefers a current breakout bridge over an older target-browser cookie', () => {
    expect(preferBridgeValue('current-click', 'stale-cookie')).toBe('current-click');
    expect(preferBridgeValue(null, 'cookie-only')).toBe('cookie-only');
  });
});

describe('newEventId', () => {
  it('produces unique non-empty ids', () => {
    const a = newEventId();
    const b = newEventId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
