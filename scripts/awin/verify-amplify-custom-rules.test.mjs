import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertSolumWebCustomRules,
  loadSolumWebCustomRules,
} from './verify-amplify-custom-rules.mjs'

test('solum-web custom rules preserve the passthrough, feed proxy, then SPA fallback order', async () => {
  const rules = await loadSolumWebCustomRules()
  assert.doesNotThrow(() => assertSolumWebCustomRules(rules))
  assert.deepEqual(rules, [
    { source: '/.well-known/<*>', target: '/.well-known/<*>', status: '200' },
    {
      source: '/feeds/awin.csv',
      target: 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed',
      status: '200',
    },
    {
      source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp4|webm|csv)$)([^.]+$)/>',
      target: '/index.html',
      status: '200',
    },
  ])
})

test('rejects rules that would place the feed after the SPA fallback', () => {
  assert.throws(
    () => assertSolumWebCustomRules([
      { source: '/.well-known/<*>', target: '/.well-known/<*>', status: '200' },
      {
        source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp4|webm|csv)$)([^.]+$)/>',
        target: '/index.html',
        status: '200',
      },
      {
        source: '/feeds/awin.csv',
        target: 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed',
        status: '200',
      },
    ]),
    /rules/i,
  )
})
