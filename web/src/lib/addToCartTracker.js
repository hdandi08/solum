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

// Buy-CTA click that guarantees the AddToCart pixel event actually gets sent.
// A plain <a href> triggers a full-page reload which cancels TikTok's batched
// network send (Meta survives via image beacon). Doing a client-side (SPA) nav
// instead lets the pixel flush first. Modified clicks (cmd/ctrl/shift/middle)
// fall through to the browser's native open-in-new-tab.
export function buyClick(e, navigate, href, kitId) {
  trackAddToCart(kitId);
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  navigate(href);
}
