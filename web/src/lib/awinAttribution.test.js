import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_TTL_MS,
  normalizeCheckoutSource,
  resolveAwinAttribution,
} from './awinAttribution.js';

describe('normalizeCheckoutSource', () => {
  it('keeps only supported one-time order sources', () => {
    expect(normalizeCheckoutSource('tiktok')).toBe('tiktok_shop');
    expect(normalizeCheckoutSource('gift')).toBe('gift');
    expect(normalizeCheckoutSource('aw')).toBe('first_batch');
    expect(normalizeCheckoutSource('unknown')).toBe('first_batch');
  });
});

describe('resolveAwinAttribution', () => {
  const now = Date.UTC(2026, 6, 30, 12, 0, 0);

  it('records an Awin landing for the programme cookie period', () => {
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/buy?source=aw&awc=129171_click',
      now,
    })).toEqual({
      awc: '129171_click', channel: 'aw', expiresAt: now + ATTRIBUTION_TTL_MS,
    });
  });

  it('keeps an Awin checksum but lets a later Meta paid click win the channel', () => {
    const existing = { awc: '129171_click', channel: 'aw', expiresAt: now + ATTRIBUTION_TTL_MS };
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/?utm_source=meta&utm_medium=paid_social',
      existing,
      now: now + 1,
    })).toEqual({
      awc: '129171_click', channel: 'display', expiresAt: now + 1 + ATTRIBUTION_TTL_MS,
    });
  });

  it('keeps the original expiry on a plain revisit with the same Awin cookie', () => {
    const expiresAt = now + ATTRIBUTION_TTL_MS;
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/',
      existing: { awc: '129171_click', channel: 'aw', expiresAt },
      cookieAwc: '129171_click',
      now: expiresAt - 1,
    })).toEqual({ awc: '129171_click', channel: 'aw', expiresAt });
  });

  it('drops expired state and never reads the legacy awc local-storage key', () => {
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/',
      existing: { awc: 'expired', channel: 'aw', expiresAt: now - 1 },
      legacyAwc: 'must_not_be_used',
      now,
    })).toEqual({});
  });
});
