# Awin Attribution Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Awin from changing checkout flow or receiving last-click commission when another paid channel wins, while preserving valid Awin S2S conversions.

**Architecture:** A browser-only helper owns bounded Awin click/checksum state and maps known paid landing signals to an Awin channel. Checkout sends its normalised order source plus separate Awin metadata to Stripe; a shared Deno helper validates that metadata and builds the one server-to-server Awin sale URL used by the Stripe webhook.

**Tech Stack:** React 19, Vite, Vitest 2, Supabase Edge Functions on Deno, Stripe PaymentIntent metadata, Awin S2S tracking.

## Global Constraints

- Retain Awin account default `source=aw`; application code must normalise it to `first_batch`.
- Store browser attribution for exactly 30 days; never reuse legacy `localStorage.awc`.
- Valid Awin channels are exactly `aw`, `display`, `ppc`, and `email`.
- Send an Awin conversion only from the live Stripe webhook, only with both a non-empty `awc` and a validated channel.
- Do not log `awc`, include it in PostHog/Meta/TikTok events, or add a database migration.
- Do not modify consent, MasterTag route placement, product feeds, Awin partner settings, or the admin dashboard in this plan.
- Preserve Meta, Google Ads, and TikTok purchase events and their current deduplication IDs.

---

### Task 1: Add bounded browser Awin attribution

**Files:**
- Create: `web/src/lib/awinAttribution.js`
- Create: `web/src/lib/awinAttribution.test.js`

**Interfaces:**
- Produces `normalizeCheckoutSource(rawSource: unknown): 'first_batch' | 'gift' | 'tiktok_shop'`.
- Produces `resolveAwinAttribution(input): { awc?: string, channel?: 'aw' | 'display' | 'ppc' | 'email', expiresAt?: number }`.
- Produces `captureAwinAttribution(): { awc?: string, channel?: 'aw' | 'display' | 'ppc' | 'email' }` for checkout request bodies.
- Consumes browser URL, the `awc` cookie, and the `solum_awin_attribution` local-storage record only.

- [ ] **Step 1: Write the failing Vitest coverage**

Create `web/src/lib/awinAttribution.test.js` with the expected public API and the five Phase 1 behaviours.

```js
import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_TTL_MS,
  normalizeCheckoutSource,
  resolveAwinAttribution,
} from './awinAttribution.js';

describe('normalizeCheckoutSource', () => {
  it('keeps only supported one-time order sources', () => {
    expect(normalizeCheckoutSource('tiktok')).toBe('tiktok_shop');
    expect(normalizeCheckoutSource('gift')).toBe('gift');
    expect(normalizeCheckoutSource('aw')).toBe('first_batch');
    expect(normalizeCheckoutSource('unknown')).toBe('first_batch');
  });
});

describe('resolveAwinAttribution', () => {
  const now = Date.UTC(2026, 6, 30, 12, 0, 0);

  it('records an Awin landing for the programme cookie period', () => {
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/buy?source=aw&awc=129171_click',
      now,
    })).toEqual({
      awc: '129171_click', channel: 'aw', expiresAt: now + ATTRIBUTION_TTL_MS,
    });
  });

  it('keeps an Awin checksum but lets a later Meta paid click win the channel', () => {
    const existing = { awc: '129171_click', channel: 'aw', expiresAt: now + ATTRIBUTION_TTL_MS };
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/?utm_source=meta&utm_medium=paid_social',
      existing,
      now: now + 1,
    })).toEqual({
      awc: '129171_click', channel: 'display', expiresAt: now + 1 + ATTRIBUTION_TTL_MS,
    });
  });

  it('drops expired state and never reads the legacy awc local-storage key', () => {
    expect(resolveAwinAttribution({
      href: 'https://bysolum.co.uk/',
      existing: { awc: 'expired', channel: 'aw', expiresAt: now - 1 },
      legacyAwc: 'must_not_be_used',
      now,
    })).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails for the missing module**

Run: `cd web && npm run test:unit -- src/lib/awinAttribution.test.js`

Expected: FAIL with a module-not-found error for `./awinAttribution.js`.

- [ ] **Step 3: Implement the smallest browser attribution module**

Create `web/src/lib/awinAttribution.js` with no analytics SDK imports. Use this exact storage and resolution model:

```js
export const ATTRIBUTION_STORAGE_KEY = 'solum_awin_attribution';
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const VALID_ORDER_SOURCES = new Set(['first_batch', 'gift', 'tiktok_shop']);
const VALID_CHANNELS = new Set(['aw', 'display', 'ppc', 'email']);

