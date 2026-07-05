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
