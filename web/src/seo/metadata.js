import { ARTICLES } from '../data/guide.js';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

export const SITE_ORIGIN = 'https://bysolum.co.uk';
export const ESQUIRE_AWARD_URL = 'https://www.esquire.com/uk/style/grooming/g74246520/esquire-grooming-awards-2026/';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-image-2026-11.jpg`;
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, nofollow';
const ACTIVE_PRODUCTS = PRODUCTS.filter(product => !product.comingSoon);
const CURRENT_KITS = KITS.filter(kit => !kit.hidden && !kit.comingSoon);
const GROUND = CURRENT_KITS.find(kit => kit.id === 'ground');
const RITUAL = CURRENT_KITS.find(kit => kit.id === 'ritual');
const ORGANIZATION_ID = `${SITE_ORIGIN}/#org`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

export const PUBLIC_PATHS = [
  '/', '/gift', '/buy', '/ritual', '/guide', '/awards', '/contact', '/terms', '/privacy',
  ...ARTICLES.map(article => `/guide/${article.slug}`),
  ...ACTIVE_PRODUCTS.map(product => `/product/${product.slug}`),
];

const absolute = path => `${SITE_ORIGIN}${path}`;
const productId = product => `${absolute(`/product/${product.slug}`)}#product`;

function organizationGraph() {
  return [
    {
      '@type': 'Organization', '@id': ORGANIZATION_ID,
      name: 'SOLUM', url: `${SITE_ORIGIN}/`,
      logo: { '@type': 'ImageObject', url: absolute('/brand/solum-logo.png'), width: 2000, height: 2000 },
      description: "SOLUM is a UK men's body care brand bringing products, essentials and step-by-step daily and weekly rituals together in complete kits.",
      founder: { '@type': 'Person', name: 'Harsha Dandi' },
      address: { '@type': 'PostalAddress', addressCountry: 'GB' },
      sameAs: ['https://www.instagram.com/bysolum.body'],
    },
    {
      '@type': 'WebSite', '@id': WEBSITE_ID,
      url: `${SITE_ORIGIN}/`, name: 'SOLUM', inLanguage: 'en-GB',
      publisher: { '@id': ORGANIZATION_ID },
    },
  ];
}

function productEntity(product) {
  return {
    '@type': 'Product', '@id': productId(product),
    name: `SOLUM ${product.fullName || product.name}`.replace(/^SOLUM SOLUM /, 'SOLUM '),
    url: absolute(`/product/${product.slug}`),
    description: `${product.desc} Available as part of a SOLUM kit; not sold separately.`,
    image: [product.media?.still, ...(product.media?.gallery || [])].filter(Boolean).map(absolute),
    brand: { '@id': ORGANIZATION_ID },
    category: "Men's body care",
  };
}

function kitEntity(kit, includeOffer = true) {
  return {
    '@type': 'Product', '@id': `${SITE_ORIGIN}/#kit-${kit.id}`,
    name: `SOLUM ${kit.name} Men's Body Care Kit`,
    url: absolute(`/buy?kit=${kit.id}`),
    description: kit.chooser,
    image: (kit.gallery || [kit.image]).filter(Boolean).map(absolute),
    brand: { '@id': ORGANIZATION_ID },
    category: "Men's body care kit",
    isRelatedTo: kit.productNums.map(num => ACTIVE_PRODUCTS.find(product => product.num === num)).filter(Boolean).map(product => ({ '@id': productId(product) })),
    ...(includeOffer && {
      offers: {
        '@type': 'Offer', url: absolute(`/buy?kit=${kit.id}`),
        priceCurrency: 'GBP', price: kit.firstBoxPrice,
        seller: { '@id': ORGANIZATION_ID },
      },
    }),
    ...(kit.id === 'ritual' && {
      award: 'Best Grooming Kit, Esquire Grooming Awards 2026',
      subjectOf: { '@type': 'WebPage', name: 'Esquire Grooming Awards 2026', url: ESQUIRE_AWARD_URL },
    }),
  };
}

