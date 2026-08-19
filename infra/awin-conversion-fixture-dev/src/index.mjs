import { createHash, timingSafeEqual } from 'node:crypto'
import { isFixtureCommissionGroupCode } from './commissionGroupCode.mjs'

const PATH = '/s2s/advertiser/129171/orders'
const MAX_BODY_BYTES = 65_536
const MAX_ORDERS = 100
const CHANNELS = new Set(['aw', 'display', 'ppc', 'email'])
const CUSTOMER_ACQUISITIONS = new Set(['NEW', 'RETURNING'])
const VALID_AWC = /^[A-Za-z0-9._~-]+$/

const FIXTURES = Object.freeze({
  sent: 'pi_s2s200dev0001',
  partialOk: 'pi_s2s206okdev001',
  partialFail: 'pi_s2s206faildev1',
  limited: 'pi_s2s429dev0001',
  broken: 'pi_s2s500dev0001',
})
const ALLOWLIST = new Set(Object.values(FIXTURES))

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }
}

function header(headers, name) {
  const entry = Object.entries(headers ?? {}).find(
    ([candidate]) => candidate.toLowerCase() === name,
  )
  return entry?.[1]
}

function authorized(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false
  const left = createHash('sha256').update(candidate).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}

function decodedBody(event) {
  if (typeof event.body !== 'string') return undefined
  try {
    return event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8')
  } catch {
    return undefined
  }
}

function validOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return false
  const keys = Object.keys(order).sort()
  const hasCustomerAcquisition = Object.hasOwn(order, 'customerAcquisition')
  const allowedKeys = [
    'amount',
    'awc',
    'channel',
    'commissionGroups',
    'currency',
    'custom',
    'orderReference',
  ]
  if (hasCustomerAcquisition) allowedKeys.push('customerAcquisition')
  allowedKeys.sort()
  if (JSON.stringify(keys) !== JSON.stringify(allowedKeys)) return false
  if (
    hasCustomerAcquisition &&
    !CUSTOMER_ACQUISITIONS.has(order.customerAcquisition)
  ) return false
  if (!ALLOWLIST.has(order.orderReference)) return false
  if (typeof order.amount !== 'number' || !Number.isFinite(order.amount) || order.amount <= 0) return false
  if (!CHANNELS.has(order.channel) || order.currency !== 'GBP') return false
  if (typeof order.awc !== 'string' || order.awc.length < 1 || order.awc.length > 500 || !VALID_AWC.test(order.awc)) return false
  if (order.custom?.['1'] !== 'solum-outbox-v1' || Object.keys(order.custom ?? {}).length !== 1) return false
  if (!Array.isArray(order.commissionGroups) || order.commissionGroups.length !== 1) return false
  const group = order.commissionGroups[0]
  return !!group && typeof group === 'object' &&
    Object.keys(group).sort().join(',') === 'amount,code' &&
    isFixtureCommissionGroupCode(group.code) && group.amount === order.amount
}

function fixtureResponse(orders) {
  const references = orders.map(({ orderReference }) => orderReference)
  if (references.length === 1 && references[0] === FIXTURES.sent) {
    return response(200, {
      batchId: 'fixture-200-dev',
      successfulOrders: [{
        orderReference: FIXTURES.sent,
        correlationId: 'fixture-tx-200-dev',
      }],
      failedOrders: [],
    })
  }
  if (
    references.length === 2 && references.includes(FIXTURES.partialOk) &&
    references.includes(FIXTURES.partialFail)
  ) {
    return response(206, {
      batchId: 'fixture-206-dev',
      successfulOrders: [{
        orderReference: FIXTURES.partialOk,
        correlationId: 'fixture-tx-206-dev',
      }],
      failedOrders: [{ orderReference: FIXTURES.partialFail }],
    })
  }
  if (references.length === 1 && references[0] === FIXTURES.limited) {
    return response(429, {}, { 'retry-after': '1' })
  }
  if (references.length === 1 && references[0] === FIXTURES.broken) {
    return response(500, {})
  }
  return response(400, { error: 'Invalid request' })
}

export function createHandler({ apiKey }) {
  return async function handler(event) {
    const method = event.requestContext?.http?.method
    const path = event.requestContext?.http?.path ?? event.rawPath
    if (path !== PATH) return response(404, { error: 'Not found' })
    if (method !== 'POST') return response(405, { error: 'Method not allowed' })

    if (!authorized(header(event.headers, 'x-api-key'), apiKey)) {
      return response(401, { error: 'Unauthorized' })
    }

    const contentLength = header(event.headers, 'content-length')
    if (contentLength !== undefined) {
      if (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES) {
        return response(413, { error: 'Request too large' })
      }
    }
    const bytes = decodedBody(event)
    if (!bytes || bytes.byteLength > MAX_BODY_BYTES) {
      return response(413, { error: 'Request too large' })
    }

    let parsed
    try {
      parsed = JSON.parse(bytes.toString('utf8'))
    } catch {
      return response(400, { error: 'Invalid request' })
    }
    if (
      !parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      Object.keys(parsed).length !== 1 || !Array.isArray(parsed.orders) ||
      parsed.orders.length < 1 || parsed.orders.length > MAX_ORDERS ||
      !parsed.orders.every(validOrder)
    ) {
      return response(400, { error: 'Invalid request' })
    }
    return fixtureResponse(parsed.orders)
  }
}

export const handler = createHandler({
  apiKey: process.env.FIXTURE_API_KEY,
})