export function normalizeCheckoutSource(rawSource) {
  if (rawSource === 'tiktok') return 'tiktok_shop';
  return VALID_ORDER_SOURCES.has(rawSource) ? rawSource : 'first_batch';
}

export function resolveAwinAttribution({ href, existing, cookieAwc, now = Date.now() }) {
  // Parse URL once. Discard an expired existing record before calculating the
  // new channel. Prioritise recognised UTM/ttclid signals over awc/source=aw.
  // Return only awc, channel, and expiresAt; do not inspect legacyAwc.
}

export function captureAwinAttribution() {
  // Read/parse ATTRIBUTION_STORAGE_KEY defensively, read the awc cookie,
  // resolve against window.location.href, persist a non-empty result, delete
  // expired/empty state, and return { awc, channel }.
}
```

Recognise paid-channel URL signals in this exact order: search (`google`, `bing`, `cpc`, `ppc`, `paid_search`) → `ppc`; paid social (`meta`, `facebook`, `instagram`, `tiktok`, `paid_social`, `social_paid`, or `ttclid`) → `display`; email (`email`) → `email`; then `awc` or `source=aw` → `aw`. If no new paid-channel signal exists, retain a valid existing record without extending its expiry.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `cd web && npm run test:unit -- src/lib/awinAttribution.test.js`

Expected: PASS; all checkout-source, expiry, and Awin-then-Meta cases pass.

- [ ] **Step 5: Commit the isolated browser helper**

```bash
git add web/src/lib/awinAttribution.js web/src/lib/awinAttribution.test.js
git commit -m "feat: add bounded Awin attribution"
```

### Task 2: Make checkout consume separate source and attribution data

**Files:**
- Modify: `web/src/App.jsx:4,69-73`
- Modify: `web/src/pages/BuyPage.jsx:9,664-678,821-824,999-1013`
- Modify: `web/src/pages/SuccessPage.jsx:4,98`
- Modify: `web/src/lib/analytics.js:260-315`

**Interfaces:**
- Consumes `normalizeCheckoutSource` and `captureAwinAttribution` from `web/src/lib/awinAttribution.js`.
- Produces PaymentIntent request fields `{ awc?: string, awin_channel?: AwinChannel }` in both BuyPage payment paths.
- Removes all browser-side Awin sale creation.

- [ ] **Step 1: Extend the failing attribution test for the checkout request shape**

Add this test to `web/src/lib/awinAttribution.test.js` before changing checkout code:

```js
it('returns only Stripe-safe Awin metadata for a valid attribution record', () => {
  expect(toAwinPaymentIntentMetadata({ awc: '129171_click', channel: 'display' }))
    .toEqual({ awc: '129171_click', awin_channel: 'display' });
  expect(toAwinPaymentIntentMetadata({ awc: '129171_click' }))
    .toEqual({ awc: '129171_click' });
});
```

Export `toAwinPaymentIntentMetadata` from `awinAttribution.js`; it is the only helper BuyPage may spread into a request body.

- [ ] **Step 2: Run the focused test to verify it fails for the missing helper**

Run: `cd web && npm run test:unit -- src/lib/awinAttribution.test.js`

Expected: FAIL because `toAwinPaymentIntentMetadata` is not exported.

- [ ] **Step 3: Implement the helper and wire all three React call sites**

Implement the new helper to omit undefined fields rather than serialising empty strings. Then apply these focused wiring changes:

```js
// App.jsx
import { captureAwinAttribution } from './lib/awinAttribution';
useEffect(() => { captureAwinAttribution(); getTikTokIds(); }, []);

// BuyPage.jsx
import { captureAwinAttribution, normalizeCheckoutSource, toAwinPaymentIntentMetadata } from '../lib/awinAttribution.js';
const source = normalizeCheckoutSource(params.get('source'));
// In both JSON request bodies:
...toAwinPaymentIntentMetadata(captureAwinAttribution()),

