import { describe, it, expect } from 'vitest';
import { detectInAppBrowser, IAB_CHECKOUT_EVENTS, shouldShowIabGate } from './inAppBrowser';

// Representative real-world user-agent strings for the in-app webviews we care about.
const UA = {
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 335.0.0.0.0 (iPhone14,3; iOS 17_5; en_GB)',
  facebook:  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.0]',
  messenger: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FB_IAB/MESSENGER;FBAV/470.0.0.0]',
  tiktok:    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.0.0 BytedanceWebview/d8a21c',
  snapchat:  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.0.0.0',
  androidWv: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
  safari:    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chrome:    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

it('keeps every established in-app-browser PostHog event name', () => {
  expect(IAB_CHECKOUT_EVENTS).toEqual({
    bannerShown: 'iab_banner_shown',
    bannerClicked: 'iab_banner_clicked',
    bannerDismissed: 'iab_banner_dismissed',
    gateShown: 'iab_gate_shown',
    gateOpenClicked: 'iab_gate_open_clicked',
    gateContinueClicked: 'iab_gate_continue_clicked',
  });
});

describe('detectInAppBrowser', () => {
  it('detects Instagram', () => expect(detectInAppBrowser(UA.instagram)).toBe('instagram'));
  it('detects Facebook (FBAN/FBAV)', () => expect(detectInAppBrowser(UA.facebook)).toBe('facebook'));
  it('detects Messenger (FB_IAB)', () => expect(detectInAppBrowser(UA.messenger)).toBe('facebook'));
  it('detects TikTok', () => expect(detectInAppBrowser(UA.tiktok)).toBe('tiktok'));
  it('detects Snapchat', () => expect(detectInAppBrowser(UA.snapchat)).toBe('snapchat'));
  it('detects a generic Android WebView', () => expect(detectInAppBrowser(UA.androidWv)).toBe('android_webview'));

  it('returns none for real Safari', () => expect(detectInAppBrowser(UA.safari)).toBe('none'));
  it('returns none for real Chrome', () => expect(detectInAppBrowser(UA.chrome)).toBe('none'));
  it('returns none for empty / missing UA', () => {
    expect(detectInAppBrowser('')).toBe('none');
    expect(detectInAppBrowser(undefined)).toBe('none');
  });

  it('prefers the more specific app over generic android webview (TikTok on Android)', () => {
    const tiktokAndroid = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 BytedanceWebview/d8a21c';
    expect(detectInAppBrowser(tiktokAndroid)).toBe('tiktok');
  });
});

import { detectPlatform } from './inAppBrowser';

describe('detectPlatform', () => {
  it('detects iOS from iPhone UA', () =>
    expect(detectPlatform(UA.instagram)).toBe('ios'));
  it('detects iOS from iPad UA', () =>
    expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe('ios'));
  it('detects Android', () =>
    expect(detectPlatform(UA.androidWv)).toBe('android'));
  it('returns other for desktop', () =>
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15')).toBe('other'));
  it('returns other for empty UA', () =>
    expect(detectPlatform('')).toBe('other'));
});

import { buildBreakoutUrl } from './inAppBrowser';

describe('buildBreakoutUrl', () => {
  const base = 'https://bysolum.co.uk/buy?source=first_batch&kit=ritual&fbclid=abc';

  it('preserves all existing query params', () => {
    const out = buildBreakoutUrl('ph_123', base);
    expect(out).toContain('source=first_batch');
    expect(out).toContain('kit=ritual');
    expect(out).toContain('fbclid=abc');
  });
  it('appends distinct_id', () => {
    expect(buildBreakoutUrl('ph_123', base)).toContain('distinct_id=ph_123');
  });
  it('does not duplicate distinct_id if already present', () => {
    const withId = base + '&distinct_id=old';
    const out = buildBreakoutUrl('ph_new', withId);
    expect(out.match(/distinct_id=/g)).toHaveLength(1);
    expect(out).toContain('distinct_id=old');
  });
  it('omits distinct_id when none provided', () => {
    expect(buildBreakoutUrl(undefined, base)).not.toContain('distinct_id=');
  });
  it('bridges bounded AWIN, Meta, and TikTok identifiers into the external browser', () => {
    const out = buildBreakoutUrl('ph_123', 'https://bysolum.co.uk/buy?kit=ritual', {
      awin: { awc: '129171_click', channel: 'aw' },
      meta: { fbp: 'fb.1.1.browser', fbc: 'fb.1.2.click' },
      tiktok: { ttclid: 'tt-click', ttp: 'tt-cookie' },
    });

    expect(out).toContain('awc=129171_click');
    expect(out).toContain('fbp=fb.1.1.browser');
    expect(out).toContain('fbc=fb.1.2.click');
    expect(out).toContain('ttclid=tt-click');
    expect(out).toContain('ttp=tt-cookie');
  });
  it('drops malformed or oversized cross-browser tracking values', () => {
    const out = buildBreakoutUrl('ph_123', 'https://bysolum.co.uk/buy', {
      awin: { awc: '<script>', channel: 'unknown' },
      meta: { fbp: 'x'.repeat(501), fbc: 'bad value' },
      tiktok: { ttclid: 'bad value', ttp: 'x'.repeat(501) },
    });

    expect(out).not.toMatch(/awc=|fbp=|fbc=|ttclid=|ttp=/);
  });
});

import { buildAndroidIntentUrl } from './inAppBrowser';

describe('buildAndroidIntentUrl', () => {
  const url = 'https://bysolum.co.uk/buy?source=first_batch&distinct_id=ph_1';

  it('produces a scheme=https intent that ends with ;end', () => {
    const out = buildAndroidIntentUrl(url);
    expect(out.startsWith('intent://bysolum.co.uk/buy?source=first_batch&distinct_id=ph_1')).toBe(true);
    expect(out).toContain('#Intent;scheme=https;');
    expect(out.endsWith(';end')).toBe(true);
  });
  it('does NOT hardcode a browser package', () => {
    expect(buildAndroidIntentUrl(url)).not.toContain('package=');
  });
  it('includes a URL-encoded browser_fallback_url', () => {
    const out = buildAndroidIntentUrl(url);
    expect(out).toContain('S.browser_fallback_url=' + encodeURIComponent(url));
  });
  it('strips a fragment so the intent delimiter cannot collide', () => {
    const out = buildAndroidIntentUrl(url + '#section');
    // exactly one "#Intent" delimiter, no stray "#section" before it
    expect(out.match(/#/g)).toHaveLength(1);
    expect(out).not.toContain('#section');
  });
});

describe('shouldShowIabGate', () => {
  it('shows for Facebook iOS in-app browser', () =>
    expect(shouldShowIabGate(UA.facebook, '')).toBe(true));
  it('shows for a generic Android WebView', () =>
    expect(shouldShowIabGate(UA.androidWv, '')).toBe(true));
  it('hides for real Safari', () =>
    expect(shouldShowIabGate(UA.safari, '')).toBe(false));
  it('hides for real Chrome', () =>
    expect(shouldShowIabGate(UA.chrome, '')).toBe(false));
  it('forceIab=1 forces the gate in any browser', () =>
    expect(shouldShowIabGate(UA.chrome, '?forceIab=1')).toBe(true));
  it('handles missing search string', () =>
    expect(shouldShowIabGate(UA.safari, undefined)).toBe(false));
});
