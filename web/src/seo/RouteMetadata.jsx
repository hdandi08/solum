import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageSeo } from './metadata.js';

function setHeadElement(selector, tagName, attributes) {
  const [existing, ...duplicates] = document.head.querySelectorAll(selector);
  duplicates.forEach(element => element.remove());
  const element = existing || document.createElement(tagName);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (!existing) document.head.appendChild(element);
  return element;
}

export default function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = getPageSeo(pathname);
    document.title = page.title;
    setHeadElement('link[rel="canonical"]', 'link', { rel: 'canonical', href: page.canonical });
    const tags = [
      ['name', 'description', page.description],
      ['name', 'robots', page.robots],
      ['property', 'og:type', page.type],
      ['property', 'og:url', page.canonical],
      ['property', 'og:site_name', 'SOLUM'],
      ['property', 'og:locale', 'en_GB'],
      ['property', 'og:title', page.title],
      ['property', 'og:description', page.description],
      ['property', 'og:image', page.image],
      ['property', 'og:image:alt', page.title],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', page.title],
      ['name', 'twitter:description', page.description],
      ['name', 'twitter:image', page.image],
      ['name', 'twitter:image:alt', page.title],
    ];
    for (const [attribute, name, value] of tags) {
      setHeadElement(`meta[${attribute}="${name}"]`, 'meta', { [attribute]: name, content: value });
    }
    // Route images have different formats and dimensions. Discard shell values
    // rather than describe a product photo using the homepage card dimensions.
    document.head.querySelectorAll('meta[property="og:image:type"], meta[property="og:image:width"], meta[property="og:image:height"]').forEach(element => element.remove());
    document.head.querySelectorAll('script[type="application/ld+json"]:not(#solum-page-schema)').forEach(element => element.remove());
    const schema = setHeadElement('script#solum-page-schema', 'script', { id: 'solum-page-schema', type: 'application/ld+json' });
    schema.textContent = JSON.stringify(page.structuredData).replace(/</g, '\\u003c');
  }, [pathname]);

  return null;
}
