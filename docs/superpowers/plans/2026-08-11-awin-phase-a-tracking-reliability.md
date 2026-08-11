# AWIN Phase A — Tracking Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AWIN landing capture, MasterTag placement, feed delivery, and conversion submission reliable without putting AWIN network calls in the Stripe webhook critical path.

**Architecture:** The storefront owns a tested route allow-list and calls a dedicated `track.bysolum.co.uk` cookie service. The Stripe webhook persists one encrypted, idempotent outbox item; a scheduled Edge Function delivers it through AWIN's authenticated Conversion API and records retry-safe outcomes.

**Tech Stack:** React 19, Vite, Vitest, Supabase/Postgres, Deno Edge Functions, Stripe webhooks, AWS SAM, API Gateway HTTP API, Lambda Node.js 20, Route 53, AWIN Conversion API.

## Global Constraints

- Advertiser ID is exactly `129171`.
- Attribution expires after exactly 30 days (`2592000` seconds).
- Valid channels are exactly `aw`, `display`, `ppc`, and `email`.
- `order_ref` is the Stripe PaymentIntent ID and is unique.
- Conversion API authentication uses `x-api-key`; never put the key in a URL.
- Do not log raw `awc`, API keys, request bodies, customer email, or Stripe client secrets.
- Do not send `awc` to PostHog, Meta, TikTok, or the admin client.
- Stripe/orders remain the financial source of truth.
- Development uses fixture/stub provider responses.
- Production verification is read-only; never run production checkout E2E or synthetic AWIN conversions.
- Do not deploy production during plan execution without a separate explicit deployment instruction.

---

### Task 1: Load the MasterTag only on approved public routes

**Files:**
- Create: `web/src/lib/awinMasterTag.js`
- Create: `web/src/lib/awinMasterTag.test.js`
- Modify: `web/src/App.jsx`
- Modify: `web/index.html`

**Interfaces:**
- Produces: `shouldLoadAwinMasterTag({ hostname, pathname, webdriver }): boolean`.
- Produces: `ensureAwinMasterTag(documentRef): HTMLScriptElement | null`.
- Produces: `mustReloadWithoutAwin({ pathname, masterTagPresent }): boolean` so an SPA transition cannot carry an executed tag into a sensitive route.
- Consumes: React Router `useLocation()` in a small `AwinMasterTagGate` component mounted inside `BrowserRouter`.

- [ ] **Step 1: Write the failing route-policy tests**

```js
import { describe, expect, it } from 'vitest'
import { mustReloadWithoutAwin, shouldLoadAwinMasterTag } from './awinMasterTag.js'

const prod = (pathname) => ({
  hostname: 'www.bysolum.co.uk',
  pathname,
  webdriver: false,
})

describe('shouldLoadAwinMasterTag', () => {
  it.each(['/', '/full', '/guide', '/guide/back-care', '/ritual', '/product/body-wash', '/success'])(
    'allows the public route %s',
    (pathname) => expect(shouldLoadAwinMasterTag(prod(pathname))).toBe(true),
  )

  it.each(['/buy', '/checkout', '/account', '/creators', '/contact', '/confirm', '/email-preview'])(
    'blocks the sensitive route %s',
    (pathname) => expect(shouldLoadAwinMasterTag(prod(pathname))).toBe(false),
  )

  it('blocks development and WebDriver', () => {
    expect(shouldLoadAwinMasterTag({ ...prod('/'), hostname: 'localhost' })).toBe(false)
    expect(shouldLoadAwinMasterTag({ ...prod('/'), webdriver: true })).toBe(false)
  })

  it('requires one clean document reload when an executed tag reaches a blocked route', () => {
    expect(mustReloadWithoutAwin({ pathname: '/buy', masterTagPresent: true })).toBe(true)
    expect(mustReloadWithoutAwin({ pathname: '/buy', masterTagPresent: false })).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run: `npm --prefix web run test:unit -- src/lib/awinMasterTag.test.js`

Expected: FAIL because `awinMasterTag.js` does not exist.

- [ ] **Step 3: Implement the pure policy and idempotent loader**

```js
const PUBLIC_EXACT = new Set(['/', '/full', '/guide', '/ritual', '/success'])
const PUBLIC_PREFIXES = ['/guide/', '/product/']
const MASTER_TAG_ID = 'solum-awin-mastertag'

