import { expect, it } from 'vitest';
import { deliverySummary } from './deliverySummary.js';
it('does not freeze delivery dates into static HTML', () => {
  const dispatch = new Date('2026-11-20T12:00:00Z');
  const arrival = new Date('2026-11-24T12:00:00Z');
  expect(deliverySummary(dispatch, arrival, false)).toBe('Royal Mail Tracked 48. Delivery dates shown at checkout.');
  expect(deliverySummary(dispatch, arrival, true)).toBe('Ships Fri 20 Nov · Est. delivery Tue 24 Nov');
});
