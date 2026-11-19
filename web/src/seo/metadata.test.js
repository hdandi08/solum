import { describe, expect, it } from 'vitest';
import { PUBLIC_PATHS, getPageSeo, renderSeoHead } from './metadata.js';

const graphOf = path => getPageSeo(path).structuredData['@graph'];

describe('route discovery metadata', () => {
  it('includes active products and published guides while excluding private and future pages', () => {
    expect(PUBLIC_PATHS).toEqual(expect.arrayContaining([
      '/', '/gift', '/buy', '/ritual', '/guide', '/awards', '/contact', '/terms', '/privacy',
      '/guide/mens-body-care-routine', '/product/08-cleansing-cloth', '/product/11-clay-mixing-bowl',
    ]));
    expect(new Set(PUBLIC_PATHS).size).toBe(PUBLIC_PATHS.length);
    expect(PUBLIC_PATHS).not.toContain('/checkout');
    expect(PUBLIC_PATHS).not.toContain('/product/09-turkish-kese-mitt');
    for (const path of PUBLIC_PATHS) {
      const page = getPageSeo(path);
      expect(page.canonical).toBe(`https://bysolum.co.uk${path === '/' ? '/' : path}`);
      expect(page.robots).toContain('index, follow');
      expect(page.title).toBeTruthy();
      expect(page.description).toBeTruthy();
    }
  });

  it('resets every field to the homepage after a product, article, gift or private route', () => {
    for (const path of ['/product/06-argan-oil', '/guide/rhassoul-clay-men', '/gift', '/account']) {
      getPageSeo(path);
      const home = getPageSeo('/');
      expect(home.canonical).toBe('https://bysolum.co.uk/');
      expect(home.title).toContain("Men's Body Care");
      expect(home.type).toBe('website');
      expect(home.image).toBe('https://bysolum.co.uk/og-image-2026-11.jpg');
      expect(home.robots).not.toContain('noindex');
    }
    expect(getPageSeo('/full').canonical).toBe('https://bysolum.co.uk/');
    expect(getPageSeo('/gift/?utm_source=meta').canonical).toBe('https://bysolum.co.uk/gift');
  });

  it.each(['/checkout', '/success', '/confirm', '/account', '/email-preview', '/unknown', '/guide/missing', '/product/09-turkish-kese-mitt'])(
    'prevents indexing of %s without inheriting the homepage canonical', path => {
      const page = getPageSeo(path);
      expect(page.robots).toContain('noindex');
      expect(page.canonical).toBe(`https://bysolum.co.uk${path}`);
      expect(page.title).not.toContain('Award');
    },
  );

  it('scopes the Esquire award to RITUAL and cites its source', () => {
    const products = graphOf('/buy').filter(entity => entity['@type'] === 'Product');
    const ritual = products.find(entity => entity.name.includes('RITUAL'));
    const ground = products.find(entity => entity.name.includes('GROUND'));
    expect(ritual.award).toBe('Best Grooming Kit, Esquire Grooming Awards 2026');
    expect(ritual.subjectOf.url).toBe('https://www.esquire.com/uk/style/grooming/g74246520/esquire-grooming-awards-2026/');
    expect(ritual.offers).toMatchObject({ price: 85, priceCurrency: 'GBP' });
    expect(ground.offers).toMatchObject({ price: 65, priceCurrency: 'GBP' });
    expect(ground).not.toHaveProperty('award');
    expect(ritual.offers).not.toHaveProperty('availability');
    expect(graphOf('/buy').find(entity => entity['@type'] === 'Organization')).not.toHaveProperty('award');
    expect(getPageSeo('/awards').description).toContain('RITUAL');
    expect(getPageSeo('/awards').description).toContain('Best Grooming Kit');
  });

  it('identifies standalone products without treating their indicative worth as an offer or an award', () => {
    const page = getPageSeo('/product/07-body-lotion');
    const product = page.structuredData['@graph'].find(entity => entity['@type'] === 'Product');
    expect(product.name).toBe('SOLUM Daily Restore Body Lotion 200ml');
    expect(product.url).toBe('https://bysolum.co.uk/product/07-body-lotion');
    expect(product.image).toContain('https://bysolum.co.uk/products/07/still.webp');
    expect(product).not.toHaveProperty('offers');
    expect(product).not.toHaveProperty('aggregateRating');
    expect(product).not.toHaveProperty('award');
    expect(page.description).toContain('kit');
  });

  it('publishes article identity and linked breadcrumbs without invented dates or site search', () => {
    const page = getPageSeo('/guide/scalp-massager-men');
    expect(page.type).toBe('article');
    const graph = page.structuredData['@graph'];
    const article = graph.find(entity => entity['@type'] === 'Article');
    expect(article.headline).toBe('What Does a Scalp Massager Actually Do?');
    expect(article).not.toHaveProperty('datePublished');
    expect(article).not.toHaveProperty('dateModified');
    expect(graph.find(entity => entity['@type'] === 'BreadcrumbList').itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bysolum.co.uk/' },
      { '@type': 'ListItem', position: 2, name: 'Guide', item: 'https://bysolum.co.uk/guide' },
      { '@type': 'ListItem', position: 3, name: 'What Does a Scalp Massager Actually Do?', item: 'https://bysolum.co.uk/guide/scalp-massager-men' },
    ]);
    expect(JSON.stringify(graph)).not.toContain('SearchAction');
  });
});

describe('static head rendering', () => {
  it('renders route-specific canonical, robots, social cards and one parseable schema graph', () => {
    const html = renderSeoHead(getPageSeo('/guide/scalp-massager-men'));
    expect(html).toContain('<link rel="canonical" href="https://bysolum.co.uk/guide/scalp-massager-men"');
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('name="twitter:title"');
    expect(html).toContain('name="robots" content="index, follow');
    expect(html.match(/type="application\/ld\+json"/g)).toHaveLength(1);
    const schema = JSON.parse(html.match(/<script[^>]*id="solum-page-schema"[^>]*>([\s\S]*?)<\/script>/)[1]);
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('escapes page text and JSON-LD so hostile values cannot close tags or scripts', () => {
    const html = renderSeoHead({
      ...getPageSeo('/'),
      title: 'A < B & "C"',
      description: '"><script>alert(1)</script>',
      structuredData: { name: '</script><script>alert(1)</script>' },
    });
    expect(html).toContain('<title>A &lt; B &amp; &quot;C&quot;</title>');
    expect(html).not.toContain('<script>alert(1)');
    expect(html.match(/<script\b/g)).toHaveLength(1);
    const schema = JSON.parse(html.match(/id="solum-page-schema"[^>]*>([\s\S]*?)<\/script>/)[1]);
    expect(schema.name).toBe('</script><script>alert(1)</script>');
  });
});
