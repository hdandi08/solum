import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { planAcceptanceClaim } from '../src/acceptanceIsolation.mjs'

const EXPECTED_REF = 'rodvvmfzkyjsqbufkjbc'
const fixtureRefs = [
  'pi_s2s429dev0001',
  'pi_s2s500dev0001',
  'pi_s2s200dev0001',
  'pi_s2s206okdev001',
  'pi_s2s206faildev1',
]
const unrelatedRef = 'pi_s2sunrelated01'
const refs = [...fixtureRefs, unrelatedRef]
const projectRef = process.env.SUPABASE_PROJECT_REF
const stripeSecret = process.env.STRIPE_ACCEPTANCE_WEBHOOK_SECRET
const workerSecret = process.env.AWIN_WORKER_SECRET
if (
  projectRef !== EXPECTED_REF || !stripeSecret ||
  typeof workerSecret !== 'string' || workerSecret.length < 32
) {
  throw new Error('BLOCKED: exact development acceptance environment is absent')
}

const projectUrl = `https://${EXPECTED_REF}.supabase.co`
const apiKeys = JSON.parse(execFileSync('supabase', [
  'projects', 'api-keys', '--project-ref', EXPECTED_REF,
  '--output', 'json', '--profile', 'supabase',
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
const serviceKey = apiKeys.find((entry) => entry.name === 'service_role')?.api_key
if (typeof serviceKey !== 'string' || serviceKey.length < 32) {
  throw new Error('BLOCKED: development service role API key is unavailable')
}

const customers = refs.map(() => randomUUID())
const orders = refs.map(() => randomUUID())
const results = {
  exactlyOneOutbox: false,
  replayNoDuplicate: false,
  ciphertextOnly: false,
  financialFieldsCorrect: false,
  retry429: false,
  retry500: false,
  sent200: false,
  partialIndependence: false,
  concurrencyIsolation: false,
  rawAttributionAbsent: false,
  deployedInteroperability: false,
  cleanupVerified: false,
}

function guardDevelopmentRef() {
  const linked = readFileSync('supabase/.temp/project-ref', 'utf8').trim()
  if (linked !== EXPECTED_REF) {
    throw new Error('BLOCKED: linked Supabase ref changed')
  }
}

function rest(path, { method = 'GET', body } = {}) {
  if (method !== 'GET') guardDevelopmentRef()
  return fetch(`${projectUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`development REST operation failed (${response.status})`)
    return response.status === 204 ? undefined : response.json()
  })
}

async function rows(path) {
  const value = await rest(path)
  if (!Array.isArray(value)) throw new Error('development REST response shape invalid')
  return value
}

function stripePayload(orderRef) {
  return JSON.stringify({
    id: `evt_${orderRef.slice(3)}`,
    object: 'event',
    api_version: '2024-06-20',
    created: 1_704_067_200,
    livemode: true,
    pending_webhooks: 1,
    request: null,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: orderRef,
        object: 'payment_intent',
        amount: 6500,
        amount_received: 6500,
        created: 1_704_067_200,
        currency: 'gbp',
        customer: `cus_${orderRef.slice(3)}`,
        livemode: true,
        metadata: {
          awc: 'synthetic_dev_checksum',
          awin_channel: 'aw',
          delivery_amount_pence: '0',
          discount_amount_pence: '0',
          kit_id: 'ground',
          source: 'first_batch',
        },
        shipping: null,
        status: 'succeeded',
      },
    },
  })
}

async function invokeWebhook(orderRef) {
  const body = stripePayload(orderRef)
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createHmac('sha256', stripeSecret)
    .update(`${timestamp}.${body}`).digest('hex')
  const response = await fetch(`${projectUrl}/functions/v1/stripe-webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': `t=${timestamp},v1=${signature}`,
    },
    body,
  })
  if (!response.ok) throw new Error(`development webhook failed (${response.status})`)
}

async function invokeWorker(limit = 100) {
  const response = await fetch(`${projectUrl}/functions/v1/awin-conversion-worker`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${workerSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ limit }),
  })
  if (!response.ok) throw new Error(`development worker failed (${response.status})`)
  const counts = await response.json()
  if (!counts || typeof counts !== 'object') throw new Error('development worker response shape invalid')
  return counts
}

