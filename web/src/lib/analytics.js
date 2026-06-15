import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

export function initAnalytics() {
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: 'https://eu.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true, creditCard: true },
    },
    persistence: 'localStorage',
  });
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

function fbq(...args) {
  if (window.fbq) window.fbq(...args);
}

// eventId must be unique per lead — allows Meta to deduplicate if CAPI is ever added
export function fbLead(eventId, email) {
  const userData = email ? { em: email.trim().toLowerCase() } : {};
  fbq('track', 'Lead', userData, { eventID: eventId });
}

// Fires when someone lands on the /buy page and views kit options
export function fbViewContent(kitName) {
  fbq('track', 'ViewContent', { content_name: kitName, content_type: 'product' });
}

// Fires when user submits details and reaches the payment step
export function fbInitiateCheckout(kitName, value) {
  fbq('track', 'InitiateCheckout', {
    content_name: kitName,
    value,
    currency: 'GBP',
    num_items: 1,
  });
}

// Fires on SuccessPage — eventId is the Stripe PaymentIntent ID for deduplication
export function fbPurchase(kitName, value, eventId) {
  fbq('track', 'Purchase', { content_name: kitName, value, currency: 'GBP' }, { eventID: eventId });
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

export { posthog };