export function shouldLoadAwinMasterTag({ hostname, pathname, webdriver }) {
  if (!/^(www\.)?bysolum\.co\.uk$/.test(hostname) || webdriver === true) return false
  return PUBLIC_EXACT.has(pathname)
    || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function ensureAwinMasterTag(documentRef) {
  if (documentRef.getElementById(MASTER_TAG_ID)) return null
  const script = documentRef.createElement('script')
  script.id = MASTER_TAG_ID
  script.src = 'https://www.dwin1.com/129171.js'
  script.defer = true
  documentRef.body.appendChild(script)
  return script
}

export function mustReloadWithoutAwin({ pathname, masterTagPresent }) {
  return masterTagPresent && !PUBLIC_EXACT.has(pathname)
    && !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
```

Remove the inline AWIN script from `web/index.html`. In `App.jsx`, add a component inside `BrowserRouter`:

```jsx
function AwinMasterTagGate() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (mustReloadWithoutAwin({
      pathname,
      masterTagPresent: Boolean(document.getElementById('solum-awin-mastertag')),
    })) {
      window.location.replace(window.location.href)
      return
    }
    if (shouldLoadAwinMasterTag({
      hostname: window.location.hostname,
      pathname,
      webdriver: navigator.webdriver,
    })) ensureAwinMasterTag(document)
  }, [pathname])

  return null
}
```

Import `useLocation`, `ensureAwinMasterTag`, `mustReloadWithoutAwin`, and `shouldLoadAwinMasterTag`; mount `<AwinMasterTagGate />` immediately inside the router.

- [ ] **Step 4: Verify route tests, lint, and build**

Run:

```bash
npm --prefix web run test:unit -- src/lib/awinMasterTag.test.js
npm --prefix web run lint
npm --prefix web run build
```

Expected: all commands exit 0. `rg -n 'dwin1.com/129171.js' web` returns exactly one production reference in `awinMasterTag.js`.

Manually verify in development routing tests that an internal public → `/buy` transition performs one full-document navigation and the new `/buy` document has no MasterTag element. The absent element prevents a reload loop.

- [ ] **Step 5: Commit the route-safe tag**

```bash
git add web/index.html web/src/App.jsx web/src/lib/awinMasterTag.js web/src/lib/awinMasterTag.test.js
git commit -m "fix: gate AWIN MasterTag by route"
```

---

### Task 2: Correct the clean feed route and programme copy

**Files:**
- Modify: `amplify.yml`
- Create: `scripts/awin/verify-feed.mjs`
- Modify: `artefacts/SOLUM-awin-profile-copy.txt`
- Modify: `docs/awin-awc-cookie-deployment.md`
- Test: `scripts/awin/verify-feed.test.mjs`

**Interfaces:**
- Produces: `assertAwinFeedResponse(responseText, contentType): void`.
- Consumes: `AWIN_FEED_ORIGIN` only in the verification script; the production rewrite target is the fixed production Edge Function URL.

- [ ] **Step 1: Write the failing feed-contract test**

```js
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test scripts/awin/verify-feed.test.mjs`

Expected: FAIL because the verification module does not exist.

- [ ] **Step 3: Implement the verifier and Amplify proxy rule**

```js
export function assertAwinFeedResponse(text, contentType) {
  if (!contentType.toLowerCase().includes('text/csv')) throw new Error('AWIN feed is not CSV')
  const lines = text.trim().split(/\r?\n/)
  if (!lines[0]?.startsWith('product_id,product_name,')) throw new Error('AWIN feed header is invalid')
  if (!lines.some((line) => line.startsWith('ground,'))) throw new Error('GROUND is missing')
  if (!lines.some((line) => line.startsWith('ritual,'))) throw new Error('RITUAL is missing')
}
```

Insert this rule before the SPA rule in `amplify.yml`:

```yaml
    - source: '/feeds/awin.csv'
      target: 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed'
      status: '200'