async function outbox(orderRef) {
  return rows(`awin_conversion_outbox?order_ref=eq.${orderRef}&select=id,order_ref,customer_paid_pence,discount_pence,delivery_pence,vat_pence,amount_pence,currency,commission_group,channel,awc_ciphertext,awc_hash,state,attempt_count,last_http_status,last_error_code`)
}

async function suppress(orderRef) {
  await rest(`awin_conversion_outbox?order_ref=eq.${orderRef}`, {
    method: 'PATCH',
    body: { state: 'suppressed', next_attempt_at: null },
  })
}

async function claimExpected(orderRefs) {
  const claimPlan = planAcceptanceClaim(orderRefs)
  for (const orderRef of claimPlan.orderRefs) {
    await rest(`awin_conversion_outbox?order_ref=eq.${orderRef}`, {
      method: 'PATCH',
      body: { state: 'pending', next_attempt_at: claimPlan.nextAttemptAt },
    })
  }
  const counts = await invokeWorker(claimPlan.limit)
  if (counts.claimed !== claimPlan.limit) {
    throw new Error('development worker claimed outside exact acceptance batch')
  }
  return counts
}

async function unrelatedRowUnchanged() {
  const unrelated = await outbox(unrelatedRef)
  return unrelated.length === 1 && unrelated[0]?.state === 'pending' &&
    unrelated[0]?.attempt_count === 0 && unrelated[0]?.last_http_status === null &&
    unrelated[0]?.last_error_code === null
}

