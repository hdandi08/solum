import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { PUBLIC_PATHS, getPageSeo, renderSeoHead, SITE_ORIGIN } from '../src/seo/metadata.js';
import { assembleDocument, collectCss, pageSource } from '../build/prerender.js';
import { createSolumWebCustomRules, verifySolumWebDelivery } from '../../scripts/awin/verify-amplify-custom-rules.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const server = await createServer({ root, mode: 'production', logLevel: 'error', server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom' });
try {
  const { renderPublicPage } = await server.ssrLoadModule('/src/seo/entry-server.jsx');
  const fallbackPage = { ...getPageSeo('/'), title: 'SOLUM | Men’s Body Care', robots: 'noindex, nofollow' };
  const fallbackHead = renderSeoHead(fallbackPage).replace(/<link rel="canonical"[^>]*>\n?/, '');
  await writeFile(resolve(dist, 'app.html'), assembleDocument(template, { head: fallbackHead }));
  for (const pathname of PUBLIC_PATHS) {
    const body = renderPublicPage(pathname);
    if (!body.includes('<h1')) throw new Error(`Missing public content heading: ${pathname}`);
    const head = renderSeoHead(getPageSeo(pathname));
    const html = assembleDocument(template, { head, body, styles: collectCss(manifest, pageSource(pathname)) });
    const file = pathname === '/' ? resolve(dist, 'index.html') : resolve(dist, pathname.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_PATHS.map(path => `  <url><loc>${SITE_ORIGIN}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
  await writeFile(resolve(dist, 'seo-amplify-rules.json'), JSON.stringify(createSolumWebCustomRules(PUBLIC_PATHS), null, 2) + '\n');
  await verifySolumWebDelivery({ distDirectory: dist, publicPaths: PUBLIC_PATHS });
  // The manifest is a build-time input; it needn't be exposed on the public site.
  await rm(resolve(dist, '.vite'), { recursive: true });
  console.log(`Prerendered ${PUBLIC_PATHS.length} public pages with canonical metadata, CSS and sitemap.`);
} finally {
  await server.close();
}
