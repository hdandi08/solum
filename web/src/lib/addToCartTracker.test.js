import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buyClick } from './addToCartTracker.js';
import { capture, fbAddToCart, ttqAddToCart } from './analytics';

vi.mock('./analytics', () => ({ capture: vi.fn(), fbAddToCart: vi.fn(), ttqAddToCart: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe('on-site checkout navigation', () => {
  it('marks an explicit kit click without changing its URL or attribution', () => {
    const event = { button: 0, preventDefault: vi.fn() };
    const navigate = vi.fn();
    const href = '/buy?source=gift&experience=christmas_gifting&kit=ground';
    buyClick(event, navigate, href, 'ground');
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(href, { state: { checkoutEntry: 'site' } });
    expect(capture).toHaveBeenCalledWith('add_to_cart', expect.objectContaining({ kit_id: 'ground' }));
    expect(fbAddToCart).toHaveBeenCalledOnce();
    expect(ttqAddToCart).toHaveBeenCalledOnce();
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }])('preserves native new-tab behaviour for %j', modifier => {
    const event = { button: 0, preventDefault: vi.fn(), ...modifier };
    const navigate = vi.fn();
    buyClick(event, navigate, '/buy?kit=ritual', 'ritual');
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
