import { capture, fbCustom, ttqTrack } from './analytics';
import { evaluateQualified } from './qualifiedVisit';

const SESSION_KEY = 'solum_qualified_fired';
const state = { productDetailViewed: false, offerReached: false, ritualVideoPct: 0, unboxingVideoPct: 0, scrollPct: 0, ritualSlugs: new Set(), startTs: Date.now() };
let fired = false;
let interval = null;
let started = false; // M1: guards against duplicate init (React StrictMode double-invoke)

// M2: module-scope reference so fire() can remove the listener
let onScroll = null;

function alreadyFired() {
  if (fired) return true;
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

function fire(reason) {
  fired = true;
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage unavailable — swallow */ }
  if (interval) { clearInterval(interval); interval = null; }
  // M2: detach scroll listener once the event has fired — no further updates needed
  if (onScroll) { window.removeEventListener('scroll', onScroll); onScroll = null; }
  const dwell_s = Math.round((Date.now() - state.startTs) / 1000);
  const props = { reason, dwell_s, scroll_pct: state.scrollPct };
  capture('QualifiedVisit', props);
  fbCustom('QualifiedVisit', { reason });
  ttqTrack('QualifiedVisit', { reason });
}

function evaluate() {
  if (alreadyFired()) return;
  const reason = evaluateQualified({ ...state, ritualVideosEngaged: state.ritualSlugs.size, dwellMs: Date.now() - state.startTs });
  if (reason) fire(reason);
}

export function markProductDetail() { state.productDetailViewed = true; evaluate(); }
export function markRitualProgress(pct) { if (pct > state.ritualVideoPct) state.ritualVideoPct = pct; evaluate(); }
export function markUnboxingProgress(pct) { if (pct > state.unboxingVideoPct) state.unboxingVideoPct = pct; evaluate(); }
export function markRitualEngaged(slug) { state.ritualSlugs.add(slug); evaluate(); }
export function markOfferReached() { state.offerReached = true; evaluate(); }

export function initQualifiedVisitTracker() {
  if (started) return; // M1: idempotent — skip duplicate calls from React StrictMode
  started = true;
  if (alreadyFired()) return;
  onScroll = () => {
    const pct = Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
    if (pct > state.scrollPct) state.scrollPct = pct;
    evaluate();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  // dwell check — re-evaluate every 5s so the scroll+dwell combo can trip without a scroll event
  interval = setInterval(evaluate, 5000);
}
