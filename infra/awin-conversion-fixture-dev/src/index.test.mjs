import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHandler } from './index.mjs'

const API_KEY = 'development-fixture-api-key-development'
const PATH = '/s2s/advertiser/129171/orders'

const ORDERS = {
  sent: order('pi_s2s200dev0001'),
  partialOk: order('pi_s2s206okdev001'),
  partialFail: order('pi_s2s206faildev1'),
  limited: order('pi_s2s429dev0001'),
  broken: order('pi_s2s500dev0001'),
}

function order(orderReference) {
  return {
    orderReference,
    amount: 65,
    channel: 'aw',
    currency: 'GBP',
    awc: 'synthetic_dev_checksum',
    commissionGroups: [{ code: 'DEFAULT', amount: 65 }],
    custom: { '1': 'solum-outbox-v1' },
  }
}

function event({
  method = 'POST',
  path = PATH,
  apiKey = API_KEY,
  body = { orders: [ORDERS.sent] },
  rawBody,
  headers = {},
} = {}) {
  const serialized = rawBody ?? JSON.stringify(body)
  return {
    requestContext: { http: { method, path } },
    rawPath: path,
    headers: {
      'x-api-key': apiKey,
      'content-length': String(Buffer.byteLength(serialized)),
      ...headers,
    },
    body: serialized,
  }
}

test('rejects wrong path and non-POST without CORS', async () => {
  const handler = createHandler({ apiKey: API_KEY })
  const wrongPath = await handler(event({ path: '/wrong' }))
  const wrongMethod = await handler(event({ method: 'GET' }))

  assert.equal(wrongPath.statusCode, 404)
  assert.equal(wrongMethod.statusCode, 405)
  assert.equal(wrongPath.headers['access-control-allow-origin'], undefined)
  assert.equal(wrongMethod.headers['access-control-allow-origin'], undefined)
})

test('rejects authentication before parsing malformed JSON', async () => {
  const response = await createHandler({ apiKey: API_KEY })(event({
    apiKey: 'wrong-development-key',
    rawBody: '{not-json-sensitive',
  }))

  assert.equal(response.statusCode, 401)
  assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' })
  assert.doesNotMatch(response.body, /not-json-sensitive/)
})

test('rejects declared and streamed-equivalent bodies above the byte cap', async () => {
  const handler = createHandler({ apiKey: API_KEY })
  const declared = await handler(event({
    headers: { 'content-length': '65537' },
  }))
  const oversized = await handler(event({ rawBody: 'x'.repeat(65_537) }))

  assert.equal(declared.statusCode, 413)
  assert.equal(oversized.statusCode, 413)
})

test('requires the exact conversion request schema and a bounded batch', async () => {
  const handler = createHandler({ apiKey: API_KEY })
  for (const body of [
    {},
    { orders: [] },
    { orders: Array.from({ length: 101 }, () => ORDERS.sent) },
    { orders: [{ ...ORDERS.sent, currency: 'USD' }] },
    { orders: [{ ...ORDERS.sent, orderReference: 'pi_notallowlisted' }] },
    { orders: [{ ...ORDERS.sent, awc: 'unsafe attribution' }] },
  ]) {
    const response = await handler(event({ body }))
    assert.equal(response.statusCode, 400)
    assert.deepEqual(JSON.parse(response.body), { error: 'Invalid request' })
  }
})

test('returns deterministic synthetic 200 success', async () => {
  const response = await createHandler({ apiKey: API_KEY })(event({
    body: { orders: [ORDERS.sent] },
  }))

  assert.equal(response.statusCode, 200)
  assert.deepEqual(JSON.parse(response.body), {
    batchId: 'fixture-200-dev',
    successfulOrders: [{
      orderReference: ORDERS.sent.orderReference,
      correlationId: 'fixture-tx-200-dev',
    }],
    failedOrders: [],
  })
})

