// Campaign context describes the landing page, never a customer's identity.
const KEY = 'solum_landing_experience';
const TTL_MS = 24 * 60 * 60 * 1000;
const GIFT_PROPERTIES = { landing_experience: 'christmas_gifting', gift_occasion: 'christmas' };
export const GIFT_CHECKOUT_PARAMS = { source: 'gift', experience: 'christmas_gifting' };
let memory;

export function getLandingExperience({
  pathname = globalThis.window?.location?.pathname,
  search = globalThis.window?.location?.search ?? '',
  storage,
  now = Date.now(),
} = {}) {
  if (storage === undefined) {
    try { storage = globalThis.sessionStorage; } catch { /* Use memory in restricted browsers. */ }
  }
  if (pathname === '/gift' || new URLSearchParams(search).get('experience') === 'christmas_gifting') {
    memory = { experience: 'christmas_gifting', expiresAt: now + TTL_MS };
    try { storage?.setItem(KEY, JSON.stringify(memory)); } catch { /* SPA navigation still works. */ }
  } else {
    try {
      const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
      if (saved) memory = saved;
    } catch { /* Keep the in-memory fallback. */ }
  }
  if (memory?.experience !== 'christmas_gifting' || !Number.isFinite(memory.expiresAt) || memory.expiresAt <= now) {
    memory = undefined;
    return {};
  }
  return { ...GIFT_PROPERTIES };
}
