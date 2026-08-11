import test from 'node:test'
import assert from 'node:assert/strict'
import { createDecipheriv, createHash } from 'node:crypto'
import { createHandler } from './index.mjs'

const NOW_ISO = '2026-08-11T12:00:00.000Z'
const SECRET = 'development-secret-development-secret'
const env = {
  allowedOrigins: ['https://www.bysolum.co.uk'],
  cookieDomain: '.bysolum.co.uk',
  secret: SECRET,
  now: () => Date.parse(NOW_ISO),
}

function event(path, { origin = 'https://www.bysolum.co.uk', body, cookies, method = 'POST' } = {}) {
  return {
    requestContext: { http: { method, path } },
    headers: { origin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(cookies === undefined ? {} : { cookies }),
  }
}

function decryptToken(token) {
  const packed = Buffer.from(token, 'base64url')
  const iv = packed.subarray(0, 12)
  const ciphertext = packed.subarray(12, -16)
  const tag = packed.subarray(-16)
  const key = createHash('sha256').update(SECRET).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'))
}

test('stores a valid checksum for exactly 30 days without echoing it', async () => {
  const response = await createHandler(env)(event('/awin/click', {
    body: { awc: ' 129171_example ' },
  }))

  assert.equal(response.statusCode, 200)
  assert.equal(response.cookies[0], 'awc=129171_example; Domain=.bysolum.co.uk; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax')
  assert.deepEqual(JSON.parse(response.body), { stored: true })
  assert.doesNotMatch(response.body, /129171_example/)
})

test('rejects an unapproved origin without granting CORS', async () => {
  const response = await createHandler(env)(event('/awin/click', {
    origin: 'https://evil.example',
    body: { awc: '129171_example' },
  }))

  assert.equal(response.statusCode, 403)
  assert.equal(response.headers['access-control-allow-origin'], undefined)
})

test('returns the required no-store credentialed CORS headers to an approved origin', async () => {
  const response = await createHandler(env)(event('/awin/click', {
    body: { awc: '129171_example' },
  }))

  assert.deepEqual(response.headers, {
    'access-control-allow-origin': 'https://www.bysolum.co.uk',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST,OPTIONS',
    'content-type': 'application/json',
    vary: 'Origin',
    'cache-control': 'no-store',
  })
})

test('rejects blank, oversized, or unsafe checksum values', async () => {
  for (const awc of ['', 'a'.repeat(501), 'unsafe value', 'unsafe/value']) {
    const response = await createHandler(env)(event('/awin/click', { body: { awc } }))
    assert.equal(response.statusCode, 400, `expected rejection for ${JSON.stringify(awc.slice(0, 20))}`)
    assert.equal(response.cookies, undefined)
  }
})

test('rejects malformed JSON without disclosing the request body', async () => {
  const malformed = '129171_sensitive_not_json'
  const response = await createHandler(env)({
    requestContext: { http: { method: 'POST', path: '/awin/click' } },
    headers: { origin: 'https://www.bysolum.co.uk' },
    body: malformed,
  })

  assert.equal(response.statusCode, 400)
  assert.doesNotMatch(response.body, new RegExp(malformed))
})

test('resolves the HttpOnly cookie to an opaque token expiring in exactly five minutes', async () => {
  const response = await createHandler(env)(event('/awin/resolve', {
    cookies: ['other=value', 'awc=129171_example'],
  }))
  const body = JSON.parse(response.body)

  assert.equal(response.statusCode, 200)
  assert.equal(typeof body.token, 'string')
  assert.notEqual(body.token, '129171_example')
  assert.doesNotMatch(response.body, /129171_example/)
  assert.equal(body.expires_at, '2026-08-11T12:05:00.000Z')
  assert.deepEqual(decryptToken(body.token), {
    v: 1,
    awc: '129171_example',
    exp: Math.floor(Date.parse(NOW_ISO) / 1000) + 300,
  })
})

test('returns token null for a missing or invalid cookie', async () => {
  for (const cookies of [undefined, ['awc='], ['awc=unsafe%20value'], ['awc=%E0%A4%A']]) {
    const response = await createHandler(env)(event('/awin/resolve', { cookies }))
    assert.deepEqual(JSON.parse(response.body), { token: null })
  }
})

test('supports preflight only for approved origins', async () => {
  const handler = createHandler(env)
  const approved = await handler(event('/awin/anything', { method: 'OPTIONS' }))
  const rejected = await handler(event('/awin/anything', { method: 'OPTIONS', origin: 'https://evil.example' }))

  assert.equal(approved.statusCode, 204)
  assert.equal(approved.headers['access-control-allow-origin'], 'https://www.bysolum.co.uk')
  assert.equal(approved.headers['access-control-allow-methods'], 'POST,OPTIONS')
  assert.equal(rejected.statusCode, 403)
})
