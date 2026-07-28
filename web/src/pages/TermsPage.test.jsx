import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../components/Nav', () => ({ default: () => null }));
vi.mock('../components/SolumFooter', () => ({ default: () => null }));
vi.mock('../lib/scroll.js', () => ({ jumpTop: () => {} }));

let TermsPage;

beforeAll(async () => {
  globalThis.React = React;
  TermsPage = (await import('./TermsPage.jsx')).default;
});

describe('TermsPage delivery terms', () => {
  it('states the £5.95 standard delivery price consistently', () => {
    const page = renderToStaticMarkup(
      <MemoryRouter><TermsPage /></MemoryRouter>,
    );

    expect(page.match(/£5\.95 per box/g)).toHaveLength(2);
    expect(page).not.toContain('£3.85 per box');
  });
});