// SuccessPage.jsx
// Remove awinConversion from the analytics import and remove its call.
```

Delete `AWIN_MERCHANT`, `getAwc`, and `awinConversion` from `web/src/lib/analytics.js` only after App and BuyPage no longer import them. Do not alter Meta, Google Ads, or TikTok helper functions.

- [ ] **Step 4: Run the browser unit suite and static checks**

Run:

```bash
cd web && npm run test:unit -- src/lib/awinAttribution.test.js
cd web && npm run lint
cd web && npm run build
```

Expected: focused tests, lint, and production build all pass. Confirm with `rg -n "getAwc|awinConversion" web/src` that no browser-side references remain.

- [ ] **Step 5: Commit checkout safety wiring**

```bash
git add web/src/App.jsx web/src/pages/BuyPage.jsx web/src/pages/SuccessPage.jsx web/src/lib/analytics.js web/src/lib/awinAttribution.js web/src/lib/awinAttribution.test.js
git commit -m "fix: separate Awin attribution from checkout source"
```

### Task 3: Create a validated Awin S2S request builder

**Files:**
- Create: `supabase/functions/_shared/awin.ts`
- Create: `supabase/functions/_shared/awin.test.ts`

**Interfaces:**
- Produces `normalizeOrderSource(value: unknown): 'first_batch' | 'gift' | 'tiktok_shop'`.
- Produces `normalizeAwinChannel(value: unknown): 'aw' | 'display' | 'ppc' | 'email' | undefined`.
- Produces `buildAwinS2sUrl(input): string | undefined`.
- `buildAwinS2sUrl` returns undefined unless `live === true`, `awc` is non-empty, the channel is valid, `amountPence > 0`, and `orderRef` is non-empty.

- [ ] **Step 1: Write failing Deno tests for payload and fail-closed behaviour**

Create `supabase/functions/_shared/awin.test.ts` using the project’s `posthog.test.ts` assertion style:

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildAwinS2sUrl, normalizeOrderSource } from './awin.ts';

Deno.test('normalizes Awin source away from the order-flow source', () => {
  assertEquals(normalizeOrderSource('aw'), 'first_batch');
  assertEquals(normalizeOrderSource('gift'), 'gift');
  assertEquals(normalizeOrderSource('tiktok'), 'tiktok_shop');
});

Deno.test('builds an Awin-last S2S URL', () => {
  const url = new URL(buildAwinS2sUrl({
    live: true, amountPence: 8500, orderRef: 'pi_123', awc: '129171_click', channel: 'aw',
  })!);
  assertEquals(url.searchParams.get('ch'), 'aw');
  assertEquals(url.searchParams.get('cks'), '129171_click');
  assertEquals(url.searchParams.get('parts'), 'DEFAULT:85.00');
});

Deno.test('uses display when Meta was the last paid click', () => {
  const url = new URL(buildAwinS2sUrl({
    live: true, amountPence: 6500, orderRef: 'pi_456', awc: '129171_click', channel: 'display',
  })!);
  assertEquals(url.searchParams.get('ch'), 'display');
});

Deno.test('fails closed for missing channel, missing checksum, or test payment', () => {
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: 'pi_1', awc: 'x' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: 'pi_1', channel: 'aw' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: false, amountPence: 6500, orderRef: 'pi_1', awc: 'x', channel: 'aw' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: 'pi_1', awc: 'x', channel: 'meta' }), undefined);
});
```

- [ ] **Step 2: Run the Deno test to verify it fails for the missing module**

Run: `deno test supabase/functions/_shared/awin.test.ts`

Expected: FAIL with a module-not-found error for `./awin.ts`.

- [ ] **Step 3: Implement a pure, no-fetch S2S URL builder**

Create `supabase/functions/_shared/awin.ts`. Keep network I/O out of this file.

```ts
export const AWIN_CHANNELS = ['aw', 'display', 'ppc', 'email'] as const;
type AwinChannel = typeof AWIN_CHANNELS[number];
export type AwinS2sInput = {
  live: boolean;
  amountPence: number;
  orderRef: string;
  awc?: string;
  channel?: unknown;
};

export function normalizeOrderSource(value: unknown): 'first_batch' | 'gift' | 'tiktok_shop' {
  if (value === 'tiktok') return 'tiktok_shop';
  return value === 'gift' || value === 'tiktok_shop' || value === 'first_batch'
    ? value
    : 'first_batch';
}

export function normalizeAwinChannel(value: unknown): AwinChannel | undefined {
  return AWIN_CHANNELS.includes(value as AwinChannel) ? value as AwinChannel : undefined;
}

export function buildAwinS2sUrl(input: AwinS2sInput): string | undefined {
  // Validate all five preconditions before constructing URLSearchParams.
  // Use tt=ss, tv=2, merchant=129171, amount in pounds with two decimals,
  // parts=DEFAULT:<amount>, cr=GBP, ref, ch, and cks.
}
```

