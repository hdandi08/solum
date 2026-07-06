// Server-side dispatch-date logic, shared by the payment functions.
// Rule (locked 2026-07-06): order before noon on a working day -> next working
// day; at/after noon, or on a weekend -> second working day. Never a weekend.
// Mirrors web/src/lib/dispatch.js. We surface only the dispatch date, no arrival
// estimate (Royal Mail Tracked 48 is an aim, not a guarantee).
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

export function getDispatchDate(now = new Date()) {
  const beforeCutoff = !isWeekend(now) && now.getHours() < 12;
  return addWorkingDays(now, beforeCutoff ? 1 : 2);
}

// Estimated delivery: Tracked 48 aims for 2 working days after dispatch.
export function estDeliveryDate(dispatch) {
  return addWorkingDays(dispatch, 2);
}
