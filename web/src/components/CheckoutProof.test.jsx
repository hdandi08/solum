import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckoutProof from './CheckoutProof.jsx';

afterEach(() => vi.unstubAllGlobals());
function render(kitId) {
  vi.stubGlobal('React', React);
  return renderToStaticMarkup(React.createElement(CheckoutProof, { kitId }));
}

describe('checkout recognition', () => {
  it('ties the Esquire award explicitly to RITUAL on either kit checkout', () => {
    expect(render('ritual')).toContain('The Best Grooming Kit');
    expect(render('ritual')).toContain('Esquire Grooming Awards');
    expect(render('ground')).toContain('Esquire Grooming Awards');
    expect(render('ground')).toContain('RITUAL · Winner 2026');
  });
  it.each(['ground', 'ritual'])('links the published features for %s without large quotes', kit => {
    const markup = render(kit);
    expect(markup).toContain('Featured in');
    expect(markup).toContain('href="https://www.t3.com/home-living/grooming/5-essential-grooming-products-every-bearded-man-wants-for-christmas"');
    expect(markup).toContain('alt="T3"');
    expect(markup).toContain('alt="Luxury Lifestyle Magazine"');
    expect(markup).toContain('alt="Carl Thompson"');
    expect(markup).not.toContain('<blockquote');
  });
});
