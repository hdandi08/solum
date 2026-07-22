import posthog from 'posthog-js';
import { detectInAppBrowser } from './inAppBrowser';
import { readCookie, deriveFbc, newEventId } from './metaCapi.js';

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

export function initAnalytics() {
  if (!KEY) return;

  // Session continuity across an in-app-browser break-out: if we were reopened
  // in the system browser with a forwarded distinct_id, bootstrap PostHog with
  // it so this visit is the same person, not a new one.
  let bootstrap;
  try {
    const forwarded = new URLSearchParams(window.location.search).get('distinct_id');
    if (forwarded) bootstrap = { distinctID: forwarded };
  } catch { /* no-op */ }

  // Remove distinct_id from the address bar before posthog.init so the initial
  // $pageview does not record it in $current_url.
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('distinct_id')) {
      url.searchParams.delete('distinct_id');
      window.history.replaceState({}, '', url.toString());
    }
  } catch { /* no-op */ }

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: 'https://eu.posthog.com',
    autocapture: true,
    // 'history_change' captures the initial load AND SPA route changes. Plain
    // `true` only fires $pageview on hard loads, so client-side navigations to
    // /buy, /product/* etc. were never counted (Web Analytics undercounted them).
    capture_pageview: 'history_change',
    capture_pageleave: true,
    person_profiles: 'identified_only',
    // Surveys: none configured — skip the surveys.js fetch entirely.
    disable_surveys: true,
    // Recorder (52KB) stays off the first-paint path; started below at
    // window load or 4s, whichever comes first. Sessions shorter than that
    // get no replay (accepted trade-off, spec 2026-07-07).
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true, creditCard: true },
    },
    persistence: 'localStorage',
    ...(bootstrap ? { bootstrap } : {}),
  });

  // Tag every event with the in-app browser (Instagram/TikTok/etc.) so we can
  // segment sessions that can't show Apple Pay / Google Pay wallet buttons.
  // $browser can't distinguish these — the webview reports itself as Safari/Chrome.
  const iab = detectInAppBrowser();
  posthog.register({ in_app_browser: iab, is_in_app_browser: iab !== 'none' });

  // Start the session recorder off the critical path: window load or 4s,
  // whichever comes first (load can fire late on slow phones — it waits on
  // every image — and we still want a replay for any session worth watching).
  let recorderStarted = false;
  const startRecorder = () => {
    if (recorderStarted) return;
    recorderStarted = true;
    posthog.startSessionRecording();
  };
  window.addEventListener('load', startRecorder, { once: true });
  setTimeout(startRecorder, 4000);
}

export function capture(event, props = {}) {
  if (posthog.__loaded) {
    posthog.capture(event, props);
  }
}

// Call after a user signs in or is identified (checkout, account page)
export function identify(userId, traits = {}) {
  if (posthog.__loaded) {
    posthog.identify(userId, traits);
  }
}

const IS_PROD = /^(www\.)?bysolum\.(com|co\.uk)\.?$/.test(window.location.hostname);

function fbq(...args) {
  if (IS_PROD && window.fbq) window.fbq(...args);
}