```

Replace the profile claims with these fixed commercial facts:

```text
Commission: 5% standard commission on valid sales, with selected partner-specific arrangements agreed individually.
Attribution period: 30 days.
Products: one-time GROUND (£65) and RITUAL (£85) kits.
Delivery: free standard UK delivery while the current launch promotion is active.
Subscriptions: planned for a later release and not currently available.
Coupon: no coupon code is required for the free-delivery promotion.
```

Rewrite `docs/awin-awc-cookie-deployment.md` to point to the tracking-subdomain deployment in Task 3 and explicitly mark the old CloudFront Function as superseded.

- [ ] **Step 4: Verify copy, YAML, and feed contract**

Run:

```bash
node --test scripts/awin/verify-feed.test.mjs
rg -n '10%|45 days|45-day|subscriptions.*live|Max-Age=31536000' artefacts/SOLUM-awin-profile-copy.txt docs/awin-awc-cookie-deployment.md
npm --prefix web run build
```

Expected: Node tests and build pass; the `rg` command returns no matches.

- [ ] **Step 5: Commit feed and programme metadata**

```bash
git add amplify.yml scripts/awin/verify-feed.mjs scripts/awin/verify-feed.test.mjs artefacts/SOLUM-awin-profile-copy.txt docs/awin-awc-cookie-deployment.md
git commit -m "fix: align AWIN feed and programme terms"
```

---

### Task 3: Build the isolated first-party tracking endpoint

**Files:**
- Create: `infra/awin-tracking/template.yaml`
- Create: `infra/awin-tracking/src/index.mjs`
- Create: `infra/awin-tracking/src/index.test.mjs`
- Create: `infra/awin-tracking/package.json`
- Create: `web/src/lib/awinCookieBridge.js`
- Create: `web/src/lib/awinCookieBridge.test.js`
- Modify: `web/src/lib/awinAttribution.js`
- Modify: `web/src/App.jsx`
- Modify: `web/src/pages/BuyPage.jsx`
- Modify: `supabase/functions/create-first-box-payment-intent/index.ts`
- Modify: `docs/awin-awc-cookie-deployment.md`

**Interfaces:**
- Lambda produces `POST /awin/click` and `POST /awin/resolve`.
- `POST /awin/click` consumes `{ awc: string }`, sets the 30-day HttpOnly cookie, and returns `{ stored: true }`.
- `POST /awin/resolve` consumes no body and returns `{ token: string, expires_at: string }` or `{ token: null }`.
- Browser produces `storeAwcCookie(awc): Promise<void>` and `resolveAwcToken(): Promise<string | undefined>`.
- PaymentIntent function consumes optional `awin_attribution_token` and resolves it with `AWIN_ATTRIBUTION_SECRET`.

- [ ] **Step 1: Write failing Lambda handler tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from './index.mjs'

const env = {
  allowedOrigins: ['https://www.bysolum.co.uk'],
  cookieDomain: '.bysolum.co.uk',
  secret: 'development-secret-development-secret',
  now: () => Date.parse('2026-08-11T12:00:00Z'),
}

test('stores a valid checksum without echoing it', async () => {
  const response = await createHandler(env)({
    requestContext: { http: { method: 'POST', path: '/awin/click' } },
    headers: { origin: 'https://www.bysolum.co.uk' },
    body: JSON.stringify({ awc: '129171_example' }),
  })
  assert.equal(response.statusCode, 200)
  assert.match(response.cookies[0], /Max-Age=2592000/)
  assert.doesNotMatch(response.body, /129171_example/)
})

test('rejects an unapproved origin', async () => {
  const response = await createHandler(env)({
    requestContext: { http: { method: 'POST', path: '/awin/click' } },
    headers: { origin: 'https://evil.example' },
    body: JSON.stringify({ awc: '129171_example' }),
  })
  assert.equal(response.statusCode, 403)
})
```

