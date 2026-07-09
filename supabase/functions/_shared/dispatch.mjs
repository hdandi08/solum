// Server-side dispatch-date logic, shared by the payment functions.
// Rule (updated 2026-07-09, was noon): order before 6 PM UK time on a working
// day -> next working day; at/after 6 PM, or on a weekend -> second working
// day. Never a weekend. Mirrors web/src/lib/dispatch.js. We surface only the
// dispatch date, no arrival estimate (Royal Mail Tracked 48 is an aim, not a
// guarantee).
//
// The server clock is UTC; the cutoff is UK wall time (BST in summer), so the
// default `now` converts to Europe/London first. Explicit `now` arguments are
// treated as UK wall time (tests rely on this).
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

// Estimated delivery: Tracked 48 aims for 2 working days after dispatch.
export function estDeliveryDate(dispatch) {
  return addWorkingDays(dispatch, 2);
}
