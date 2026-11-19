import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { PUBLIC_PATHS, getPageSeo } from '../src/seo/metadata.js';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  let file = path === '/' || path === '/full' ? '/index.html' : PUBLIC_PATHS.includes(path.replace(/\/$/, '')) ? `${path.replace(/\/$/, '')}/index.html` : extname(path) ? path : '/app.html';
  const target = resolve(dist, `.${file}`);
  if (!target.startsWith(dist + '/')) { response.writeHead(403).end(); return; }
  try { const content = await readFile(target); response.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream'}); response.end(content); }
  catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const staticContext = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width:390, height:844 } });
  const staticPage = await staticContext.newPage();
  for (const path of PUBLIC_PATHS) {
    const response = await staticPage.goto(origin + path, { waitUntil:'domcontentloaded' });
    assert.equal(response.status(), 200, path);
    assert.equal(await staticPage.locator('h1').count(), 1, `${path}: one real H1 without JS`);
    assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute('href'), getPageSeo(path).canonical);
    assert.equal(await staticPage.locator('script#solum-page-schema').count(), 1);
    assert.ok((await staticPage.locator('#root').innerText()).length > 200, `${path}: readable content`);
  }
  await staticPage.goto(origin + '/buy', {waitUntil:'domcontentloaded'});
  assert.doesNotMatch(await staticPage.locator('#root').innerText(), /Ships (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
  assert.equal(await staticPage.locator('input[data-testid="email"]').isDisabled(),true);
  await staticPage.goto(origin + '/awards' , {waitUntil:'domcontentloaded'});
  assert.match(await staticPage.locator('h1').innerText(), /SOLUM RITUAL wins Best Grooming Kit/);
  await staticPage.screenshot({path:resolve(dist,'../..','artefacts/seo-awards-mobile.png')});
  for (const path of ['/account','/this-page-does-not-exist']) {
    await staticPage.goto(origin + path, {waitUntil:'domcontentloaded'});
    assert.match(await staticPage.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    assert.equal(await staticPage.locator('#root').innerText(), '');
  }
  await staticContext.close();
  console.log(`No-JavaScript checks passed for ${PUBLIC_PATHS.length} public routes and two excluded paths.`);

  const context = await browser.newContext({reducedMotion:'reduce', viewport:{width:390,height:844}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/AwardsPage-*.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.goto(origin + '/awards', {waitUntil:'domcontentloaded'});
  assert.match(await page.locator('.awards-intro h1').innerText(), /Best Grooming Kit/);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.awards-intro h1').count(),1);
  await page.unrouteAll({behavior:'wait'});
  await page.goto(origin + '/', {waitUntil:'domcontentloaded'});
  await page.locator('.hero-title').waitFor();
  for (const path of ['/product/06-argan-oil','/','/guide/scalp-massager-men','/','/account','/','/awards']) {
    await page.evaluate(path => { history.pushState({},'',path); dispatchEvent(new PopStateEvent('popstate')); }, path);
    await page.waitForFunction(canonical => document.querySelector('link[rel="canonical"]')?.href === canonical, getPageSeo(path).canonical);
    assert.equal(await page.title(),getPageSeo(path).title,path);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), getPageSeo(path).canonical);
    assert.equal(await page.locator('meta[property="og:type"]').getAttribute('content'), getPageSeo(path).type);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), getPageSeo(path).image);
    assert.equal(await page.locator('meta[name="twitter:title"]').getAttribute('content'), getPageSeo(path).title);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), getPageSeo(path).robots);
    assert.equal(await page.locator('script[type="application/ld+json"]').count(),1);
  }
  await page.locator('.awards-intro h1').waitFor();
  assert.equal(await page.locator('.footer-award').count(),1);
  await page.goto(origin + '/buy?kit=ground&utm_source=seo_smoke', {waitUntil:'domcontentloaded'});
  await page.locator('#root h1').waitFor();
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://bysolum.co.uk/buy');
  assert.match(await page.locator('#root').innerText(), /GROUND/);
  assert.equal(new URL(page.url()).searchParams.get('kit'),'ground');
  assert.equal(new URL(page.url()).searchParams.get('utm_source'),'seo_smoke');
  assert.deepEqual(errors,[]);
  console.log('SPA metadata resets, awards link and attributed GROUND buy landing passed. No browser errors.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