- [ ] **Step 2: Run the Lambda tests and verify the missing-module failure**

Run: `node --test infra/awin-tracking/src/index.test.mjs`

Expected: FAIL because `index.mjs` does not exist.

- [ ] **Step 3: Implement strict origin, checksum, cookie, and token helpers**

Use Node `crypto` AES-256-GCM with a key derived by SHA-256 from `AWIN_ATTRIBUTION_SECRET`. The token payload is exactly:

```js
{
  v: 1,
  awc: normalizedAwc,
  exp: Math.floor(now() / 1000) + 300,
}
```

Reject checksum values outside `1..500` characters or outside `/^[A-Za-z0-9._~-]+$/`. Return these headers for approved origins:

```js
{
  'access-control-allow-origin': origin,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'content-type',
  'content-type': 'application/json',
  'vary': 'Origin',
  'cache-control': 'no-store',
}
```

Set the cookie exactly as:

```js
`awc=${encodeURIComponent(awc)}; Domain=${cookieDomain}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`
```

The resolve handler reads `event.cookies`, encrypts the 5-minute token, and never logs or returns the checksum.

- [ ] **Step 4: Define the AWS SAM stack**

`template.yaml` must create:

- one Node.js 20 Lambda with 128 MB memory and 5-second timeout;
- one HTTP API with routes `POST /awin/click`, `POST /awin/resolve`, and `OPTIONS /awin/{proxy+}`;
- throttling at 10 requests/second with burst 20;
- a custom domain parameter (`track-dev.bysolum.co.uk` or `track.bysolum.co.uk`);
- an ACM certificate ARN parameter in `eu-west-2`;
- an API mapping for the root stage;
- environment values `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, and a Secrets Manager dynamic reference for `AWIN_ATTRIBUTION_SECRET`;
- CloudWatch log retention of 14 days;
- outputs for API endpoint and custom-domain target.

Do not create or change the storefront CloudFront distribution.

- [ ] **Step 5: Write and test the browser bridge**

```js
const PROD_TRACKING_ORIGIN = 'https://track.bysolum.co.uk'

export function trackingOrigin(hostname) {
  return /^(www\.)?bysolum\.co\.uk$/.test(hostname)
    ? PROD_TRACKING_ORIGIN
    : 'https://track-dev.bysolum.co.uk'
}

export async function storeAwcCookie(awc, fetchImpl = fetch) {
  if (typeof awc !== 'string' || awc.length < 1 || awc.length > 500) return false
  const response = await fetchImpl(`${trackingOrigin(location.hostname)}/awin/click`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awc }),
  })
  return response.ok
}