// ─── Meta CAPI relay ─────────────────────────────────────────────────────────
// Mirrors AddToCart / InitiateCheckout / ViewContent server-side so Meta still
// receives them when iOS/ad-blockers kill the pixel. Pixel + relay share an
// eventID so Meta dedupes to the union. Purchase is relayed by stripe-webhook.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function sendMetaCapi(eventName, eventId, payload = {}) {
  if (!IS_PROD || !SUPABASE_URL) return;
  let fbclid = null;
  try { fbclid = new URLSearchParams(window.location.search).get('fbclid'); } catch { /* no-op */ }
  try {
    fetch(`${SUPABASE_URL}/functions/v1/meta-capi-relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        source_url: window.location.href,
        fbp: readCookie('_fbp') ?? undefined,
        fbc: deriveFbc(readCookie('_fbc'), fbclid) ?? undefined,
        ...payload,
      }),
      keepalive: true, // survives the SPA nav right after a kit CTA click
    }).catch(() => {});
  } catch { /* fire-and-forget — never break the UI for tracking */ }
}

// eventId must be unique per lead — allows Meta to deduplicate if CAPI is ever added
export function fbLead(eventId, email) {
  const userData = email ? { em: email.trim().toLowerCase() } : {};
  fbq('track', 'Lead', userData, { eventID: eventId });
}

// Fires when someone lands on the /buy page and views kit options.
// content_ids must match the Meta catalog item id (kit id: 'ground' | 'ritual').
export function fbViewContent(kitId) {
  const eventId = newEventId();
  fbq('track', 'ViewContent', { content_ids: [kitId], content_type: 'product', content_name: kitId }, { eventID: eventId });
  sendMetaCapi('ViewContent', eventId, { kit_id: kitId });
}

// Fires when a user clicks a kit Buy Now / select button (checkout begins)
export function fbAddToCart(kitId, kitName, value) {
  const eventId = newEventId();
  fbq('track', 'AddToCart', { content_name: kitName, content_ids: [kitId], content_type: 'product', value, currency: 'GBP' }, { eventID: eventId });
  sendMetaCapi('AddToCart', eventId, { kit_id: kitId, kit_name: kitName, value });
}

// Fires when user submits details and reaches the payment step.
// content_ids must match the Meta catalog item id (kit id: 'ground' | 'ritual').
// contact (email/phone, when the form has them) lifts CAPI match quality.
export function fbInitiateCheckout(kitId, value, contact = {}) {
  const eventId = newEventId();
  fbq('track', 'InitiateCheckout', {
    content_ids: [kitId],
    content_type: 'product',
    content_name: kitId,
    value,
    currency: 'GBP',
    num_items: 1,
  }, { eventID: eventId });
  sendMetaCapi('InitiateCheckout', eventId, {
    kit_id: kitId,
    value,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
  });
}

// Fires on SuccessPage — eventId is the Stripe PaymentIntent ID for deduplication.
// content_ids must match the Meta catalog item id (kit id: 'ground' | 'ritual').
export function fbPurchase(kitId, value, eventId) {
  fbq('track', 'Purchase', { content_ids: [kitId], content_type: 'product', content_name: kitId, value, currency: 'GBP' }, { eventID: eventId });
}

// Custom (non-standard) Meta event — e.g. QualifiedVisit
export function fbCustom(event, props = {}) {
  fbq('trackCustom', event, props);
}

// ─── Google Ads (gtag) helpers ───────────────────────────────────────────────

const GADS_ID = 'AW-18320153611';
// Conversion label from the Purchase conversion action's event snippet in
// Google Ads (the part after the slash in send_to). Empty = conversion send
// is disabled; the base tag still captures gclid site-wide.
const GADS_PURCHASE_LABEL = 'UOVYCN-U7c8cEIu43Z9E';

// Fires on SuccessPage — transactionId is the Stripe PaymentIntent ID (dedup).
// Email powers Enhanced Conversions (allow_enhanced_conversions is on in the
// base config; Google hashes the value client-side).
export function gadsPurchase(value, transactionId, email) {
  if (!IS_PROD || typeof window.gtag !== 'function' || !GADS_PURCHASE_LABEL) return;
  if (email) window.gtag('set', 'user_data', { email: email.trim().toLowerCase() });
  window.gtag('event', 'conversion', {
    send_to: `${GADS_ID}/${GADS_PURCHASE_LABEL}`,
    value,
    currency: 'GBP',
    transaction_id: transactionId,
  });
}

// ─── TikTok Pixel helpers ────────────────────────────────────────────────────

function ttq(method, ...args) {
  if (IS_PROD && window.ttq) window.ttq[method](...args);
}

// Call after we know the user's email (checkout delivery step, success page)
export function ttqIdentify(email) {
  if (IS_PROD && window.ttq) {
    window.ttq.identify({ email: email.trim().toLowerCase() });
  }
}

// User selects a kit card
export function ttqAddToCart(kitId, kitName, value) {
  ttq('track', 'AddToCart', { content_id: kitId, content_name: kitName, value, currency: 'GBP', content_type: 'product' });
}

// Payment form mounts — strong intent signal
export function ttqAddPaymentInfo(kitId, kitName, value) {
  ttq('track', 'AddPaymentInfo', { content_id: kitId, content_name: kitName, value, currency: 'GBP', content_type: 'product' });
}

// Pay button clicked — captures intent even if card is declined
export function ttqPlaceAnOrder(kitId, kitName, value, eventId) {
  ttq('track', 'PlaceAnOrder', { content_id: kitId, content_name: kitName, value, currency: 'GBP', content_type: 'product' }, { event_id: eventId });
}

// Kit page views (/buy, /checkout)
export function ttqViewContent(kitId, kitName, value) {
  ttq('track', 'ViewContent', { content_id: kitId, content_name: kitName, value, currency: 'GBP', content_type: 'product' });
}

// User reaches payment step
export function ttqInitiateCheckout(kitId, kitName, value) {
  ttq('track', 'InitiateCheckout', { content_id: kitId, content_name: kitName, value, currency: 'GBP', content_type: 'product' });
}

// Payment confirmed — event_id ties this to the server-side Events API call for deduplication
export function ttqCompletePayment(kitId, kitName, value, eventId) {
  ttq('track', 'CompletePayment', { content_id: kitId, content_name: kitName, value, currency: 'GBP', content_type: 'product' }, { event_id: eventId });
}

// Custom TikTok event — e.g. QualifiedVisit
export function ttqTrack(event, props = {}) {
  ttq('track', event, props);
}

// TikTok match signals for server-side Events API (CAPI):
//  - ttclid: click id from the ad URL (?ttclid=). Persisted so it survives the
//    navigation from landing page to checkout.
//  - ttp: first-party cookie set by the TikTok pixel.
// Returns undefined for absent values so they drop cleanly from JSON payloads.
export function getTikTokIds() {
  let ttclid;
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('ttclid');
    if (fromUrl) localStorage.setItem('ttclid', fromUrl);
    ttclid = fromUrl || localStorage.getItem('ttclid') || undefined;
  } catch { /* ignore */ }
  return { ttclid, ttp: readCookie('_ttp') || undefined };
}

// ─── Awin (affiliate network) ────────────────────────────────────────────────

const AWIN_MERCHANT = '129171';

// Awin affiliate click ref: ?awc= on the landing URL (persisted so it survives
// the journey to checkout), falling back to the first-party awc cookie set by
// the MasterTag. Threaded into Stripe metadata so the webhook can fire Awin's
// server-to-server conversion (cks param) — reliable even when the browser
// conversion pixel is blocked.
export function getAwc() {
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('awc');
    if (fromUrl) localStorage.setItem('awc', fromUrl);
    return fromUrl || localStorage.getItem('awc') || readCookie('awc') || undefined;
  } catch { return undefined; }
}

// Fires the Awin sale conversion on SuccessPage. Sets the Sale object then
// (re)loads the Awin tag on this route so it registers the transaction: the
// MasterTag in index.html loads before React sets the sale and does not reload
// on SPA route changes, so we append a fresh tag instance here once the sale
// object exists. Awin dedupes repeat fires by orderRef. Live domain only, so
// dev/test purchases never register a commissionable sale.
export function awinConversion(amountGbp, orderRef, voucher = '') {
  if (!IS_PROD || !amountGbp || !orderRef) return;
  const amount = Number(amountGbp).toFixed(2); // order subtotal = total transaction amount
  const ref = String(orderRef);
  const parts = `DEFAULT:${amount}`;           // full amount commissionable at the flat 10% group

  // Conversion tag (mandatory): set the sale object, then (re)load the Awin tag
  // on this route so it registers — the MasterTag loads before React sets the
  // sale and does not reload on SPA route changes.
  window.AWIN = window.AWIN || {};
  window.AWIN.Tracking = window.AWIN.Tracking || {};
  window.AWIN.Tracking.Sale = {
    amount,
    channel: 'aw',
    orderRef: ref,
    parts,
    currency: 'GBP',
    voucher: voucher || '',
    test: '0',
  };
  const s = document.createElement('script');
  s.defer = true;
  s.src = `https://www.dwin1.com/${AWIN_MERCHANT}.js`;
  document.body.appendChild(s);

  // Fallback conversion pixel (mandatory): registers the sale even if the JS
  // tag fails to load. Awin dedupes it against the tag by orderRef.
  const p = new URLSearchParams({
    tt: 'ns', tv: '2', merchant: AWIN_MERCHANT,
    amount, cr: 'GBP', ref, parts, vc: voucher || '', ch: 'aw',
  });
  const img = new Image();
  img.src = `https://www.awin1.com/sread.img?${p.toString()}`;
}

export { posthog };
