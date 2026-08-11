import test from 'node:test'
import assert from 'node:assert/strict'
import { assertAwinFeedResponse } from './verify-feed.mjs'

test('accepts the two-kit AWIN CSV', () => {
  const csv = [
    'product_id,product_name,description,merchant_image_url,search_price,currency,merchant_deep_link,in_stock,brand_name,merchant_category,delivery_cost',
    'ground,GROUND,x,x,65.00,GBP,x,1,SOLUM,x,0.00',
    'ritual,RITUAL,x,x,85.00,GBP,x,1,SOLUM,x,0.00',
  ].join('\n')
  assert.doesNotThrow(() => assertAwinFeedResponse(csv, 'text/csv; charset=utf-8'))
})

test('rejects SPA HTML', () => {
  assert.throws(() => assertAwinFeedResponse('<!doctype html>', 'text/html'), /CSV/i)
})
