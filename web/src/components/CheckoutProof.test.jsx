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
  it('shows the Esquire award only for the winning RITUAL kit', () => {
    expect(render('ritual')).toContain('The Best Grooming Kit');
    expect(render('ritual')).toContain('Esquire Grooming Awards');
    expect(render('ground')).not.toContain('Esquire');
  });
  it.each(['ground', 'ritual'])('links the published features for %s without large quotes', kit => {
    const markup = render(kit);
    expect(markup).toContain('Featured in');
    expect(markup).toContain('href="https://www.t3.com/home-living/grooming/5-essential-grooming-products-every-bearded-man-wants-for-christmas"');
    expect(markup).toContain('Luxury Lifestyle Magazine');
    expect(markup).toContain('Carl Thompson');
    expect(markup).not.toContain('<blockquote');
  });
});
