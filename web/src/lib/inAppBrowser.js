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
export function buildBreakoutUrl(distinctId, href) {
  const src = href ?? (typeof window !== 'undefined' ? window.location.href : '');
  const url = new URL(src);
  if (distinctId && !url.searchParams.has('distinct_id')) {
    url.searchParams.set('distinct_id', distinctId);
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
 * Whether /buy should replace the payment area with the in-app-browser gate:
 * a blocking "open in browser / continue here" choice card. True inside any
 * recognised iOS/Android in-app webview, where Apple Pay / Google Pay /
 * PayPal never render. `?forceIab=1` forces it for preview in any browser.
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
