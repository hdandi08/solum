// Dispatch-date logic for the one-time checkout.
//
// Rule (locked 2026-07-06): order before noon on a working day -> ships the next
// working day; at/after noon, or on a weekend -> ships the second working day.
// Weekends (Sat/Sun) are never a dispatch day. This replaces the old
// Monday/Thursday batching. We surface only the DISPATCH date, never an arrival
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

// Estimated delivery: Royal Mail Tracked 48 aims for 2 working days after
// dispatch. An estimate, shown labelled "Est. delivery", never guaranteed.
export function estDeliveryDate(dispatch) {
  return addWorkingDays(dispatch, 2);
}