function breadcrumbs(canonical, items) {
  return {
    '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`,
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: absolute(path),
    })),
  };
}

const BASE_PAGES = {
  '/': {
    title: "SOLUM | Men's Body Care Kits | Esquire Award-Winning RITUAL",
    description: "Men's body care, built into daily and weekly rituals. Discover SOLUM RITUAL, winner of Best Grooming Kit at the Esquire Grooming Awards 2026, and GROUND.",
  },
  '/gift': {
    title: 'Christmas Gifts for Him | SOLUM Body Care Kits',
    description: `Give him a complete body care ritual this Christmas. Choose GROUND or RITUAL, the Esquire Grooming Awards 2026 Best Grooming Kit winner. One-time kits from £${GROUND.firstBoxPrice}.`,
    image: absolute('/products/kit/holding-box.webp'),
  },
  '/buy': {
    title: "Men's Body Care Kits | GROUND & RITUAL | SOLUM",
    description: `Compare SOLUM GROUND (£${GROUND.firstBoxPrice}) and RITUAL (£${RITUAL.firstBoxPrice}) body care kits. RITUAL won Best Grooming Kit at the Esquire Grooming Awards 2026. One-time purchase, free UK delivery.`,
    image: absolute('/products/kit/box-open.webp'),
  },
  '/ritual': {
    title: "Men's Daily & Weekly Body Care Routine | SOLUM Rituals",
    description: 'Follow the SOLUM body care system with guided daily shower and weekly reset rituals. See the order, technique and essentials for every step.',
  },
  '/guide': {
    title: "The SOLUM Guide | Men's Body Care & Shower Routines",
    description: "Explore the SOLUM guides to men's body care: shower routines, exfoliation, scalp massage, rhassoul clay and moisturising after a shower.",
  },
  '/awards': {
    title: 'RITUAL: Best Grooming Kit | Esquire Grooming Awards 2026 | SOLUM',
    description: 'SOLUM RITUAL won Best Grooming Kit at the Esquire Grooming Awards 2026. See the award, the original Esquire feature and what is inside the winning kit.',
    image: absolute('/products/kit/box-open.webp'),
  },
  '/contact': {
    title: 'Contact SOLUM | UK Body Care Support',
    description: 'Contact SOLUM for help with body care kits, orders, delivery and returns. Reach the team behind the UK men’s body care brand.',
  },
  '/terms': {
    title: 'Terms & Conditions | SOLUM',
    description: 'Terms and conditions for SOLUM one-time kit purchases, delivery and returns. Subscription refills have not launched.',
  },
  '/privacy': {
    title: 'Privacy Policy | SOLUM',
    description: 'How SOLUM collects, uses and protects personal data, including information about orders, analytics and your privacy rights.',
  },
};

const PRIVATE_TITLES = {
  '/checkout': 'Checkout', '/account': 'Your Account', '/success': 'Order Confirmation',
  '/confirm': 'Confirm Your Order', '/email-preview': 'Email Preview', '/creators': 'Creator Applications',
};

