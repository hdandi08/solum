import { describe, expect, it } from 'vitest';
import { assembleDocument, collectCss, pageSource } from '../../build/prerender.js';

const template = '<html><head><!-- solum-seo:start --><title>Old</title><!-- solum-seo:end --></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
describe('public HTML generation', () => {
  it('puts real page content and correct head into the shell without removing the client app', () => {
    const html = assembleDocument(template, { head: '<title>Award winner</title>', body: '<h1>SOLUM RITUAL</h1><p>Costs $85</p>', styles: ['assets/main.css', 'assets/main.css'] });
    expect(html).toContain('<title>Award winner</title>');
    expect(html).not.toContain('<title>Old</title>');
    expect(html).toContain('<div id="root"><h1>SOLUM RITUAL</h1><p>Costs $85</p></div>');
    expect(html).toContain('<script src="/app.js">');
    expect(html.match(/rel="stylesheet"/g)).toHaveLength(1);
  });
  it('fails rather than silently publishing blank pages when a template changes', () => {
    expect(() => assembleDocument('<html></html>', { head: '' })).toThrow('SEO template markers');
    expect(() => assembleDocument(template.replace('<div id="root"></div>', ''), { head: '' })).toThrow('empty app root');
  });
  it('includes route and shared CSS without downloading unrelated route CSS', () => {
    const manifest = {
      'src/main.jsx': { isEntry: true, css: ['main.css'] },
      'src/pages/FullSite.jsx': { css: ['home.css'], imports: ['shared'] },
      shared: { css: ['shared.css'] },
      'src/pages/BuyPage.jsx': { css: ['checkout.css'] },
    };
    expect(collectCss(manifest, 'src/pages/FullSite.jsx')).toEqual(['main.css', 'home.css', 'shared.css']);
    expect(() => collectCss(manifest, 'missing')).toThrow('Missing built page');
  });
  it('uses the real component for detail routes and rejects unknown public routes', () => {
    expect(pageSource('/product/08-cleansing-cloth')).toBe('src/pages/ProductPage.jsx');
    expect(pageSource('/guide/mens-shower-routine')).toBe('src/pages/GuideArticle.jsx');
    expect(() => pageSource('/account')).toThrow('No public renderer');
  });
});
