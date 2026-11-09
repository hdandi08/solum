import { describe, expect, it } from 'vitest';
import { routePreload } from '../../build/routePreload.js';

const chunk = (fileName, source, imports = [], extra = {}) => ({
  type: 'chunk', fileName, facadeModuleId: `/project/src/${source}`, imports, ...extra,
});

it('preloads only the landing route and its shared dependencies, including styles', () => {
  const bundle = {
    'home.js': chunk('home.js', 'pages/FullSite.jsx', ['shared.js']),
    'buy.js': chunk('buy.js', 'pages/BuyPage.jsx', ['shared.js', 'stripe.js'], { viteMetadata: { importedCss: new Set(['buy.css']) } }),
    'stripe.js': chunk('stripe.js', 'lib/stripe.js'),
    'shared.js': chunk('shared.js', 'shared.js', ['shared.js']),
    'account.js': chunk('account.js', 'pages/AccountPage.jsx'),
  };
  const [tag] = routePreload().transformIndexHtml.handler('', { bundle });
  expect(tag.injectTo).toBe('head');
  const routes = JSON.parse(tag.children.match(/const routes=(.*?);for/)[1]);
  expect(routes['/'].map(a => a.href)).toEqual(['/home.js', '/shared.js']);
  expect(routes['/full']).toEqual(routes['/']);
  expect(routes['/buy'].map(a => a.href)).toEqual(['/buy.js', '/buy.css', '/shared.js', '/stripe.js']);
  expect(Object.values(routes).flat().some(a => a.href === '/account.js')).toBe(false);
  expect(tag.children).toContain("link.crossOrigin='';document.head.appendChild(link)");
  expect(tag.children).toContain("if(location.pathname==='/buy')import(\"/stripe.js\")");
});

describe('landing build safety', () => {
  it('fails the build when landing chunks cannot be located', () => {
    expect(() => routePreload().transformIndexHtml.handler('', { bundle: {} })).toThrow('Missing landing page preload chunks');
  });
});