export function getPageSeo(pathname = '/') {
  const cleanPath = String(pathname).split(/[?#]/)[0] || '/';
  const path = cleanPath === '/' ? '/' : cleanPath.replace(/\/+$/, '');
  const canonicalPath = path === '/full' ? '/' : path;
  const article = ARTICLES.find(item => canonicalPath === `/guide/${item.slug}`);
  const product = ACTIVE_PRODUCTS.find(item => canonicalPath === `/product/${item.slug}`);
  const base = BASE_PAGES[canonicalPath];
  const known = Boolean(base || article || product);
  const canonical = absolute(canonicalPath);
  const page = {
    title: base?.title || article?.metaTitle || (product && `${product.fullName || product.name} | SOLUM Men's Body Care`) || `${PRIVATE_TITLES[path] || 'Page Not Found'} | SOLUM`,
    description: base?.description || article?.metaDescription || (product && `${product.tagline} Discover ${product.fullName || product.name}, included in SOLUM body care kits. Not sold separately.`) || 'SOLUM account, checkout and private pages.',
    canonical,
    image: base?.image || (product?.media?.still && absolute(product.media.still)) || DEFAULT_IMAGE,
    type: article ? 'article' : 'website',
    robots: known ? INDEX_ROBOTS : NOINDEX_ROBOTS,
  };
  const pageEntity = {
    '@type': ['/buy', '/guide'].includes(canonicalPath) ? 'CollectionPage' : canonicalPath === '/contact' ? 'ContactPage' : 'WebPage',
    '@id': `${canonical}#webpage`, url: canonical,
    name: page.title, description: page.description,
    inLanguage: 'en-GB', isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
  };
  const graph = [...organizationGraph(), pageEntity];

  if (article) {
    const articleId = `${canonical}#article`;
    pageEntity.mainEntity = { '@id': articleId };
    pageEntity.breadcrumb = { '@id': `${canonical}#breadcrumbs` };
    graph.push({
      '@type': 'Article', '@id': articleId,
      headline: article.title, description: article.metaDescription,
      url: canonical, mainEntityOfPage: { '@id': pageEntity['@id'] },
      author: { '@id': ORGANIZATION_ID }, publisher: { '@id': ORGANIZATION_ID },
      articleSection: article.category, inLanguage: 'en-GB', image: page.image,
    }, breadcrumbs(canonical, [['Home', '/'], ['Guide', '/guide'], [article.title, canonicalPath]]));
  } else if (product) {
    pageEntity.mainEntity = { '@id': productId(product) };
    pageEntity.breadcrumb = { '@id': `${canonical}#breadcrumbs` };
    graph.push(productEntity(product), breadcrumbs(canonical, [['Home', '/'], [product.fullName || product.name, canonicalPath]]));
  } else if (['/', '/gift', '/buy'].includes(canonicalPath)) {
    const listId = `${canonical}#kits`;
    pageEntity.mainEntity = { '@id': listId };
    graph.push({
      '@type': 'ItemList', '@id': listId, name: 'SOLUM body care kits',
      itemListElement: CURRENT_KITS.map((kit, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@id': `${SITE_ORIGIN}/#kit-${kit.id}` } })),
    }, ...CURRENT_KITS.map(kit => kitEntity(kit)));
  } else if (canonicalPath === '/awards') {
    const ritual = CURRENT_KITS.find(kit => kit.id === 'ritual');
    pageEntity.about = { '@id': `${SITE_ORIGIN}/#kit-ritual` };
    pageEntity.citation = { '@type': 'WebPage', name: 'Esquire Grooming Awards 2026', url: ESQUIRE_AWARD_URL };
    graph.push(kitEntity(ritual, false));
  } else if (canonicalPath === '/guide') {
    pageEntity.mainEntity = {
      '@type': 'ItemList',
      itemListElement: ARTICLES.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: absolute(`/guide/${item.slug}`) })),
    };
  }

  return { ...page, structuredData: { '@context': 'https://schema.org', '@graph': graph } };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function renderSeoHead(page) {
  const meta = (attribute, name, value) => `<meta ${attribute}="${name}" content="${escapeHtml(value)}" />`;
  const json = JSON.stringify(page.structuredData).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    meta('name', 'description', page.description),
    meta('name', 'robots', page.robots),
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`,
    meta('property', 'og:type', page.type),
    meta('property', 'og:url', page.canonical),
    meta('property', 'og:site_name', 'SOLUM'),
    meta('property', 'og:locale', 'en_GB'),
    meta('property', 'og:title', page.title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:image', page.image),
    meta('property', 'og:image:alt', page.title),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', page.title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', page.image),
    meta('name', 'twitter:image:alt', page.title),
    `<script type="application/ld+json" id="solum-page-schema">${json}</script>`,
  ].join('\n');
}