try {
  const existingDeliverable = await rows(
    'awin_conversion_outbox?state=in.(pending,retry,processing)&select=id&limit=1',
  )
  if (existingDeliverable.length !== 0) {
    throw new Error('BLOCKED: unrelated development outbox delivery is pending')
  }
  await rest('customers', {
    method: 'POST',
    body: refs.map((orderRef, index) => ({
      id: customers[index],
      email: `task6-${randomBytes(8).toString('hex')}@example.invalid`,
      first_name: 'Synthetic',
      stripe_customer_id: `cus_${orderRef.slice(3)}`,
      kit_id: 'ground',
    })),
  })
  await rest('orders', {
    method: 'POST',
    body: refs.map((orderRef, index) => ({
      id: orders[index],
      customer_id: customers[index],
      stripe_payment_id: orderRef,
      kit_id: 'ground',
      order_type: 'first_box',
      amount_pence: 6500,
      status: 'paid',
      source: 'first_batch',
    })),
  })
  await rest('events', {
    method: 'POST',
    body: refs.map((orderRef) => ({
      stripe_event_id: `payment_intent.succeeded:${orderRef}`,
      event_type: 'payment_intent.succeeded',
      customer_id: null,
      data: {
        state: 'processing',
        payment_intent_id: orderRef,
        stripe_event_id: `evt_${orderRef.slice(3)}`,
        claim_token: randomUUID(),
        claimed_at: '2020-01-01T00:00:00.000Z',
        purchase_side_effects_attempted: true,
        revision: 1,
      },
    })),
  })

  await invokeWebhook(refs[0])
  let row = await outbox(refs[0])
  results.exactlyOneOutbox = row.length === 1
  results.ciphertextOnly = typeof row[0]?.awc_ciphertext === 'string' &&
    row[0].awc_ciphertext.startsWith('v1.') && /^[a-f0-9]{64}$/.test(row[0].awc_hash) &&
    !Object.hasOwn(row[0], 'awc')
  results.financialFieldsCorrect = row[0]?.customer_paid_pence === 6500 &&
    row[0]?.discount_pence === 0 && row[0]?.delivery_pence === 0 &&
    row[0]?.vat_pence === 0 && row[0]?.amount_pence === 6500 &&
    row[0]?.currency === 'GBP' && row[0]?.commission_group === 'DEFAULT'
  const storedEvent = await rows(
    `events?stripe_event_id=eq.payment_intent.succeeded:${refs[0]}&select=data`,
  )
  results.rawAttributionAbsent = !JSON.stringify([row, storedEvent]).includes('synthetic_dev_checksum')
  await invokeWebhook(refs[0])
  results.replayNoDuplicate = (await outbox(refs[0])).length === 1

  const firstPlan = planAcceptanceClaim([fixtureRefs[0]])
  await rest(`awin_conversion_outbox?order_ref=eq.${fixtureRefs[0]}`, {
    method: 'PATCH',
    body: { state: 'pending', next_attempt_at: firstPlan.nextAttemptAt },
  })
  // Simulate a real conversion arriving after preflight and fixture scheduling.
  await invokeWebhook(unrelatedRef)
  let counts = await invokeWorker(firstPlan.limit)
  if (counts.claimed !== firstPlan.limit) {
    throw new Error('development worker claimed outside exact acceptance batch')
  }
  row = await outbox(refs[0])
  results.retry429 = counts.retried === 1 && row[0]?.state === 'retry' && row[0]?.last_http_status === 429
  results.concurrencyIsolation = await unrelatedRowUnchanged()
  await suppress(refs[0])

  await invokeWebhook(refs[1])
  counts = await claimExpected([refs[1]])
  row = await outbox(refs[1])
  results.retry500 = counts.retried === 1 && row[0]?.state === 'retry' && row[0]?.last_http_status === 500
  await suppress(refs[1])

  await invokeWebhook(refs[2])
  counts = await claimExpected([refs[2]])
  row = await outbox(refs[2])
  results.sent200 = counts.sent === 1 && row[0]?.state === 'sent' && row[0]?.last_http_status === 200

  await invokeWebhook(refs[3])
  await invokeWebhook(refs[4])
  counts = await claimExpected([refs[3], refs[4]])
  const partialOk = await outbox(refs[3])
  const partialFail = await outbox(refs[4])
  results.partialIndependence = counts.sent === 1 && counts.dead_letter === 1 &&
    partialOk[0]?.state === 'sent' && partialOk[0]?.last_http_status === 206 &&
    partialFail[0]?.state === 'dead_letter' && partialFail[0]?.last_http_status === 206
  results.concurrencyIsolation = results.concurrencyIsolation &&
    await unrelatedRowUnchanged()
  results.deployedInteroperability = true
} finally {
  const cleanupFailures = []
  for (const orderRef of refs) {
    for (const path of [
      `awin_conversion_outbox?order_ref=eq.${orderRef}`,
      `events?stripe_event_id=eq.payment_intent.succeeded:${orderRef}`,
      `orders?stripe_payment_id=eq.${orderRef}`,
    ]) {
      try {
        await rest(path, { method: 'DELETE' })
      } catch {
        cleanupFailures.push('delete')
      }
    }
  }
  for (const customerId of customers) {
    try {
      await rest(`customers?id=eq.${customerId}`, { method: 'DELETE' })
    } catch {
      cleanupFailures.push('delete')
    }
  }
  try {
    const cleanupResidue = await Promise.all(refs.flatMap((orderRef, index) => [
      outbox(orderRef),
      rows(`events?stripe_event_id=eq.payment_intent.succeeded:${orderRef}&select=id`),
      rows(`orders?stripe_payment_id=eq.${orderRef}&select=id`),
      rows(`customers?id=eq.${customers[index]}&select=id`),
    ]))
    results.cleanupVerified = cleanupFailures.length === 0 &&
      cleanupResidue.every((rowsForFixture) => rowsForFixture.length === 0)
  } catch {
    results.cleanupVerified = false
  }
}

if (Object.values(results).some((value) => value !== true)) {
  console.log(JSON.stringify({ passed: false, checks: results }))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ passed: true, checks: results }))
}
