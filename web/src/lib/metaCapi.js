// Pure helpers for the Meta CAPI relay (kept side-effect-free for testing).

// Read a cookie value by name; null when absent.
export function readCookie(name, cookieString = document.cookie) {
  const m = cookieString.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// Meta's _fbc cookie only exists if the pixel loaded and saw an fbclid. When the
// pixel is blocked we derive fbc ourselves from the click id, per Meta's spec:
// fb.1.<creation_time_ms>.<fbclid>
export function deriveFbc(fbcCookie, fbclid, now = Date.now()) {
  if (fbcCookie) return fbcCookie;
  if (fbclid) return `fb.1.${now}.${fbclid}`;
  return null;
}

// Shared event id for pixel + CAPI dedup.
export function newEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
