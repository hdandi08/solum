import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as delivery from './verify-amplify-custom-rules.mjs'

const PUBLIC_PATHS = ['/', '/buy', '/guide', '/guide/mens-body-care-routine', '/product/01-body-wash']

test('the SPA fallback leaves the sitemap, generated HTML, and hashed assets untouched', async () => {
  const rules = await delivery.loadSolumWebCustomRules()
  const fallback = rules.at(-1)
  const expression = new RegExp(fallback.source.slice(2, -2))
  for (const path of ['/sitemap.xml', '/guide/example/index.html', '/robots.txt', '/assets/index-a.js', '/assets/index-a.css', '/products/01/still.webp']) {
    assert.equal(expression.test(path), false, path)
  }
  assert.equal(expression.test('/account'), true)
  assert.equal(expression.test('/checkout'), true)
})

test('known public routes and trailing slash variants resolve before the SPA fallback', () => {
  const rules = delivery.createSolumWebCustomRules(PUBLIC_PATHS)
  assert.deepEqual(rules.slice(0, 2), [
    { source: '/.well-known/<*>', target: '/.well-known/<*>', status: '200' },
    {
      source: '/feeds/awin.csv',
      target: 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed',
      status: '200',
    },
  ])
  for (const pathname of PUBLIC_PATHS) {
    const target = pathname === '/' ? '/index.html' : `${pathname}/index.html`
    assert.deepEqual(rules.find(rule => rule.source === pathname), { source: pathname, target, status: '200' })
    if (pathname !== '/') assert.deepEqual(rules.find(rule => rule.source === `${pathname}/`), { source: `${pathname}/`, target, status: '200' })
  }
  assert.deepEqual(rules.find(rule => rule.source === '/full'), { source: '/full', target: '/index.html', status: '200' })
  assert.deepEqual(rules.find(rule => rule.source === '/full/'), { source: '/full/', target: '/index.html', status: '200' })
  assert.equal(rules.at(-1).target, '/app.html')
  assert.doesNotThrow(() => delivery.assertSolumWebCustomRules(rules, PUBLIC_PATHS))
})

test('the committed rule artifact matches the public route manifest', async () => {
  const { PUBLIC_PATHS: publicPaths } = await import('../../web/src/seo/metadata.js')
  delivery.assertSolumWebCustomRules(await delivery.loadSolumWebCustomRules(), publicPaths)
})

test('rules reject a moved feed proxy or missing public route', () => {
  const rules = delivery.createSolumWebCustomRules(PUBLIC_PATHS)
  const misplacedFeed = [...rules.slice(0, 1), ...rules.slice(2), rules[1]]
  assert.throws(() => delivery.assertSolumWebCustomRules(misplacedFeed, PUBLIC_PATHS), /rule order and targets/i)
  assert.throws(() => delivery.assertSolumWebCustomRules(rules.filter(rule => rule.source !== '/guide'), PUBLIC_PATHS), /rule order and targets/i)
})

test('invalid route paths cannot become file traversal or rewrite patterns', () => {
  for (const paths of [['/guide'], ['/', '/guide/'], ['/', '/guide/../account'], ['/', '/guide?x=1'], ['/', '/assets/<*>'], ['/', '/guide', '/guide']]) {
    assert.throws(() => delivery.createSolumWebCustomRules(paths), /public paths/i)
  }
})

async function makeDist(t) {
  const distDirectory = await mkdtemp(join(tmpdir(), 'solum-seo-delivery-'))
  t.after(() => rm(distDirectory, { recursive: true, force: true }))
  await mkdir(join(distDirectory, 'assets'), { recursive: true })
  await writeFile(join(distDirectory, 'assets/index-a.js'), 'export {};')
  await writeFile(join(distDirectory, 'assets/index-a.css'), 'body{}')
  await writeFile(join(distDirectory, 'sitemap.xml'), '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
  await writeFile(join(distDirectory, 'robots.txt'), 'User-agent: *\nAllow: /\n')
  await writeFile(join(distDirectory, 'app.html'), '<!doctype html><html><head><meta name="robots" content="noindex, nofollow"></head><body><div id="root"></div></body></html>')
  for (const path of PUBLIC_PATHS) {
    const dir = path === '/' ? distDirectory : join(distDirectory, path.slice(1))
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="/assets/index-a.css"><script type="module" src="/assets/index-a.js"></script></head><body><div id="root"><h1>SOLUM</h1></div></body></html>')
  }
  const rules = delivery.createSolumWebCustomRules(PUBLIC_PATHS)
  await writeFile(join(distDirectory, 'seo-amplify-rules.json'), JSON.stringify(rules))
  return { distDirectory, publicPaths: PUBLIC_PATHS }
}

test('built delivery verifies public HTML and its hashed assets', async t => {
  const fixture = await makeDist(t)
  await assert.doesNotReject(() => delivery.verifySolumWebDelivery(fixture))
})

test('built delivery rejects omitted nested route HTML', async t => {
  const fixture = await makeDist(t)
  await rm(join(fixture.distDirectory, 'guide/mens-body-care-routine/index.html'))
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /missing prerendered HTML.*guide\/mens-body-care-routine/i)
})

test('built delivery rejects omitted hashed assets', async t => {
  const fixture = await makeDist(t)
  await rm(join(fixture.distDirectory, 'assets/index-a.js'))
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /missing asset.*index-a.js/i)
})

test('built delivery rejects an SPA shell in place of prerendered content', async t => {
  const fixture = await makeDist(t)
  await writeFile(join(fixture.distDirectory, 'guide/index.html'), '<!doctype html><html><body><div id="root"></div></body></html>')
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /empty prerendered content.*guide/i)
})

test('built delivery rejects the homepage masquerading as the sitemap', async t => {
  const fixture = await makeDist(t)
  await writeFile(join(fixture.distDirectory, 'sitemap.xml'), '<!doctype html><html><body>SOLUM</body></html>')
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /sitemap.*XML/i)
})

test('built delivery rejects an omitted generated routing artifact', async t => {
  const fixture = await makeDist(t)
  await rm(join(fixture.distDirectory, 'seo-amplify-rules.json'))
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /missing.*seo-amplify-rules.json/i)
})

test('built delivery rejects an indexable private-route SPA fallback', async t => {
  const fixture = await makeDist(t)
  await writeFile(join(fixture.distDirectory, 'app.html'), '<!doctype html><html><body><div id="root"></div></body></html>')
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /app.html.*noindex/i)
})

test('built delivery rejects copied homepage markup in the private-route SPA fallback', async t => {
  const fixture = await makeDist(t)
  await writeFile(join(fixture.distDirectory, 'app.html'), '<!doctype html><html><head><meta name="robots" content="noindex"></head><body><div id="root"><h1>SOLUM</h1></div></body></html>')
  await assert.rejects(() => delivery.verifySolumWebDelivery(fixture), /app.html.*empty.*root/i)
})
