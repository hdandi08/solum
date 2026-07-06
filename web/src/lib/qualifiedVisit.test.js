import { describe, it, expect } from 'vitest';
import { evaluateQualified } from './qualifiedVisit';

const base = { productDetailViewed: false, ritualVideoPct: 0, unboxingVideoPct: 0, scrollPct: 0, dwellMs: 0 };

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
  it('fires unboxing_50 when unboxing video >=50%', () => {
    expect(evaluateQualified({ ...base, unboxingVideoPct: 55 })).toBe('unboxing_50');
  });
  it('does NOT fire unboxing when <50%', () => {
    expect(evaluateQualified({ ...base, unboxingVideoPct: 40 })).toBe(null);
  });
  it('product_detail beats unboxing_50 when both set', () => {
    expect(evaluateQualified({ ...base, productDetailViewed: true, unboxingVideoPct: 55 })).toBe('product_detail');
  });
});

describe('ritual_multi', () => {
  it('qualifies when 3 distinct ritual videos are engaged', () => {
    expect(evaluateQualified({ ritualVideosEngaged: 3 })).toBe('ritual_multi');
  });
  it('does not qualify on 2 engaged videos (below the bar)', () => {
    expect(evaluateQualified({ ritualVideosEngaged: 2 })).toBeNull();
  });
  it('does not qualify on a single engaged video (via multi)', () => {
    expect(evaluateQualified({ ritualVideosEngaged: 1 })).toBeNull();
  });
  it('defaults ritualVideosEngaged to 0 when absent', () => {
    expect(evaluateQualified({})).toBeNull();
  });
  it('still prefers the immediate product_detail reason', () => {
    expect(evaluateQualified({ productDetailViewed: true, ritualVideosEngaged: 5 })).toBe('product_detail');
  });
});