test('returns deterministic synthetic 206 item independence', async () => {
  const response = await createHandler({ apiKey: API_KEY })(event({
    body: { orders: [ORDERS.partialOk, ORDERS.partialFail] },
  }))

  assert.equal(response.statusCode, 206)
  assert.deepEqual(JSON.parse(response.body), {
    batchId: 'fixture-206-dev',
    successfulOrders: [{
      orderReference: ORDERS.partialOk.orderReference,
      correlationId: 'fixture-tx-206-dev',
    }],
    failedOrders: [{ orderReference: ORDERS.partialFail.orderReference }],
  })
})

test('returns deterministic synthetic 429 and 500 without provider detail', async () => {
  const handler = createHandler({ apiKey: API_KEY })
  const limited = await handler(event({ body: { orders: [ORDERS.limited] } }))
  const broken = await handler(event({ body: { orders: [ORDERS.broken] } }))

  assert.equal(limited.statusCode, 429)
  assert.equal(limited.headers['retry-after'], '1')
  assert.deepEqual(JSON.parse(limited.body), {})
  assert.equal(broken.statusCode, 500)
  assert.deepEqual(JSON.parse(broken.body), {})
})

test('template is isolated dev-only HTTPS infrastructure with bounded logs and throttling', async () => {
  const template = await readFile(new URL('../template.yaml', import.meta.url), 'utf8')

  assert.match(template, /awin-conversion-fixture-dev/)
  assert.match(template, /Path: \/s2s\/advertiser\/129171\/orders/)
  assert.match(template, /Method: POST/)
  assert.match(template, /RetentionInDays: 1/)
  assert.match(template, /ThrottlingRateLimit: 5/)
  assert.match(template, /ThrottlingBurstLimit: 10/)
  assert.doesNotMatch(template, /CorsConfiguration|AllowOrigins|track\.bysolum/)
})

test('fixture source has no logging or persistence sink', async () => {
  const source = await readFile(new URL('./index.mjs', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /console\.|request\.body|event\.body\s*\)/)
  assert.doesNotMatch(source, /PutItem|DynamoDB|S3|Firehose|provider.*message/i)
})

test('deployment and teardown scripts hard-guard exact dev resources before mutation', async () => {
  const deploy = await readFile(new URL('../scripts/deploy-aws-dev.sh', import.meta.url), 'utf8')
  const teardown = await readFile(new URL('../scripts/teardown-aws-dev.sh', import.meta.url), 'utf8')
  const supabase = await readFile(new URL('../scripts/deploy-supabase-dev.sh', import.meta.url), 'utf8')

  for (const script of [deploy, teardown]) {
    assert.match(script, /798470762256/)
    assert.match(script, /eu-west-2/)
    assert.match(script, /solum-awin-conversion-fixture-dev/)
    assert.match(script, /\*-dev/)
  }
  assert.match(deploy, /sam deploy/)
  assert.match(teardown, /aws cloudformation delete-stack/)
  assert.match(supabase, /rodvvmfzkyjsqbufkjbc/)
  assert.match(supabase, /--profile supabase/)
  assert.match(supabase, /stripe-webhook/)
  assert.match(supabase, /create-first-box-payment-intent/)
  assert.match(supabase, /awin-conversion-worker/)
  assert.doesNotMatch(supabase, /gvfptmjluxpngfjendbi/)
})

test('acceptance harness guarantees cleanup and emits only sanitized results', async () => {
  const source = await readFile(new URL('../scripts/acceptance-dev.mjs', import.meta.url), 'utf8')

  assert.match(source, /finally/)
  assert.match(source, /purchase_side_effects_attempted: true/)
  assert.match(source, /STRIPE_ACCEPTANCE_WEBHOOK_SECRET/)
  assert.match(source, /AWIN_WORKER_SECRET/)
  assert.doesNotMatch(source, /AWIN_ACCEPTANCE_WORKER_SECRET/)
  assert.match(source, /exactlyOneOutbox/)
  assert.match(source, /replayNoDuplicate/)
  assert.match(source, /ciphertextOnly/)
  assert.match(source, /partialIndependence/)
  assert.match(source, /cleanupResidue/)
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*(?:secret|awc|email|body)/i)
})

test('acceptance-deployed webhook does not log third-party response bodies', async () => {
  const source = await readFile(
    new URL('../../../supabase/functions/stripe-webhook/index.ts', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*JSON\.stringify\((?:body|result(?:\.error)?)\)/)
})