export async function resolveAwcToken(fetchImpl = fetch) {
  const response = await fetchImpl(`${trackingOrigin(location.hostname)}/awin/resolve`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
  })
  if (!response.ok) return undefined
  const body = await response.json()
  return typeof body.token === 'string' ? body.token : undefined
}
```

Add Vitest cases for production/development origin selection, credentialed requests, blank checksum suppression, and `token: null`.

- [ ] **Step 6: Wire landing capture and checkout fallback**

In `App.jsx`, read `new URLSearchParams(window.location.search).get('awc')` once on landing and call `storeAwcCookie(urlAwc)` with a caught, non-logging promise only when the parameter is present. In both BuyPage PaymentIntent paths, use the current direct `awc` when present; otherwise call `resolveAwcToken()` and send `awin_attribution_token`.

Add a Deno helper `resolveAwinCheckoutAttribution({ awc, token, channel, secret, now }): Promise<{ awc?: string; channel?: AwinChannel }>` in `_shared/awin.ts`. It validates the direct path or decrypts the 5-minute token with Web Crypto AES-GCM. Invalid/expired tokens fail closed.

- [ ] **Step 7: Run all focused checks**

Run:

```bash
node --test infra/awin-tracking/src/index.test.mjs
npm --prefix web run test:unit -- src/lib/awinCookieBridge.test.js src/lib/awinAttribution.test.js
deno test supabase/functions/_shared/awin.test.ts
npm --prefix web run lint
npm --prefix web run build
sam validate --template-file infra/awin-tracking/template.yaml
```

Expected: all commands pass. If `sam` is unavailable, stop this task and install/enable the AWS SAM CLI before deployment; do not replace validation with an unreviewed console-only stack.

- [ ] **Step 8: Commit the cookie service**

```bash
git add infra/awin-tracking web/src/lib/awinCookieBridge.js web/src/lib/awinCookieBridge.test.js web/src/lib/awinAttribution.js web/src/App.jsx web/src/pages/BuyPage.jsx supabase/functions/_shared/awin.ts supabase/functions/_shared/awin.test.ts supabase/functions/create-first-box-payment-intent/index.ts docs/awin-awc-cookie-deployment.md
git commit -m "feat: add first-party AWIN attribution service"
```

---

### Task 4: Add the encrypted conversion outbox and atomic claim functions

**Files:**
- Create: `supabase/migrations/20260811000001_awin_conversion_outbox.sql`
- Create: `supabase/functions/_shared/awinOutbox.ts`
- Create: `supabase/functions/_shared/awinOutbox.test.ts`

**Interfaces:**
- Produces database RPCs `claim_awin_conversion_batch(p_limit integer, p_worker_id uuid, p_lease_seconds integer)`, `complete_awin_conversion(p_id uuid, p_worker_id uuid, p_http_status integer, p_batch_id text, p_provider_transaction_id text)`, and `retry_awin_conversion(p_id uuid, p_worker_id uuid, p_state text, p_next_attempt_at timestamptz, p_http_status integer, p_error_code text)`.
- Produces `encryptAwc(awc, secret): Promise<string>`, `decryptAwc(ciphertext, secret): Promise<string>`, and `hashAwc(awc): Promise<string>`.
- State enum: `pending | processing | sent | retry | dead_letter | suppressed`.

- [ ] **Step 1: Write failing crypto and retry tests**

```ts
import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { decryptAwc, encryptAwc, retryDecision } from './awinOutbox.ts'

Deno.test('AWC encryption round-trips without plaintext output', async () => {
  const encrypted = await encryptAwc('129171_example', 'development-secret-development-secret')
  assertNotEquals(encrypted.includes('129171_example'), true)
  assertEquals(await decryptAwc(encrypted, 'development-secret-development-secret'), '129171_example')
})

