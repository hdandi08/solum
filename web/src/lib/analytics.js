import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

const AXON_ID = import.meta.env.VITE_AXON_PIXEL_ID;

function initAxon() {
  if (!AXON_ID) return;
  window.AXON_EVENT_KEY = AXON_ID;
  !function(e,r){var t=["https://s.axon.ai/pixel.js","https://res4.applovin.com/p/l/loader.iife.js"];if(!e.axon){var a=e.axon=function(){a.performOperation?a.performOperation.apply(a,arguments):a.operationQueue.push(arguments)};a.operationQueue=[],a.ts=Date.now(),a.eventKey=AXON_ID;for(var n=r.getElementsByTagName("script")[0],o=0;o<t.length;o++){var i=r.createElement("script");i.async=!0,i.src=t[o],n.parentNode.insertBefore(i,n)}}}(window,document);
  window.axon("init");
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
