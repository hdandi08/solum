import { createCipheriv, createHash, randomBytes } from 'node:crypto'

const COOKIE_MAX_AGE_SECONDS = 2_592_000
const TOKEN_TTL_SECONDS = 300
const VALID_AWC = /^[A-Za-z0-9._~-]+$/

function normalizeAwc(value) {
  if (typeof value !== 'string') return undefined
  const awc = value.trim()
  return awc.length >= 1 && awc.length <= 500 && VALID_AWC.test(awc) ? awc : undefined
}

function requestOrigin(headers = {}) {
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === 'origin')
  return entry?.[1]
}

function approvedHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST,OPTIONS',
    'content-type': 'application/json',
    vary: 'Origin',
    'cache-control': 'no-store',
  }
}

function response(statusCode, body, headers, cookies) {
  return {
    statusCode,
    headers,
    body: body === undefined ? '' : JSON.stringify(body),
    ...(cookies ? { cookies } : {}),
  }
}

function readAwcCookie(cookies) {
  if (!Array.isArray(cookies)) return undefined
  for (const cookieHeader of cookies) {
    for (const part of String(cookieHeader).split(';')) {
      const cookie = part.trim()
      if (!cookie.startsWith('awc=')) continue
      try {
        return normalizeAwc(decodeURIComponent(cookie.slice(4)))
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

function encryptToken(awc, secret, now) {
  const exp = Math.floor(now() / 1000) + TOKEN_TTL_SECONDS
  const payload = { v: 1, awc, exp }
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const token = Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64url')
  return { token, expires_at: new Date(exp * 1000).toISOString() }
}

export function createHandler({ allowedOrigins, cookieDomain, secret, now = Date.now }) {
  const origins = new Set(allowedOrigins)

  return async function handler(event) {
    const origin = requestOrigin(event.headers)
    if (!origin || !origins.has(origin)) {
      return response(403, { error: 'Forbidden' }, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      })
    }

    const headers = approvedHeaders(origin)
    const method = event.requestContext?.http?.method
    const path = event.requestContext?.http?.path ?? event.rawPath

    if (method === 'OPTIONS') return response(204, undefined, headers)
    if (method !== 'POST') return response(405, { error: 'Method not allowed' }, headers)

    if (path === '/awin/click') {
      let parsed
      try {
        parsed = JSON.parse(event.body ?? '')
      } catch {
        return response(400, { error: 'Invalid request' }, headers)
      }
      const awc = normalizeAwc(parsed?.awc)
      if (!awc) return response(400, { error: 'Invalid request' }, headers)

      const cookie = `awc=${encodeURIComponent(awc)}; Domain=${cookieDomain}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Secure; HttpOnly; SameSite=Lax`
      return response(200, { stored: true }, headers, [cookie])
    }

    if (path === '/awin/resolve') {
      const awc = readAwcCookie(event.cookies)
      if (!awc) return response(200, { token: null }, headers)
      if (typeof secret !== 'string' || secret.length === 0) {
        return response(500, { error: 'Service unavailable' }, headers)
      }
      return response(200, encryptToken(awc, secret, now), headers)
    }

    return response(404, { error: 'Not found' }, headers)
  }
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const handler = createHandler({
  allowedOrigins,
  cookieDomain: process.env.COOKIE_DOMAIN,
  secret: process.env.AWIN_ATTRIBUTION_SECRET,
})
