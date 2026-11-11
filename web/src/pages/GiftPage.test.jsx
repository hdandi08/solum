import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import GiftPage from './GiftPage.jsx';
import FAQ from '../components/FAQ.jsx';
import KitComparison from '../components/KitComparison.jsx';
import { KITS } from '../data/kits.js';

vi.mock('../lib/analytics.js', () => ({ capture: () => {}, fbCustom: () => {}, ttqTrack: () => {}, fbAddToCart: () => {}, ttqAddToCart: () => {} }));

await vi.hoisted(async () => { globalThis.React = (await import('react')).default; });
const render = (node) => renderToStaticMarkup(<MemoryRouter initialEntries={['/gift']}>{node}</MemoryRouter>);

describe('gifting landing', () => {
  it('shows real kit imagery and current prices with both one-time checkout destinations', () => {
    const html = render(<GiftPage />);
    expect(html).toContain('This Christmas.');
    expect(html.indexOf('Esquire Grooming Awards')).toBeLessThan(html.indexOf('<h1'));
    expect(html.indexOf('alt="Luxury Lifestyle Magazine"')).toBeGreaterThan(html.indexOf('</h1>'));
    expect(html).toContain('A complete men’s body care system.');
    expect(html).toContain('View the SOLUM box');
    for (const name of ['T3', 'Luxury Lifestyle Magazine', 'Carl Thompson']) expect(html).toContain(`alt="${name}"`);
    expect(html).toContain('Read the feature');
    expect(html).toContain('/products/kit/box-open.webp');
    expect(html).toContain('No subscription');
    for (const id of ['ritual', 'ground']) {
      const kit = KITS.find(k => k.id === id);
      expect(html).toContain(`data-buy-cta="/buy?source=gift&amp;experience=christmas_gifting&amp;kit=${id}"`);
      expect(html).toContain(`Gift ${kit.name} · £${kit.firstBoxPrice}`);
    }
    expect(html).not.toContain('generated_images');
    expect(html).not.toContain('SOVEREIGN');
  });
  it('explains why and previews his ritual before the kit decision', () => {
    const html = render(<GiftPage />);
    expect(html).toContain('Why give him SOLUM?');
    expect(html).toContain('See what he’ll actually use.');
    const why = html.indexOf('id="what"');
    const ritual = html.indexOf('id="ritual"');
    const kits = html.indexOf('id="kits"');
    expect(why).toBeGreaterThan(-1);
    expect(ritual).toBeGreaterThan(why);
    expect(kits).toBeGreaterThan(ritual);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Daily Ritual videos');
    expect(html).not.toContain('Weekly Ritual videos');
  });
  it('uses gift FAQs while keeping shared homepage defaults', () => {
    expect(render(<GiftPage />)).toContain('Will he know how to use it?');
    expect(render(<FAQ />)).toContain('Is it complicated to use?');
    expect(render(<KitComparison />)).toContain('GROUND or RITUAL.');
    expect(render(<KitComparison />)).toContain('Buy RITUAL · £85');
  });
});
