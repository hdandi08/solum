import { describe, it, expect } from 'vitest';
import { getDispatchDate, estDeliveryDate } from './dispatch.js';

// Helper: format a Date as local YYYY-MM-DD for stable assertions.
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Reference week (local time):
//   Mon 2026-07-06, Tue 07, Wed 08, Thu 09, Fri 10, Sat 11, Sun 12, Mon 13, Tue 14
describe('getDispatchDate — 6 PM cutoff, next working day dispatch, no weekends', () => {
  it('before 6 PM on a weekday ships the next working day (Mon 9am -> Tue)', () => {
    expect(ymd(getDispatchDate(new Date(2026, 6, 6, 9, 0)))).toBe('2026-07-07');
  });

  it('before 6 PM on a weekday ships the next working day (Mon 5:59pm -> Tue)', () => {
    expect(ymd(getDispatchDate(new Date(2026, 6, 6, 17, 59)))).toBe('2026-07-07');
  });

  it('treats exactly 6 PM as after the cutoff (Mon 6pm -> Wed)', () => {
    expect(ymd(getDispatchDate(new Date(2026, 6, 6, 18, 0)))).toBe('2026-07-08');
  });

  it('skips the weekend when ordered before 6 PM on Friday (Fri 9am -> Mon)', () => {
    expect(ymd(getDispatchDate(new Date(2026, 6, 10, 9, 0)))).toBe('2026-07-13');
  });

  it('at/after 6 PM on Friday ships the following Tuesday (Fri 6pm -> Tue)', () => {
    expect(ymd(getDispatchDate(new Date(2026, 6, 10, 18, 0)))).toBe('2026-07-14');
  });

  it('weekend orders ship the following Tuesday (Sat -> Tue, Sun -> Tue)', () => {
    expect(ymd(getDispatchDate(new Date(2026, 6, 11, 10, 0)))).toBe('2026-07-14');
    expect(ymd(getDispatchDate(new Date(2026, 6, 12, 10, 0)))).toBe('2026-07-14');
  });

  it('never returns a weekend day', () => {
    for (let day = 6; day <= 12; day++) {
      const dow = getDispatchDate(new Date(2026, 6, day, 9, 0)).getDay();
      expect(dow).not.toBe(0);
      expect(dow).not.toBe(6);
    }
  });
});

describe('estDeliveryDate — dispatch + 2 working days (Tracked 48)', () => {
  it('Tue dispatch -> Thu', () => {
    expect(ymd(estDeliveryDate(new Date(2026, 6, 7)))).toBe('2026-07-09');
  });
  it('Fri dispatch skips the weekend -> Tue', () => {
    expect(ymd(estDeliveryDate(new Date(2026, 6, 10)))).toBe('2026-07-14');
  });
  it('Thu dispatch -> Mon', () => {
    expect(ymd(estDeliveryDate(new Date(2026, 6, 9)))).toBe('2026-07-13');
  });
  it('never returns a weekend day', () => {
    for (let day = 6; day <= 10; day++) {
      const dow = estDeliveryDate(new Date(2026, 6, day)).getDay();
      expect(dow).not.toBe(0);
      expect(dow).not.toBe(6);
    }
  });
});
