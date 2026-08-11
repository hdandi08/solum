const PROD_TRACKING_ORIGIN = 'https://track.bysolum.co.uk';
const DEV_TRACKING_ORIGIN = 'https://track-dev.bysolum.co.uk';

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

export async function resolveAwcToken(fetchImpl = fetch) {
  const response = await fetchImpl(`${trackingOrigin(location.hostname)}/awin/resolve`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) return undefined;

  const body = await response.json();
  return typeof body.token === 'string' ? body.token : undefined;
}
