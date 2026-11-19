// Time-sensitive dates must be calculated in the shopper's browser, not baked
// into static HTML that may remain published for weeks.
export function deliverySummary(dispatch, arrival, live = typeof window !== 'undefined') {
  if (!live) return 'Royal Mail Tracked 48. Delivery dates shown at checkout.';
  const day = date => date.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
  return `Ships ${day(dispatch)} · Est. delivery ${day(arrival)}`;
}
