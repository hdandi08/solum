import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertAwinFeedResponse,
  main,
  verifyAwinFeedUrl,
} from './verify-feed.mjs'

const header = 'product_id,product_name,description,merchant_image_url,search_price,currency,merchant_deep_link,in_stock,brand_name,merchant_category,delivery_cost'

const csv = [
  header,
  'ground,"SOLUM GROUND Kit — Complete Men\'s Body Ritual","Daily ritual line one\nwith a ""quoted"" detail",https://bysolum.co.uk/products/kit/ground.webp,65.00,GBP,https://bysolum.co.uk/buy?kit=ground,1,SOLUM,Health & Beauty > Personal Care > Cosmetics > Skin Care,0.00',
  'ritual,"SOLUM RITUAL Kit — Complete Men\'s Body Ritual","Weekly ritual",https://bysolum.co.uk/products/kit/still.webp,85.00,GBP,https://bysolum.co.uk/buy?kit=ritual,0,SOLUM,Health & Beauty > Personal Care > Cosmetics > Skin Care,0.00',
].join('\r\n')

test('accepts the two-kit AWIN CSV with quoted multiline content', () => {
  assert.doesNotThrow(() => assertAwinFeedResponse(csv, 'text/csv; charset=utf-8'))
})

test('rejects SPA HTML', () => {
  assert.throws(() => assertAwinFeedResponse('<!doctype html>', 'text/html'), /CSV/i)
})

test('rejects a missing content type', () => {
  assert.throws(() => assertAwinFeedResponse(csv, undefined), /CSV/i)
})

test('rejects malformed row widths', () => {
  const malformed = csv.replace(/,0\.00$/, '')
  assert.throws(() => assertAwinFeedResponse(malformed, 'text/csv'), /columns/i)
})

test('rejects unescaped content after a quoted CSV field', () => {
  const malformed = csv.replace('"Weekly ritual"', '"Weekly ritual"unexpected')
  assert.throws(() => assertAwinFeedResponse(malformed, 'text/csv'), /quoting/i)
})

test('rejects duplicate or unexpected kit rows', () => {
  const duplicate = csv.replace('\r\nritual,', '\r\nground,')
  assert.throws(() => assertAwinFeedResponse(duplicate, 'text/csv'), /ritual|duplicate/i)

  const extra = `${csv}\r\nextra,EXTRA,x,x,10.00,GBP,x,1,SOLUM,x,0.00`
  assert.throws(() => assertAwinFeedResponse(extra, 'text/csv'), /two rows/i)
})

test('rejects incorrect commercial fields', () => {
  const wrongPrice = csv.replace(',85.00,GBP,', ',84.00,GBP,')
  assert.throws(() => assertAwinFeedResponse(wrongPrice, 'text/csv'), /price/i)
  const wrongStock = csv.replace(',1,SOLUM,', ',2,SOLUM,')
  assert.throws(() => assertAwinFeedResponse(wrongStock, 'text/csv'), /stock/i)
})

test('rejects product identity, URL, and category deviations from the stable feed contract', () => {
  const deviations = [
    [
      csv.replace("SOLUM GROUND Kit — Complete Men's Body Ritual", 'GROUND'),
      /product_name/i,
    ],
    [
      csv.replace('https://bysolum.co.uk/products/kit/ground.webp', 'https://evil.test/products/kit/ground.webp'),
      /merchant_image_url/i,
    ],
    [
      csv.replace('https://bysolum.co.uk/buy?kit=ritual', 'https://evil.test/buy?kit=ritual'),
      /merchant_deep_link/i,
    ],
    [
      csv.replace('Health & Beauty > Personal Care > Cosmetics > Skin Care', 'Body Care'),
      /merchant_category/i,
    ],
  ]

  for (const [invalidCsv, error] of deviations) {
    assert.throws(() => assertAwinFeedResponse(invalidCsv, 'text/csv'), error)
  }
})

test('fetches and validates the configured clean feed URL', async () => {
  const requests = []
  await verifyAwinFeedUrl('https://feed.example.test/', async (url) => {
    requests.push(url)
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'text/csv; charset=utf-8' },
      text: async () => csv,
    }
  })
  assert.deepEqual(requests, ['https://feed.example.test/feeds/awin.csv'])
})

test('fails safely when the configured feed request is unsuccessful', async () => {
  await assert.rejects(
    () => verifyAwinFeedUrl('https://feed.example.test', async () => ({ ok: false, status: 503 })),
    /request failed/i,
  )
})

test('executable verifier fails without AWIN_FEED_ORIGIN without printing a response body', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./verify-feed.mjs', import.meta.url))], {
    env: { PATH: process.env.PATH },
    encoding: 'utf8',
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /AWIN feed verification failed/i)
  assert.doesNotMatch(result.stderr, /secret-response-body/i)
})

test('main reports success without including feed content', async () => {
  const reports = []
  await main({
    origin: 'https://feed.example.test',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'text/csv' },
      text: async () => csv,
    }),
    report: (message) => reports.push(message),
  })
  assert.deepEqual(reports, ['AWIN feed verified'])
})
