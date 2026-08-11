const PROD_TRACKING_ORIGIN = 'https://track.bysolum.co.uk';
const DEV_TRACKING_ORIGIN = 'https://track-dev.bysolum.co.uk';
const RESOLVE_TIMEOUT_MS = 500;

export function trackingOrigin(hostname) {
  return /^(www\.)?bysolum\.co\.uk$/.test(hostname)
    ? PROD_TRACKING_ORIGIN
    : DEV_TRACKING_ORIGIN;
}

export async function storeAwcCookie(awc, fetchImpl = fetch) {
  if (typeof awc !== 'string') return false;
  const normalizedAwc = awc.trim();
  if (normalizedAwc.length < 1 || normalizedAwc.length > 500) return false;

  const response = await fetchImpl(`${trackingOrigin(location.hostname)}/awin/click`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awc: normalizedAwc }),
  });
  return response.ok;
}

export function createLandingAwcCapture(store = storeAwcCookie) {
  let started = false;
  return function captureLanding(search = location.search) {
    if (started) return false;
    started = true;

    const awc = new URLSearchParams(search).get('awc');
    if (awc === null) return false;
    void Promise.resolve().then(() => store(awc)).catch(() => {});
    return true;
  };
}

export const captureLandingAwc = createLandingAwcCapture();

export async function resolveAwcToken(fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${trackingOrigin(location.hostname)}/awin/resolve`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    });
    if (!response.ok) return undefined;

    const body = await response.json();
    return typeof body.token === 'string' ? body.token : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
