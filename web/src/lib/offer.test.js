import { describe, it, expect } from 'vitest';
import { DELIVERY_OFFER, offerActive, daysLeft } from './offer.js';

describe('DELIVERY_OFFER config', () => {
  it('has the locked launch values', () => {
    expect(DELIVERY_OFFER.value).toBe('£5.95');
    expect(DELIVERY_OFFER.valuePence).toBe(595);
    expect(DELIVERY_OFFER.endDate).toBe('2026-08-11');
  });
});

describe('offerActive', () => {
  it('is true on a day before the end date', () => {
    expect(offerActive(new Date('2026-08-01T12:00:00'))).toBe(true);
  });
  it('is true on the end date itself (before end of day)', () => {
    expect(offerActive(new Date('2026-08-11T12:00:00'))).toBe(true);
  });
  it('is false the day after the end date', () => {
    expect(offerActive(new Date('2026-08-12T00:00:00'))).toBe(false);
  });
});

describe('daysLeft', () => {
  it('counts whole days to end of the end date', () => {
    expect(daysLeft(new Date('2026-08-09T23:59:59'))).toBe(2);
  });
  it('floors at 0 once the date has passed', () => {
    expect(daysLeft(new Date('2026-08-12T00:00:00'))).toBe(0);
  });
});
