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

const IS_PROD = window.location.hostname.includes('bysolum');

function fbq(...args) {
  if (IS_PROD && window.fbq) window.fbq(...args);
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

export { posthog };
