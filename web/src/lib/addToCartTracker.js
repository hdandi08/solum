import { capture, fbAddToCart, ttqAddToCart } from './analytics';
import { resolveAddToCart } from './addToCart';

// Fires AddToCart (PostHog + Meta + TikTok) for an EXPLICIT kit button click.
// Dedup: at most once per kit per session. NEVER call from a page-load effect.
export function trackAddToCart(kitId) {
  const payload = resolveAddToCart(kitId);
  if (!payload) return false;
  const key = `solum_atc_fired_${payload.kitId}`;
  try { if (sessionStorage.getItem(key) === '1') return false; } catch { /* storage unavailable */ }
  try { sessionStorage.setItem(key, '1'); } catch { /* swallow */ }
  capture('add_to_cart', { kit_id: payload.kitId, kit_name: payload.kitName, value: payload.value });
  fbAddToCart(payload.kitId, payload.kitName, payload.value);
  ttqAddToCart(payload.kitId, payload.kitName, payload.value);
  return true;
}