- [ ] **Step 4: Run Deno tests to verify the helper passes**

Run: `deno test supabase/functions/_shared/awin.test.ts`

Expected: PASS; the URL’s `ch=display` case and all fail-closed cases pass.

- [ ] **Step 5: Commit the shared edge helper**

```bash
git add supabase/functions/_shared/awin.ts supabase/functions/_shared/awin.test.ts
git commit -m "feat: validate Awin server conversion payloads"
```

### Task 4: Wire validated metadata into PaymentIntent creation and webhook delivery

**Files:**
- Modify: `supabase/functions/create-first-box-payment-intent/index.ts:1,34,55,88-104`
- Modify: `supabase/functions/stripe-webhook/index.ts:1-3,404-426,430,494`

**Interfaces:**
- Consumes `normalizeOrderSource`, `normalizeAwinChannel`, and `buildAwinS2sUrl` from `../_shared/awin.ts`.
- Stores validated `source`, `awc`, and `awin_channel` in Stripe PaymentIntent metadata.
- Produces at most one server-to-server `fetch` to Awin per processed paid PaymentIntent.

- [ ] **Step 1: Make the minimal server wiring changes**

In `create-first-box-payment-intent/index.ts`:

```ts
import { normalizeAwinChannel, normalizeOrderSource } from '../_shared/awin.ts';
// Destructure awin_channel from body.
const effectiveSource = normalizeOrderSource(source);
const effectiveAwinChannel = normalizeAwinChannel(awin_channel);
// Store awc only when non-empty and awin_channel only when valid.
```

In `stripe-webhook/index.ts`:

```ts
import { buildAwinS2sUrl } from '../_shared/awin.ts';

async function sendAwinPurchaseEvent(opts: AwinS2sInput) {
  const url = buildAwinS2sUrl(opts);
  if (!url) return;
  const res = await fetch(url);
  console.log('awin_s2s', res.status, opts.orderRef);
}

// Destructure awin_channel from PaymentIntent metadata and pass it as channel.
```

Delete the old hard-coded `ch: 'aw'` URLSearchParams construction. Do not log the checksum or full URL.

- [ ] **Step 2: Verify server helper, browser suite, lint, and production build**

Run:

```bash
deno test supabase/functions/_shared/awin.test.ts
cd web && npm run test:unit
cd web && npm run lint
cd web && npm run build
```

Expected: all commands pass. Confirm `rg -n "channel: 'aw'|ch: 'aw'|getAwc|awinConversion" web/src supabase/functions --glob '!**/*.test.*'` returns no production Awin hard-code or browser conversion references.

- [ ] **Step 3: Commit the complete Phase 1 delivery**

```bash
git add supabase/functions/create-first-box-payment-intent/index.ts supabase/functions/stripe-webhook/index.ts supabase/functions/_shared/awin.ts supabase/functions/_shared/awin.test.ts
git commit -m "fix: deduplicate Awin attribution by paid channel"
```

### Task 5: Validate staged release behaviour without changing Awin settings

**Files:**
- Modify: none

**Interfaces:**
- Consumes the built client and the deployed development Edge Functions.
- Produces a release decision backed by test output and Awin transaction diagnostics.

- [ ] **Step 1: Run a local checkout-routing smoke test**

Run the Vite application:

```bash
cd web && npm run dev -- --host 127.0.0.1
```

Then visit:

```text
/buy?source=aw&awc=129171_test_checksum&kit=ritual
```

Expected: the page presents the standard one-time RITUAL checkout, not the legacy subscription route. Do not complete a live payment.

- [ ] **Step 2: Obtain a separate release instruction before deployment**

Do not deploy source code or Edge Functions in this task. Once a release is explicitly requested, first deploy the web build and both Edge Functions to the development environment; then repeat the same verified revisions in production. The release handoff must record the deployment IDs and these two outcomes: one Awin-last transaction with the PaymentIntent ID as `ref`, and an Awin-then-Meta journey submitted with `ch=display` rather than `ch=aw`.
