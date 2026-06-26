import { describe, it, expect } from 'vitest';
import { evaluateQualified } from './qualifiedVisit';

const base = { productDetailViewed: false, ritualVideoPct: 0, scrollPct: 0, dwellMs: 0 };

describe('evaluateQualified', () => {
  it('returns null for a bouncer', () => {
    expect(evaluateQualified({ ...base, scrollPct: 10, dwellMs: 3000 })).toBe(null);
  });
  it('fires product_detail immediately', () => {
    expect(evaluateQualified({ ...base, productDetailViewed: true })).toBe('product_detail');
  });
  it('fires ritual_50 when ritual video >=50%', () => {
    expect(evaluateQualified({ ...base, ritualVideoPct: 55 })).toBe('ritual_50');
  });
  it('fires scroll_dwell when scroll>=50 AND dwell>=60s', () => {
    expect(evaluateQualified({ ...base, scrollPct: 60, dwellMs: 61000 })).toBe('scroll_dwell');
  });
  it('does NOT fire scroll>=50 but dwell<60s', () => {
    expect(evaluateQualified({ ...base, scrollPct: 60, dwellMs: 10000 })).toBe(null);
  });
  it('strong signal beats accumulated (product_detail wins)', () => {
    expect(evaluateQualified({ productDetailViewed: true, ritualVideoPct: 0, scrollPct: 60, dwellMs: 61000 })).toBe('product_detail');
  });
});