Deno.test('retry decision separates transient and permanent responses', () => {
  assertEquals(retryDecision({ status: 429, attempt: 1 }).state, 'retry')
  assertEquals(retryDecision({ status: 500, attempt: 1 }).state, 'retry')
  assertEquals(retryDecision({ status: 400, attempt: 1 }).state, 'dead_letter')
  assertEquals(retryDecision({ status: 500, attempt: 8 }).state, 'dead_letter')
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinOutbox.test.ts`

Expected: FAIL because `awinOutbox.ts` is missing.

- [ ] **Step 3: Implement encryption and bounded retry decisions**

Use AES-256-GCM and return a versioned base64url envelope `v1.<iv>.<ciphertext>`. Define `MAX_ATTEMPTS = 8`. Retry `408`, `425`, `429`, and `500..599`; calculate `nextAttemptMs = min(900000, 15000 * 2 ** (attempt - 1)) + deterministic jitter injected in tests`.

- [ ] **Step 4: Create the server-only table and RPCs**

The migration creates the exact columns from the approved design plus:

```sql
constraint awin_conversion_outbox_state_check
  check (state in ('pending','processing','sent','retry','dead_letter','suppressed')),
constraint awin_conversion_outbox_channel_check
  check (channel in ('aw','display','ppc','email')),
constraint awin_conversion_outbox_group_check
  check (commission_group in ('DEFAULT','NEW','EXISTING')),
constraint awin_conversion_outbox_amount_check check (amount_pence > 0),
constraint awin_conversion_outbox_currency_check check (currency = 'GBP')
```

Enable RLS, revoke all from `public`, `anon`, and `authenticated`, and grant only `service_role`. The claim RPC uses `FOR UPDATE SKIP LOCKED`, sets `lease_expires_at`, increments `attempt_count`, and returns at most `p_limit` rows. Completion and retry RPCs require matching `worker_id` and a live lease.

- [ ] **Step 5: Verify migration statically and with a development database**

Run:

```bash
deno test supabase/functions/_shared/awinOutbox.test.ts
supabase db lint --linked
supabase db push --dry-run
```

Expected: tests pass; database lint and dry run report no destructive change. Apply only to development in this task, then verify anon/authenticated `SELECT` fails and two concurrent claims do not return the same row.

- [ ] **Step 6: Commit outbox persistence**

```bash
git add supabase/migrations/20260811000001_awin_conversion_outbox.sql supabase/functions/_shared/awinOutbox.ts supabase/functions/_shared/awinOutbox.test.ts
git commit -m "feat: add AWIN conversion outbox"
```

---

### Task 5: Build the authenticated AWIN delivery worker

**Files:**
- Create: `supabase/functions/_shared/awinConversionApi.ts`
- Create: `supabase/functions/_shared/awinConversionApi.test.ts`
- Create: `supabase/functions/awin-conversion-worker/index.ts`
- Create: `supabase/functions/awin-conversion-worker/config.toml`
- Modify: `supabase/config.toml`

**Interfaces:**
- Produces `buildConversionOrder(input): AwinConversionOrder`.
- Produces `parseConversionResponse(status, body): Map<string, DeliveryOutcome>`.
- Edge Function consumes `AWIN_CONVERSION_API_KEY`, `AWIN_OUTBOX_ENCRYPTION_KEY`, and `AWIN_WORKER_SECRET`.
- Edge Function requires `Authorization: Bearer <AWIN_WORKER_SECRET>` and accepts `{ limit?: number }` with `1..100`.

- [ ] **Step 1: Write failing payload and partial-response tests**

```ts
Deno.test('builds the authenticated AWIN order payload', () => {
  assertEquals(buildConversionOrder({
    orderRef: 'pi_123', amountPence: 8500, currency: 'GBP', channel: 'aw',
    awc: '129171_click', commissionGroup: 'DEFAULT', customerAcquisition: 'NEW',
  }), {
    orderReference: 'pi_123', amount: 85, channel: 'aw', currency: 'GBP',
    awc: '129171_click', customerAcquisition: 'NEW',
    commissionGroups: [{ code: 'DEFAULT', amount: 85 }],
    custom: { '1': 'solum-outbox-v1' },
  })
})

Deno.test('parses 206 outcomes per order reference', () => {
  const outcomes = parseConversionResponse(206, {
    batchId: 'batch-1',
    successfulOrders: [{ orderReference: 'pi_ok', correlationId: 'c1' }],
    failedOrders: [{ order: { orderReference: 'pi_bad' }, errors: [{ field: 'awc', message: 'invalid' }] }],
  })
  assertEquals(outcomes.get('pi_ok')?.state, 'sent')
  assertEquals(outcomes.get('pi_bad')?.state, 'dead_letter')
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `deno test supabase/functions/_shared/awinConversionApi.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the request and response contract**

POST batches to `https://api.awin.com/s2s/advertiser/129171/orders` with:

```ts
headers: {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
}
```

Use `customerAcquisition: 'NEW' | 'RETURNING'`; Phase A sends `NEW` only when already known and otherwise omits it. Accept 200/202/206. For 202, retain `processing` only if a batch ID exists and schedule reconciliation; for 206, update each item independently. Never persist AWIN error messages verbatim; map them to `VALIDATION_FAILED`, `AUTH_FAILED`, `RATE_LIMITED`, `PROVIDER_5XX`, or `UNKNOWN_PROVIDER_RESPONSE`.

- [ ] **Step 4: Implement the authenticated worker**

The worker claims up to 100 rows, decrypts each checksum, builds one batch, sends after a 10-second minimum age and before the preferred 60-second window where possible, and completes/retries each row through RPCs. It uses a 5-second fetch timeout and returns only counts:

```json
{"claimed":2,"sent":1,"retried":1,"dead_letter":0}
```

Set `verify_jwt = false` only because the worker uses its own constant-time bearer-secret check. Browser CORS is not enabled.

For deterministic development acceptance, accept `AWIN_CONVERSION_API_BASE_URL` only when `SUPABASE_URL` contains the development project ref `rodvvmfzkyjsqbufkjbc`. In production, ignore that variable and always use `https://api.awin.com`. Development points the variable to a local/stub HTTPS responder returning fixture 200, 206, 429, and 500 responses.

- [ ] **Step 5: Verify worker tests and secrets scanning**

Run:

```bash
deno test supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/awinOutbox.test.ts
rg -n 'AWIN_CONVERSION_API_KEY|AWIN_OUTBOX_ENCRYPTION_KEY|AWIN_WORKER_SECRET' supabase/functions
rg -n 'console\.(log|error).*awc|JSON\.stringify\(.*orders' supabase/functions/awin-conversion-worker supabase/functions/_shared
```

Expected: tests pass; secret names appear only in environment reads; the unsafe-log scan returns no matches.

- [ ] **Step 6: Commit the worker**

```bash
git add supabase/functions/_shared/awinConversionApi.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/awin-conversion-worker supabase/config.toml
git commit -m "feat: deliver AWIN conversions from outbox"
```

---

### Task 6: Make the Stripe webhook enqueue rather than deliver

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`
- Modify: `supabase/functions/_shared/purchaseSafety.ts`
- Modify: `supabase/functions/_shared/purchaseSafety.test.ts`
- Modify: `supabase/functions/_shared/awin.test.ts`
- Modify: `docs/manual-changes-log.md`

**Interfaces:**
- Produces `classifyAwinEligibility(pi): { eligible: boolean; reason: string }`.
- Produces `enqueueAwinConversion(supabase, input): Promise<void>`.
- Removes runtime use of `sendAwinPurchaseEvent` and `markPaymentIntentAwinAttempted`.

- [ ] **Step 1: Add failing eligibility and idempotency tests**

Test these exact cases:

```ts
assertEquals(classifyAwinEligibility({ livemode: true, awc: 'x', channel: 'aw' }).eligible, true)
assertEquals(classifyAwinEligibility({ livemode: false, awc: 'x', channel: 'aw' }).reason, 'test_payment')
assertEquals(classifyAwinEligibility({ livemode: true, awc: '', channel: 'aw' }).reason, 'missing_awc')
assertEquals(classifyAwinEligibility({ livemode: true, awc: 'x', channel: 'organic' }).reason, 'invalid_channel')
```

Mock two enqueue attempts for the same PaymentIntent and assert the second performs an upsert/no-op rather than creating a second row.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `deno test supabase/functions/_shared/purchaseSafety.test.ts supabase/functions/_shared/awin.test.ts`

Expected: FAIL for the missing eligibility/enqueue behaviour.

- [ ] **Step 3: Replace fire-and-forget delivery with persistence**

After the order and address are durable—and before confirmation email, Meta, TikTok, or PostHog side effects—call `enqueueAwinConversion` with:

```ts
{
  orderRef: pi.id,
  orderId: order.id,
  amountPence: pi.amount,
  currency: 'GBP',
  commissionGroup: 'DEFAULT',
  channel: awin_channel,
  awc,
}
```

Encrypt `awc` and calculate `awc_hash` before the upsert. On eligible persistence failure, throw so Stripe retries the webhook. Remove the bounded AWIN fetch and the `awin_attempted` state transition; preserve compatibility when reading old event claim JSON.

- [ ] **Step 4: Verify webhook safety and full relevant suites**

Run:

```bash
deno test supabase/functions/_shared/awin.test.ts supabase/functions/_shared/awinOutbox.test.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/purchaseSafety.test.ts
npm --prefix web run test:unit
npm --prefix web run lint
npm --prefix web run build
rg -n 'sendAwinPurchaseEvent|awin_s2s|markPaymentIntentAwinAttempted' supabase/functions/stripe-webhook/index.ts
```

Expected: all suites/build pass; the final `rg` returns no matches.

- [ ] **Step 5: Development-only acceptance**

Apply the migration and deploy `stripe-webhook`, `create-first-box-payment-intent`, and `awin-conversion-worker` only to Supabase development. Set the development-only `AWIN_CONVERSION_API_BASE_URL` to the HTTPS fixture responder defined in Task 5 and use a development API key value; do not use the production AWIN key. Use a fixture webhook payload to verify one outbox row, retry transitions, and no duplicate row on replay.

- [ ] **Step 6: Commit the webhook cutover**

```bash
git add supabase/functions/stripe-webhook/index.ts supabase/functions/_shared/purchaseSafety.ts supabase/functions/_shared/purchaseSafety.test.ts supabase/functions/_shared/awin.test.ts docs/manual-changes-log.md
git commit -m "fix: enqueue AWIN conversions durably"
```

---

### Task 7: Verify Phase A without production mutations

**Files:**
- Modify: `docs/awin-awc-cookie-deployment.md`
- Modify: `docs/manual-changes-log.md`

**Interfaces:**
- Consumes all Phase A outputs.
- Produces a repeatable development deployment and production read-only acceptance checklist.

- [ ] **Step 1: Run the complete local verification set**

```bash
node --test scripts/awin/verify-feed.test.mjs infra/awin-tracking/src/index.test.mjs
npm --prefix web run test:unit
npm --prefix web run lint
npm --prefix web run build
deno test supabase/functions/_shared/awin.test.ts supabase/functions/_shared/awinOutbox.test.ts supabase/functions/_shared/awinConversionApi.test.ts supabase/functions/_shared/purchaseSafety.test.ts
sam validate --template-file infra/awin-tracking/template.yaml
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Verify development behaviour**

- Public route loads one AWIN MasterTag; `/buy`, `/checkout`, `/account`, and `/creators` load none.
- A direct HTTPS request to `track-dev.bysolum.co.uk/awin/click` sets a 30-day HttpOnly `.bysolum.co.uk` cookie. Because the current development storefront is on `amplifyapp.com`, cross-site SameSite cookie recovery is verified through Lambda integration tests until a `dev.bysolum.co.uk` storefront domain exists; local-storage attribution remains the development browser path.
- Resolve returns an opaque token and never the checksum.
- One fixture payment event creates one outbox row.
- Stubbed 429 transitions to retry; stubbed 200 transitions to sent.
- `/feeds/awin.csv` returns two-row CSV on the development storefront.

- [ ] **Step 3: Record the production rollout checklist**

The runbook must require explicit production-deployment approval and list only read-only checks after deployment: `GET`/`HEAD` public routes, MasterTag presence/absence, feed response, CloudWatch error count, sync/outbox health from real customer activity, and AWS/Supabase deployed-version inspection.

Configure the development conversion worker schedule as `* * * * *` through Supabase Scheduled Edge Functions/pg_cron. Store `AWIN_WORKER_SECRET` in Vault and send it as the bearer credential; never embed it in migration SQL or source control. The production schedule is created only during an explicitly approved production deployment.

- [ ] **Step 4: Commit the Phase A runbook**

```bash
git add docs/awin-awc-cookie-deployment.md docs/manual-changes-log.md
git commit -m "docs: add AWIN reliability rollout checks"
```
