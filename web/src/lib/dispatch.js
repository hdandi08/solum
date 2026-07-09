// Dispatch-date logic for the one-time checkout.
//
// Rule (updated 2026-07-09, was noon): order before 6 PM UK time on a working
// day -> ships the next working day; at/after 6 PM, or on a weekend -> ships
// the second working day. Weekends (Sat/Sun) are never a dispatch day. We
// surface only the DISPATCH date, never an arrival estimate (Royal Mail
// Tracked 48 is an aim, not a guarantee). Mirrors
// supabase/functions/_shared/dispatch.mjs — keep the two in sync.
//
// The cutoff is UK wall time regardless of the visitor's clock, so defaults
// convert to Europe/London. Explicit `now` arguments are treated as UK wall
// time (tests rely on this).
function ukNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function addWorkingDays(from, n) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  let steps = n;
  while (steps > 0) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) steps -= 1;
  }
  return d;
}

export function getDispatchDate(now = ukNow()) {
  const beforeCutoff = !isWeekend(now) && now.getHours() < 18;
  return addWorkingDays(now, beforeCutoff ? 1 : 2);
}

// Estimated delivery: Royal Mail Tracked 48 aims for 2 working days after
// dispatch. An estimate, shown labelled "Est. delivery", never guaranteed.
export function estDeliveryDate(dispatch) {
  return addWorkingDays(dispatch, 2);
}

// Next order cutoff (working-day 6 PM UK). Any order placed before this moment
// gets the same dispatch date as an order placed now — which is what makes a
// "order within Xh Ym → ships {day}" countdown honest at every second.
export function nextDispatchCutoff(now = ukNow()) {
  const d = new Date(now);
  if (!isWeekend(d) && d.getHours() < 18) {
    d.setHours(18, 0, 0, 0);
    return d;
  }
  do { d.setDate(d.getDate() + 1); } while (isWeekend(d));
  d.setHours(18, 0, 0, 0);
  return d;
}
