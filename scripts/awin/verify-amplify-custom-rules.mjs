import { readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PUBLIC_PATHS } from '../../web/src/seo/metadata.js'

const rulesPath = new URL('../../artefacts/solum-web-amplify-custom-rules.json', import.meta.url)

const SPECIAL_RULES = [
  { source: '/.well-known/<*>', target: '/.well-known/<*>', status: '200' },
  {
    source: '/feeds/awin.csv',
    target: 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed',
    status: '200',
  },
]

const SPA_FALLBACK = {
  source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp4|webm|csv|xml|html)$)([^.]+$)/>',
  target: '/app.html',
  status: '200',
}

export function createSolumWebCustomRules(publicPaths = PUBLIC_PATHS) {
  if (!Array.isArray(publicPaths) || !publicPaths.includes('/') || new Set(publicPaths).size !== publicPaths.length || publicPaths.some(path => typeof path !== 'string' || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(path))) {
    throw new Error('Public paths must be unique, slashless canonical paths including /')
  }
  const routeRules = publicPaths.flatMap(source => {
    const target = source === '/' ? '/index.html' : `${source}/index.html`
    const rule = { source, target, status: '200' }
    return source === '/' ? [rule] : [rule, { ...rule, source: `${source}/` }]
  })
  return [
    ...SPECIAL_RULES.map(rule => ({ ...rule })),
    ...routeRules,
    { source: '/full', target: '/index.html', status: '200' },
    { source: '/full/', target: '/index.html', status: '200' },
    { ...SPA_FALLBACK },
  ]
}

export async function loadSolumWebCustomRules() {
  return JSON.parse(await readFile(rulesPath, 'utf8'))
}

export function assertSolumWebCustomRules(rules, publicPaths = PUBLIC_PATHS) {
  if (JSON.stringify(rules) !== JSON.stringify(createSolumWebCustomRules(publicPaths))) {
    throw new Error('Solum web custom rules must preserve the approved rule order and targets')
  }
}

async function readBuildFile(distDirectory, pathname, description) {
  const root = resolve(distDirectory)
  const filename = resolve(root, pathname.replace(/^\//, ''))
  if (!filename.startsWith(`${root}${sep}`)) throw new Error(`Invalid build path: ${pathname}`)
  try {
    return await readFile(filename, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Missing ${description}: ${pathname}`)
    throw error
  }
}

export async function verifySolumWebDelivery({ distDirectory, publicPaths = PUBLIC_PATHS }) {
  const rules = JSON.parse(await readBuildFile(distDirectory, '/seo-amplify-rules.json', 'routing artifact'))
  assertSolumWebCustomRules(rules, publicPaths)
  const assets = new Set()
  const emptyRoot = /<div\b[^>]*\bid=["']root["'][^>]*>\s*<\/div>/i
  const appHtml = await readBuildFile(distDirectory, '/app.html', 'private-route SPA fallback')
  if (!/<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i.test(appHtml)) throw new Error('app.html must declare noindex for private and unknown routes')
  if (!emptyRoot.test(appHtml)) throw new Error('app.html must have an empty root, without copied homepage content')
  const htmlFiles = [appHtml]
  for (const path of publicPaths) {
    const filename = path === '/' ? '/index.html' : `${path}/index.html`
    const html = await readBuildFile(distDirectory, filename, 'prerendered HTML')
    if (!/<html[\s>]/i.test(html) || !/\bid=["']root["']/i.test(html) || emptyRoot.test(html)) throw new Error(`Empty prerendered content: ${path}`)
    htmlFiles.push(html)
  }
  for (const html of htmlFiles) {
    for (const match of html.matchAll(/(?:src|href)=["'](\/assets\/[^"'?#]+)(?:[?#][^"']*)?["']/g)) assets.add(match[1])
  }
  for (const asset of assets) await readBuildFile(distDirectory, asset, 'asset')
  const sitemap = await readBuildFile(distDirectory, '/sitemap.xml', 'XML sitemap')
  if (!/<urlset(?:\s|>)/.test(sitemap) || /<html(?:\s|>)/i.test(sitemap)) throw new Error('sitemap.xml must contain an XML urlset, not the homepage HTML')
  if (!(await readBuildFile(distDirectory, '/robots.txt', 'robots file')).trim()) throw new Error('Empty robots.txt')
  return { publicRoutes: publicPaths.length, assets: assets.size }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2)
    const write = args.includes('--write')
    const distIndex = args.indexOf('--dist')
    const distDirectory = distIndex >= 0 ? args[distIndex + 1] : null
    const expectedCount = Number(write) + (distIndex >= 0 ? 2 : 0)
    if (args.length !== expectedCount || (distIndex >= 0 && (!distDirectory || distDirectory.startsWith('--')))) throw new Error('Usage: node scripts/awin/verify-amplify-custom-rules.mjs [--write] [--dist web/dist]')
    if (write) await writeFile(rulesPath, `${JSON.stringify(createSolumWebCustomRules(), null, 2)}\n`)
    assertSolumWebCustomRules(await loadSolumWebCustomRules())
    if (distDirectory) {
      const result = await verifySolumWebDelivery({ distDirectory })
      console.log(`Solum web delivery verified: ${result.publicRoutes} public routes and ${result.assets} referenced assets`)
    } else {
      console.log('Solum web custom rules verified')
    }
  } catch (error) {
    console.error(`Solum web custom rules verification failed: ${error.message}`)
    process.exitCode = 1
  }
}
