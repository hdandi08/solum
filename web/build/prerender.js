// Pure document assembly shared by the build and its tests.
export const SEO_START = '<!-- solum-seo:start -->';
export const SEO_END = '<!-- solum-seo:end -->';

export function assembleDocument(template, { head, body = '', styles = [] }) {
  if (!template.includes(SEO_START) || !template.includes(SEO_END)) throw new Error('Missing SEO template markers');
  if (!template.includes('<div id="root"></div>')) throw new Error('Missing empty app root');
  const stylesheetLinks = [...new Set(styles)].map(href => `<link rel="stylesheet" href="/${href}" />`).join('\n');
  return template.replace(/<!-- solum-seo:start -->[\s\S]*?<!-- solum-seo:end -->/, `${SEO_START}\n${head}\n${SEO_END}`)
    .replace('</head>', `${stylesheetLinks}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
}

export function collectCss(manifest, pageSource) {
  if (!manifest[pageSource]) throw new Error(`Missing built page: ${pageSource}`);
  const css = new Set();
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing manifest dependency: ${key}`);
    for (const file of chunk.css || []) css.add(file);
    for (const imported of chunk.imports || []) visit(imported);
  }
  for (const [key, value] of Object.entries(manifest)) if (value.isEntry) visit(key);
  visit(pageSource);
  return [...css];
}

export function pageSource(pathname) {
  if (pathname.startsWith('/guide/')) return 'src/pages/GuideArticle.jsx';
  if (pathname.startsWith('/product/')) return 'src/pages/ProductPage.jsx';
  const pages = { '/': 'FullSite', '/buy': 'BuyPage', '/gift': 'GiftPage', '/ritual': 'RitualPage', '/guide': 'GuidePage', '/awards': 'AwardsPage', '/contact': 'ContactPage', '/terms': 'TermsPage', '/privacy': 'PrivacyPage' };
  if (!pages[pathname]) throw new Error(`No public renderer for ${pathname}`);
  return `src/pages/${pages[pathname]}.jsx`;
}
