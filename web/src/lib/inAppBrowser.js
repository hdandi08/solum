// Detects whether the page is running inside a social app's in-app browser (IAB).
//
// Why this exists: Apple Pay's JS API is only exposed by real Safari, and Google
// Pay is unreliable inside iOS webviews. Ad traffic from Meta/TikTok opens links
// in these embedded webviews, so those users never see the Express Checkout
// wallet buttons. Tagging every PostHog event with the IAB lets us measure the
// segment, and the same signal drives an "open in browser" nudge on checkout.
//
// Note: PostHog's parsed `$browser` is useless here — it reports these webviews
// as "Mobile Safari" / "Chrome". Only the raw user-agent carries the tell.

// Specific apps are checked before the generic Android WebView (`; wv`) so that,
// e.g., TikTok on Android reports "tiktok" rather than the vaguer "android_webview".
const SIGNATURES = [
  ['instagram',      /Instagram/i],
  ['facebook',       /FBAN|FBAV|FB_IAB/i],
  ['tiktok',         /BytedanceWebview|musical_ly|Bytedance|trill/i],
  ['snapchat',       /Snapchat/i],
  ['twitter',        /Twitter/i],
  ['android_webview', /;\s*wv[);]/i],
];

export const IAB_CHECKOUT_EVENTS = Object.freeze({
  bannerShown: 'iab_banner_shown',
  bannerClicked: 'iab_banner_clicked',
  bannerDismissed: 'iab_banner_dismissed',
  gateShown: 'iab_gate_shown',
  gateOpenClicked: 'iab_gate_open_clicked',
  gateContinueClicked: 'iab_gate_continue_clicked',
});

const IAB_DISPLAY_NAMES = Object.freeze({
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  twitter: 'X',
  android_webview: 'this app',
  none: 'this app',
});

export function formatIabCheckoutSummary({ kitName, price, app = 'instagram' }) {
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
  return {
    selection: `${String(kitName ?? '').trim().toUpperCase()} · £${safePrice} total`,
    delivery: 'Free UK delivery · no hidden costs',
    continueLabel: `Continue in ${IAB_DISPLAY_NAMES[app] ?? 'this app'}`,
    support: 'We’ll show any available quick-pay options. Card payment is always available.',
  };
}

// A wide show/hide gap prevents mobile browser chrome from toggling the fixed
// price bar when it nudges window.scrollY around a single boundary.
export function nextStickyPriceVisibility({ visible, scrollY, suppressed = false }) {
  if (suppressed) return false;
  if (visible) return scrollY >= 280;
  return scrollY > 380;
}

/**
 * @param {string} [ua] user-agent string; defaults to navigator.userAgent
 * @returns {'instagram'|'facebook'|'tiktok'|'snapchat'|'twitter'|'android_webview'|'none'}
 */
export function detectInAppBrowser(ua) {
  const s = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!s) return 'none';
  for (const [name, re] of SIGNATURES) {
    if (re.test(s)) return name;
  }
  return 'none';
}

/** True when running inside any recognised in-app browser. */
export function isInAppBrowser(ua) {
  return detectInAppBrowser(ua) !== 'none';
}

/**
 * @param {string} [ua] user-agent string; defaults to navigator.userAgent
 * @returns {'ios'|'android'|'other'}
 */
export function detectPlatform(ua) {
  const s = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!s) return 'other';
  if (/iPhone|iPad|iPod/i.test(s)) return 'ios';
  if (/Android/i.test(s)) return 'android';
  return 'other';
}

/**
 * Absolute https URL to reopen in the system browser, with distinct_id forwarded
 * for PostHog person continuity. All existing query params are preserved.
 * @param {string} [distinctId] PostHog distinct id to forward
 * @param {string} [href] source URL; defaults to window.location.href
 * @returns {string}
 */
const BRIDGE_VALUE = /^[A-Za-z0-9._~-]{1,500}$/;
const BRIDGE_CHANNELS = new Set(['aw', 'display', 'ppc', 'email']);

function setBridgeValue(url, key, value) {
  if (typeof value === 'string' && BRIDGE_VALUE.test(value.trim())) {
    url.searchParams.set(key, value.trim());
  }
}

export function buildBreakoutUrl(distinctId, href, tracking = {}) {
  const src = href ?? (typeof window !== 'undefined' ? window.location.href : '');
  const url = new URL(src);
  if (distinctId && !url.searchParams.has('distinct_id')) {
    url.searchParams.set('distinct_id', distinctId);
  }
  setBridgeValue(url, 'awc', tracking.awin?.awc);
  setBridgeValue(url, 'fbp', tracking.meta?.fbp);
  setBridgeValue(url, 'fbc', tracking.meta?.fbc);
  setBridgeValue(url, 'ttclid', tracking.tiktok?.ttclid);
  setBridgeValue(url, 'ttp', tracking.tiktok?.ttp);

  const channel = tracking.awin?.channel;
  if (BRIDGE_CHANNELS.has(channel) && !url.searchParams.has('utm_medium')) {
    const campaign = channel === 'display'
      ? { source: tracking.tiktok?.ttclid ? 'tiktok' : 'meta', medium: 'paid_social' }
      : { source: channel === 'aw' ? 'awin' : channel, medium: channel };
    url.searchParams.set('utm_source', campaign.source);
    url.searchParams.set('utm_medium', campaign.medium);
  }
  return url.toString();
}

/**
 * Wrap an https URL in an Android intent:// URL that opens the user's default
 * browser (no hardcoded package). The original URL is the browser_fallback_url.
 * Any fragment on the input is dropped so it can't collide with the #Intent
 * delimiter.
 * @param {string} httpsUrl
 * @returns {string}
 */
export function buildAndroidIntentUrl(httpsUrl) {
  const u = new URL(httpsUrl);
  const fallback = u.origin + u.pathname + u.search; // no hash
  const withoutScheme = u.host + u.pathname + u.search; // host + path + query
  return `intent://${withoutScheme}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

/**
 * Whether /buy should wrap its payment area in the in-app-browser guidance
 * card. Stripe still mounts immediately and can expose any method it detects;
 * the card also retains external-browser and standard-card routes.
 * `?forceIab=1` forces it for preview in any browser.
 * @param {string} [ua] user-agent; defaults to navigator.userAgent
 * @param {string} [search] location search string, e.g. '?forceIab=1'
 * @returns {boolean}
 */
export function shouldShowIabGate(ua, search) {
  if (search && new URLSearchParams(search).has('forceIab')) return true;
  if (!isInAppBrowser(ua)) return false;
  const platform = detectPlatform(ua);
  return platform === 'ios' || platform === 'android';
}
