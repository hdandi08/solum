import { describe, it, expect } from 'vitest';
import { PRODUCTS } from './products.js';

const OUTCOME_FIELDS = ['headline', 'headlineAccent', 'stat', 'statMeaning', 'now', 'after', 'tileNow', 'tileAfter', 'tileStatMeaning'];

// Active sellable products; the mixing bowl (11) is an accessory and gets no outcome story.
const withOutcome = PRODUCTS.filter((p) => !p.comingSoon && p.num !== '11');
const noOutcome = PRODUCTS.filter((p) => p.comingSoon || p.num === '11');

const copyStrings = (p) => [
  p.name, p.tagline, p.desc, p.tag, p.lifespan,
  ...(p.highlights || []), ...(p.benefits || []),
  ...Object.values(p.outcome || {}),
].filter(Boolean);

describe('product outcome data', () => {
  it('every active product has a complete outcome object', () => {
    expect(withOutcome.length).toBe(8);
    for (const p of withOutcome) {
      expect(p.outcome, `product ${p.num} missing outcome`).toBeTruthy();
      for (const f of OUTCOME_FIELDS) {
        expect(typeof p.outcome[f], `product ${p.num} outcome.${f}`).toBe('string');
        expect(p.outcome[f].length, `product ${p.num} outcome.${f} empty`).toBeGreaterThan(0);
      }
    }
  });

  it('coming-soon products and the mixing bowl have no outcome object', () => {
    for (const p of noOutcome) {
      expect(p.outcome, `product ${p.num} should not have outcome`).toBeUndefined();
    }
  });
});

describe('copy rules', () => {
  it('no em dashes, en dashes, or double hyphens in any copy string', () => {
    for (const p of PRODUCTS) {
      for (const s of copyStrings(p)) {
        expect(s, `product ${p.num}: "${s}"`).not.toMatch(/—|–|--/);
      }
    }
  });

  it('the word "tool" never appears in customer copy', () => {
    for (const p of PRODUCTS) {
      for (const s of copyStrings(p)) {
        expect(s.toLowerCase(), `product ${p.num}: "${s}"`).not.toMatch(/\btools?\b/);
      }
    }
  });
});
