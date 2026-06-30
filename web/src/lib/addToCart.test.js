import { describe, it, expect } from 'vitest';
import { resolveAddToCart } from './addToCart';

describe('resolveAddToCart', () => {
  it('resolves ground to its name + first-box price', () => {
    expect(resolveAddToCart('ground')).toEqual({ kitId: 'ground', kitName: 'GROUND', value: 65 });
  });
  it('resolves ritual to its name + first-box price', () => {
    expect(resolveAddToCart('ritual')).toEqual({ kitId: 'ritual', kitName: 'RITUAL', value: 85 });
  });
  it('returns null for an unknown kit id', () => {
    expect(resolveAddToCart('nope')).toBe(null);
  });
  it('returns null for a coming-soon kit (sovereign)', () => {
    expect(resolveAddToCart('sovereign')).toBe(null);
  });
  it('returns null for an undefined id', () => {
    expect(resolveAddToCart(undefined)).toBe(null);
  });
});
