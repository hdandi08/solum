export const ATTRIBUTION_STORAGE_KEY = 'solum_awin_attribution';
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const VALID_ORDER_SOURCES = new Set(['first_batch', 'gift', 'tiktok_shop']);
const VALID_CHANNELS = new Set(['aw', 'display', 'ppc', 'email']);
const SEARCH_SIGNALS = new Set(['google', 'bing', 'cpc', 'ppc', 'paid_search']);
const PAID_SOCIAL_SIGNALS = new Set([
  'meta', 'facebook', 'instagram', 'tiktok', 'paid_social', 'social_paid',
]);

export function normalizeCheckoutSource(rawSource) {
  if (rawSource === 'tiktok') return 'tiktok_shop';
  return VALID_ORDER_SOURCES.has(rawSource) ? rawSource : 'first_batch';
}

function validExistingAttribution(existing, now) {
  if (
    !existing
    || !Number.isFinite(existing.expiresAt)
    || existing.expiresAt <= now
    || !VALID_CHANNELS.has(existing.channel)
  ) {
    return undefined;
  }

  const result = { channel: existing.channel, expiresAt: existing.expiresAt };
  if (typeof existing.awc === 'string' && existing.awc) result.awc = existing.awc;
  return result;
}

function paidChannel(url) {
  const signals = [url.searchParams.get('utm_source'), url.searchParams.get('utm_medium')]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (signals.some((signal) => SEARCH_SIGNALS.has(signal))) return 'ppc';
  if (url.searchParams.has('ttclid') || signals.some((signal) => PAID_SOCIAL_SIGNALS.has(signal))) {
    return 'display';
  }
  if (signals.includes('email')) return 'email';
  return undefined;
}

export function resolveAwinAttribution({ href, existing, cookieAwc, now = Date.now() }) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return validExistingAttribution(existing, now) ?? {};
  }

  const retained = validExistingAttribution(existing, now);
  const urlAwc = url.searchParams.get('awc');
  const awc = urlAwc || retained?.awc || (!retained ? cookieAwc : undefined);
  const channel = paidChannel(url);

  if (channel) {
    return {
      ...(awc ? { awc } : {}),
      channel,
      expiresAt: now + ATTRIBUTION_TTL_MS,
    };
  }

  if (urlAwc || url.searchParams.get('source') === 'aw' || (!retained && cookieAwc)) {
    return {
      ...(awc ? { awc } : {}),
      channel: 'aw',
      expiresAt: now + ATTRIBUTION_TTL_MS,
    };
  }

  return retained ?? {};
}

function readStoredAttribution(storage) {
  try {
    const stored = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

function readAwcCookie(cookie) {
  return cookie.split(';').map((part) => part.trim()).reduce((awc, part) => {
    if (awc || !part.startsWith('awc=')) return awc;
    try {
      return decodeURIComponent(part.slice(4));
    } catch {
      return undefined;
    }
  }, undefined);
}

export function captureAwinAttribution() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return {};

  let storage;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  const attribution = resolveAwinAttribution({
    href: window.location.href,
    existing: readStoredAttribution(storage),
    cookieAwc: readAwcCookie(document.cookie),
  });

  try {
    if (attribution.channel || attribution.awc) {
      storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    } else {
      storage.removeItem(ATTRIBUTION_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }

  return attribution.channel || attribution.awc
    ? { ...(attribution.awc ? { awc: attribution.awc } : {}), ...(attribution.channel ? { channel: attribution.channel } : {}) }
    : {};
}

export function toAwinPaymentIntentMetadata(attribution = {}) {
  return {
    ...(typeof attribution.awc === 'string' && attribution.awc ? { awc: attribution.awc } : {}),
    ...(VALID_CHANNELS.has(attribution.channel) ? { awin_channel: attribution.channel } : {}),
  };
}
