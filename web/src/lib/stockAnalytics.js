import { capture } from './analytics.js';

// Stock analytics describe the journey, never copy a buyer form or an API error.
const allowed = {
  kit: ['ground', 'ritual'], from: ['ground', 'ritual'],
  checkout_flow: ['one_time', 'subscription'],
  stage: ['details', 'payment', 'express'],
  result: ['created', 'existing'],
  reason: ['request_failed', 'timeout', 'unavailable'],
};
export function captureStockEvent(event, properties = {}) {
  const hostname = globalThis.window?.location?.hostname || '';
  const environment = /^(www\.)?bysolum\.(com|co\.uk)\.?$/.test(hostname) ? 'production'
    : hostname === 'dev.d3pa095gzazg3c.amplifyapp.com' ? 'dev'
    : ['localhost', '127.0.0.1'].includes(hostname) ? 'local' : 'other';
  const safe = { environment, stock_tracking_version: 1 };
  for (const [key, values] of Object.entries(allowed)) {
    if (values.includes(properties[key])) safe[key] = properties[key];
  }
  if (typeof properties.details_shared === 'boolean') safe.details_shared = properties.details_shared;
  try { capture(event, safe); } catch { /* Analytics must never interrupt checkout. */ }
}
