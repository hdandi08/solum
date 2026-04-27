import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

const AXON_ID = import.meta.env.VITE_AXON_PIXEL_ID;

function initAxon() {
  if (!AXON_ID) return;
  window.AXON_EVENT_KEY = AXON_ID;
  if (!window.axon) {
    const a = window.axon = function() {
      a.performOperation ? a.performOperation.apply(a, arguments) : a.operationQueue.push(arguments);
    };
    a.operationQueue = [];
    a.ts = Date.now();
    a.eventKey = AXON_ID;
    ["https://s.axon.ai/pixel.js", "https://res4.applovin.com/p/l/loader.iife.js"].forEach(src => {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      document.head.appendChild(s);
    });
  }
  window.axon("init");
  window.axon("event", "page_view");
}

export function axonEvent(name, props = {}) {
  if (window.axon) window.axon("event", name, props);
}

export function initAnalytics() {
  initAxon();
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

export { posthog };
