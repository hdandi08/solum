# Tracking & Retargeting Program — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrument the engagement events the ad platforms are blind to (`QualifiedVisit`, mid-checkout, video drop-off), reconcile PostHog purchases with Stripe via the webhook, clean up dead tracking, update the PostHog dashboards, and ship the Meta/TikTok campaign runbook.

**Architecture:** Client events go to PostHog + (where relevant) Meta/TikTok pixels via helpers in `web/src/lib/analytics.js`. `QualifiedVisit` logic is a pure, unit-tested module driven by a small stateful tracker mounted at the app root. Server-side Purchase to Meta/TikTok is already built in `supabase/functions/stripe-webhook/index.ts`; this plan adds a parallel PostHog server capture for analytics parity. PostHog dashboards are managed via the PostHog API.

**Tech Stack:** React + Vite (web), Deno edge functions (Supabase), PostHog (EU), Meta pixel/CAPI, TikTok pixel/Events API, vitest (new, for pure-logic unit tests).

## Global Constraints

- PostHog region: EU — capture host `https://eu.i.posthog.com`, project id `166881`, client key `phc_BjezQwNmSiTGyXYzg3nJNsRbGHBLi9qnCYN8YbHo8oEc`.
- Prod-host filter (dashboards): `^(www\.)?bysolum\.(com|co\.uk)\.?$`.
- Purchase dedup key across all platforms = Stripe PaymentIntent id.
- Edge-function deploys go to **both dev and prod in the same session** (dev ref `rodvvmfzkyjsqbufkjbc`).
- **Never** run DELETE/UPDATE on the prod DB without explicit per-operation approval. This plan touches no DB tables.
- Work on the `dev` git branch. Commit frequently.
- `QualifiedVisit` definition: fires once per session when EITHER a strong signal occurs (product-detail-page view OR ritual video ≥50%) OR scroll ≥50% AND dwell ≥60s. Record `reason` ∈ {`product_detail`,`ritual_50`,`scroll_dwell`}.

---

## File Structure

- `web/vitest.config.js` (new) — vitest config (jsdom not needed; pure logic).
- `web/src/lib/qualifiedVisit.js` (new) — pure `evaluateQualified(state)` decision function.
- `web/src/lib/qualifiedVisit.test.js` (new) — unit tests.
- `web/src/lib/qualifiedVisitTracker.js` (new) — stateful tracker: scroll/dwell listeners + `markProductDetail()` / `markRitualProgress(pct)`, fires once.
- `web/src/lib/analytics.js` (modify) — add `fbCustom`, `ttqTrack`; tighten `IS_PROD`.
- `web/src/App.jsx` (modify) — init the tracker.
- `web/src/pages/ProductPage.jsx` (modify) — `markProductDetail()` on view.
- `web/src/components/RitualSection.jsx` + `web/src/components/ritual/RitualVideoSelector.jsx` (modify) — `ritual_video_progress` + `markRitualProgress`.
- `web/src/pages/BuyPage.jsx` (modify) — `checkout_details_submitted`, `checkout_delivery_submitted`, unify `checkout_initiated`.
- `web/src/pages/FullSite.jsx` (modify) — section observer also watches `[data-track]`.
- `web/src/pages/SuccessPage.jsx` (modify) — add `$insert_id` to client `purchase`.
- `amplify.yml` (modify) — remove dead `VITE_AXON_PIXEL_ID` echo.
- `supabase/functions/_shared/posthog.ts` (new) — `buildPosthogPurchase()` payload builder + `sendPosthogPurchase()`.
- `supabase/functions/_shared/posthog.test.ts` (new) — payload builder test.
- `supabase/functions/stripe-webhook/index.ts` (modify) — call `sendPosthogPurchase` in both order handlers.
- `scripts/posthog/update_dashboards.py` (new) — add the new funnels/insights to the Deep Funnel dashboard.
- `docs/runbooks/2026-06-26-ads-campaign-runbook.md` (new) — Meta/TikTok 3-campaign setup.

---

### Task 1: vitest + QualifiedVisit decision logic

**Files:**
- Create: `web/vitest.config.js`
- Create: `web/src/lib/qualifiedVisit.js`
- Test: `web/src/lib/qualifiedVisit.test.js`
- Modify: `web/package.json` (add `vitest` devDep + `test:unit` script)

**Interfaces:**
- Produces: `evaluateQualified({ productDetailViewed: boolean, ritualVideoPct: number, scrollPct: number, dwellMs: number }) => 'product_detail' | 'ritual_50' | 'scroll_dwell' | null`

- [ ] **Step 1: Add vitest dev dependency**

Run: `cd web && npm i -D vitest@^2`
Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 2: Add config + script**

Create `web/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.{js,jsx}'] } });
```
In `web/package.json` `scripts`, add: `"test:unit": "vitest run"`.

- [ ] **Step 3: Write the failing test**

Create `web/src/lib/qualifiedVisit.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { evaluateQualified } from './qualifiedVisit';

const base = { productDetailViewed: false, ritualVideoPct: 0, scrollPct: 0, dwellMs: 0 };

describe('evaluateQualified', () => {
  it('returns null for a bouncer', () => {
    expect(evaluateQualified({ ...base, scrollPct: 10, dwellMs: 3000 })).toBe(null);
  });
  it('fires product_detail immediately', () => {
    expect(evaluateQualified({ ...base, productDetailViewed: true })).toBe('product_detail');
  });
  it('fires ritual_50 when ritual video >=50%', () => {
    expect(evaluateQualified({ ...base, ritualVideoPct: 55 })).toBe('ritual_50');
  });
  it('fires scroll_dwell when scroll>=50 AND dwell>=60s', () => {
    expect(evaluateQualified({ ...base, scrollPct: 60, dwellMs: 61000 })).toBe('scroll_dwell');
  });
  it('does NOT fire scroll>=50 but dwell<60s', () => {
    expect(evaluateQualified({ ...base, scrollPct: 60, dwellMs: 10000 })).toBe(null);
  });
  it('strong signal beats accumulated (product_detail wins)', () => {
    expect(evaluateQualified({ productDetailViewed: true, ritualVideoPct: 0, scrollPct: 60, dwellMs: 61000 })).toBe('product_detail');
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `cd web && npm run test:unit`
Expected: FAIL — cannot resolve `./qualifiedVisit`.

- [ ] **Step 5: Implement the module**

Create `web/src/lib/qualifiedVisit.js`:
```js
// Decides whether a visitor is "qualified" (a convertible browser) and why.
// Strong signals fire immediately; otherwise require sustained engagement.
export function evaluateQualified({ productDetailViewed = false, ritualVideoPct = 0, scrollPct = 0, dwellMs = 0 } = {}) {
  if (productDetailViewed) return 'product_detail';
  if (ritualVideoPct >= 50) return 'ritual_50';
  if (scrollPct >= 50 && dwellMs >= 60000) return 'scroll_dwell';
  return null;
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `cd web && npm run test:unit`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add web/package.json web/package-lock.json web/vitest.config.js web/src/lib/qualifiedVisit.js web/src/lib/qualifiedVisit.test.js
git commit -m "feat: QualifiedVisit decision logic + vitest"
```

---

### Task 2: Analytics helpers for custom events + prod-gate tighten

**Files:**
- Modify: `web/src/lib/analytics.js`

**Interfaces:**
- Produces: `fbCustom(event: string, props?: object): void` — Meta `trackCustom`.
- Produces: `ttqTrack(event: string, props?: object): void` — TikTok custom `track`.
- `IS_PROD` only true on real prod hosts.

- [ ] **Step 1: Tighten the prod gate**

In `web/src/lib/analytics.js`, replace:
```js
const IS_PROD = window.location.hostname.includes('bysolum');
```
with:
```js
const IS_PROD = /^(www\.)?bysolum\.(com|co\.uk)\.?$/.test(window.location.hostname);
```

- [ ] **Step 2: Add custom-event helpers**

In `web/src/lib/analytics.js`, after the `fbq` helper add:
```js
// Custom (non-standard) Meta event — e.g. QualifiedVisit
export function fbCustom(event, props = {}) {
  fbq('trackCustom', event, props);
}
```
After the `ttq` helper add:
```js
// Custom TikTok event — e.g. QualifiedVisit
export function ttqTrack(event, props = {}) {
  ttq('track', event, props);
}
```

- [ ] **Step 3: Verify build + lint**

Run: `cd web && npm run lint && npm run build`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/analytics.js
git commit -m "feat: fbCustom/ttqTrack helpers + tighten prod pixel gate to bysolum regex"
```

---

### Task 3: QualifiedVisit tracker + app wiring + product-detail signal

**Files:**
- Create: `web/src/lib/qualifiedVisitTracker.js`
- Modify: `web/src/App.jsx`
- Modify: `web/src/pages/ProductPage.jsx`

**Interfaces:**
- Consumes: `evaluateQualified` (Task 1), `capture`/`fbCustom`/`ttqTrack` (Task 2).
- Produces: `initQualifiedVisitTracker(): void`, `markProductDetail(): void`, `markRitualProgress(pct: number): void`.

- [ ] **Step 1: Create the tracker**

Create `web/src/lib/qualifiedVisitTracker.js`:
```js
import { capture, fbCustom, ttqTrack } from './analytics';
import { evaluateQualified } from './qualifiedVisit';

const SESSION_KEY = 'solum_qualified_fired';
const state = { productDetailViewed: false, ritualVideoPct: 0, scrollPct: 0, startTs: Date.now() };
let fired = false;
let interval = null;

function alreadyFired() {
  if (fired) return true;
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

function fire(reason) {
  fired = true;
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
  if (interval) { clearInterval(interval); interval = null; }
  const dwell_s = Math.round((Date.now() - state.startTs) / 1000);
  const props = { reason, dwell_s, scroll_pct: state.scrollPct };
  capture('QualifiedVisit', props);
  fbCustom('QualifiedVisit', { reason });
  ttqTrack('QualifiedVisit', { reason });
}

function evaluate() {
  if (alreadyFired()) return;
  const reason = evaluateQualified({ ...state, dwellMs: Date.now() - state.startTs });
  if (reason) fire(reason);
}

export function markProductDetail() { state.productDetailViewed = true; evaluate(); }
export function markRitualProgress(pct) { if (pct > state.ritualVideoPct) state.ritualVideoPct = pct; evaluate(); }

export function initQualifiedVisitTracker() {
  if (alreadyFired()) return;
  const onScroll = () => {
    const pct = Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
    if (pct > state.scrollPct) state.scrollPct = pct;
    evaluate();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  // dwell check — re-evaluate every 5s so the scroll+dwell combo can trip without a scroll event
  interval = setInterval(evaluate, 5000);
}
```

- [ ] **Step 2: Init the tracker at app root**

In `web/src/App.jsx`, import and call inside the component body via `useEffect`:
```jsx
import { useEffect } from 'react';
import { initQualifiedVisitTracker } from './lib/qualifiedVisitTracker';
// ... inside the App component, before the return:
useEffect(() => { initQualifiedVisitTracker(); }, []);
```
(If `App` is not already a function component with a body, wrap the existing JSX return in one.)

- [ ] **Step 3: Fire product-detail signal**

In `web/src/pages/ProductPage.jsx`, find the mount effect that calls `capture('product_page_viewed', { slug })` (~line 97) and add the import + call:
```jsx
import { markProductDetail } from '../lib/qualifiedVisitTracker';
// inside the same effect:
markProductDetail();
```

- [ ] **Step 4: Verify**

Run: `cd web && npm run lint && npm run build && npm run test:unit`
Expected: all pass.

- [ ] **Step 5: Manual smoke (dev server)**

Run `cd web && npm run dev`, open `http://localhost:5173`, open a product page; in the browser console confirm a single PostHog `QualifiedVisit` (reason `product_detail`) and that revisiting does not refire. (Pixels won't fire on localhost by design.)

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/qualifiedVisitTracker.js web/src/App.jsx web/src/pages/ProductPage.jsx
git commit -m "feat: QualifiedVisit tracker (scroll/dwell + product-detail) wired at app root"
```

---

### Task 4: Ritual video progress + QualifiedVisit ritual signal

**Files:**
- Modify: `web/src/components/RitualSection.jsx`
- Modify: `web/src/components/ritual/RitualVideoSelector.jsx`

**Interfaces:**
- Consumes: `capture` (analytics), `markRitualProgress` (Task 3).
- Produces: `ritual_video_progress` event with `{ ritual, percent, source }`.

- [ ] **Step 1: Add a progress handler to RitualSection**

In `web/src/components/RitualSection.jsx`, add near the other imports:
```jsx
import { markRitualProgress } from '../lib/qualifiedVisitTracker';
```
Add a milestone tracker ref and handler inside the component:
```jsx
const progressFired = useRef(new Set());
function onTimeUpdate(e) {
  const v = e.currentTarget;
  if (!v.duration) return;
  const pct = Math.round((v.currentTime / v.duration) * 100);
  for (const m of [25, 50, 75, 100]) {
    if (pct >= m && !progressFired.current.has(m)) {
      progressFired.current.add(m);
      capture('ritual_video_progress', { ritual: active, percent: m, source: 'home_teaser' });
      markRitualProgress(m);
    }
  }
}
```
On the `<video ref={videoRef} ...>` element (~line 179), add `onTimeUpdate={onTimeUpdate}`. Ensure `capture` and `useRef` are imported (capture already is).

- [ ] **Step 2: Repeat for the ritual page selector**

In `web/src/components/ritual/RitualVideoSelector.jsx`, apply the same pattern on its `<video ref={videoRef}>` (~line 146), with `source: 'ritual_page'` and using its own `active` state variable name. Reset `progressFired` when the selected ritual changes (clear the Set in the effect that switches video).

- [ ] **Step 3: Verify**

Run: `cd web && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 4: Manual smoke**

On dev, play a ritual video past 50%; confirm `ritual_video_progress` at 25/50 and a `QualifiedVisit` (reason `ritual_50`) in the console.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/RitualSection.jsx web/src/components/ritual/RitualVideoSelector.jsx
git commit -m "feat: ritual_video_progress milestones + QualifiedVisit ritual signal"
```

---

### Task 5: Mid-checkout events + unify checkout_initiated

**Files:**
- Modify: `web/src/pages/BuyPage.jsx`

**Interfaces:**
- Produces: `checkout_details_submitted { kit, source }`, `checkout_delivery_submitted { kit, source }`.
- `checkout_initiated` always carries `{ kit, source, price, method }` (`method` ∈ `'express' | 'standard'`).

- [ ] **Step 1: Fire details-submitted**

In `web/src/pages/BuyPage.jsx` `handleDetailsNext`, immediately before `setStep('delivery')` (~line 675), add:
```jsx
capture('checkout_details_submitted', { kit: selectedKit, source });
```

- [ ] **Step 2: Fire delivery-submitted**

In `handleDeliveryNext`, immediately before `capture('checkout_initiated', ...)` (~line 715), add:
```jsx
capture('checkout_delivery_submitted', { kit: selectedKit, source });
```

- [ ] **Step 3: Unify checkout_initiated (standard path)**

Change line ~715 from:
```jsx
capture('checkout_initiated', { kit: selectedKit, source, price });
```
to:
```jsx
capture('checkout_initiated', { kit: selectedKit, source, price, method: 'standard' });
```
And change the Meta call on ~line 716 to pass the kit id for consistency with the express path:
```jsx
fbInitiateCheckout(selectedKit, price);
```

- [ ] **Step 4: Verify**

Run: `cd web && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/BuyPage.jsx
git commit -m "feat: mid-checkout events (details/delivery submitted) + unify checkout_initiated method"
```

---

### Task 6: Section-tracking robustness

**Files:**
- Modify: `web/src/pages/FullSite.jsx`

**Interfaces:** unchanged event `section_viewed { section, page }` — now also covers `[data-track]` blocks.

- [ ] **Step 1: Observe data-track blocks too**

In `web/src/pages/FullSite.jsx`, in the section-viewed effect (~line 64-65), change:
```jsx
document.querySelectorAll('section[id]').forEach(el => obs.observe(el));
```
to:
```jsx
document.querySelectorAll('section[id], [data-track]').forEach(el => obs.observe(el));
```
And in the observer callback (~line 58), prefer the explicit track name:
```jsx
const name = e.target.dataset.track || e.target.id;
if (e.isIntersecting && name) {
  capture('section_viewed', { section: name, page: 'homepage' });
  obs.unobserve(e.target);
}
```

- [ ] **Step 2: Audit homepage blocks**

Grep the homepage component tree for major blocks lacking an `id`/`data-track`; add `data-track="<name>"` to each meaningful block (hero, explainer, lineup, ritual, kits, faq, founder). Run: `cd web && grep -rn "<section" src/pages/FullSite.jsx src/components | grep -v "id=" | grep -v "data-track"` and add attributes where missing.

- [ ] **Step 3: Verify + commit**

Run: `cd web && npm run lint && npm run build`
```bash
git add web/src/pages/FullSite.jsx web/src/components
git commit -m "feat: section_viewed covers data-track blocks; label key homepage sections"
```

---

### Task 7: Remove dead Axon env echo

**Files:**
- Modify: `amplify.yml`

- [ ] **Step 1: Delete the line**

Remove line 12 of `amplify.yml`:
```
        - echo "VITE_AXON_PIXEL_ID=$VITE_AXON_PIXEL_ID" >> web/.env
```

- [ ] **Step 2: Confirm no Axon refs remain**

Run: `grep -rniE "axon|applovin" web/ amplify.yml`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add amplify.yml
git commit -m "chore: remove dead Axon (AppLovin) env echo — pixel already gone from code"
```

---

### Task 8: Feed PostHog from the Stripe webhook (purchase parity)

**Files:**
- Create: `supabase/functions/_shared/posthog.ts`
- Test: `supabase/functions/_shared/posthog.test.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`
- Modify: `web/src/pages/SuccessPage.jsx`

**Interfaces:**
- Produces: `buildPosthogPurchase({ email, piId, kitId, amountPence, source }) => object` and `sendPosthogPurchase(opts): Promise<void>`.

- [ ] **Step 1: Write the failing payload test**

Create `supabase/functions/_shared/posthog.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildPosthogPurchase } from './posthog.ts';

Deno.test('buildPosthogPurchase shapes event with dedup insert_id', () => {
  const e = buildPosthogPurchase({ apiKey: 'phc_x', email: 'A@B.com', piId: 'pi_123', kitId: 'ritual', amountPence: 8500, source: 'ig' });
  assertEquals(e.api_key, 'phc_x');
  assertEquals(e.event, 'purchase');
  assertEquals(e.distinct_id, 'a@b.com');
  assertEquals(e.properties.kit, 'ritual');
  assertEquals(e.properties.revenue_pence, 8500);
  assertEquals(e.properties.ref, 'pi_123');
  assertEquals(e.properties.$insert_id, 'pi_123');
  assertEquals(e.properties.server_side, true);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd supabase/functions && deno test _shared/posthog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `supabase/functions/_shared/posthog.ts`:
```ts
export function buildPosthogPurchase(opts: {
  apiKey: string; email?: string | null; piId: string;
  kitId?: string | null; amountPence: number; source?: string | null;
}) {
  return {
    api_key: opts.apiKey,
    event: 'purchase',
    distinct_id: (opts.email ?? opts.piId).trim().toLowerCase(),
    properties: {
      kit: opts.kitId ?? 'unknown',
      source: opts.source ?? 'server',
      revenue_pence: opts.amountPence,
      ref: opts.piId,
      $insert_id: opts.piId,
      $host: 'bysolum.co.uk',
      server_side: true,
    },
  };
}

export async function sendPosthogPurchase(opts: {
  email?: string | null; piId: string; kitId?: string | null;
  amountPence: number; source?: string | null;
}) {
  const apiKey = Deno.env.get('POSTHOG_PROJECT_KEY');
  if (!apiKey) { console.warn('POSTHOG_PROJECT_KEY not set — skipping PostHog event'); return; }
  try {
    const res = await fetch('https://eu.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPosthogPurchase({ apiKey, ...opts })),
    });
    if (!res.ok) console.error('posthog_capture_error', res.status, await res.text());
    else console.log('posthog_capture_ok', opts.piId);
  } catch (err) {
    console.error('posthog_capture_throw', (err as Error).message);
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd supabase/functions && deno test _shared/posthog.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the webhook**

In `supabase/functions/stripe-webhook/index.ts`, add the import at top:
```ts
import { sendPosthogPurchase } from '../_shared/posthog.ts';
```
In `handleOneTimeOrderFromPI`, after the existing Meta/TikTok sends (~line 391) add:
```ts
await sendPosthogPurchase({ email, kitId: kit_id, amountPence: pi.amount, source, piId: pi.id });
```
In `handleOneTimeOrder`, after its Meta/TikTok sends (~line 480) add:
```ts
await sendPosthogPurchase({ email, kitId: kit_id, amountPence: session.amount_total ?? 0, source, piId: paymentIntentId });
```

- [ ] **Step 6: Add client-side dedup key**

In `web/src/pages/SuccessPage.jsx`, change the `capture('purchase', ...)` call (~line 93) to include `$insert_id`:
```jsx
capture('purchase', { kit: kitId, source, revenue_pence: amountPence, ref: rawRef, $insert_id: rawRef });
```

- [ ] **Step 7: Set the secret + deploy to BOTH dev and prod**

Run (set secret on both projects, then deploy to both):
```bash
supabase secrets set POSTHOG_PROJECT_KEY=phc_BjezQwNmSiTGyXYzg3nJNsRbGHBLi9qnCYN8YbHo8oEc --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy stripe-webhook --project-ref rodvvmfzkyjsqbufkjbc
# then prod (confirm prod ref before running):
supabase secrets set POSTHOG_PROJECT_KEY=phc_BjezQwNmSiTGyXYzg3nJNsRbGHBLi9qnCYN8YbHo8oEc --project-ref <PROD_REF>
supabase functions deploy stripe-webhook --project-ref <PROD_REF>
```
Expected: both deploys succeed.

- [ ] **Step 8: Verify end-to-end (dev)**

Trigger a dev test purchase; confirm exactly **one** PostHog `purchase` per order (client + server dedup via `$insert_id`), and that revenue reconciles. Check function logs for `posthog_capture_ok`.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/_shared/posthog.ts supabase/functions/_shared/posthog.test.ts supabase/functions/stripe-webhook/index.ts web/src/pages/SuccessPage.jsx
git commit -m "feat: server-side PostHog purchase capture for Stripe parity (insert_id dedup)"
```

---

### Task 9 (OPTIONAL): EMQ boost — pass fbp/fbc/ttp/ttclid server-side

> Deferred unless match-quality needs lifting. Do AFTER Task 8 is verified.

**Files:** `web/src/pages/BuyPage.jsx` (read cookies, pass in PI metadata), `supabase/functions/create-first-box-payment-intent/index.ts` (store in metadata), `supabase/functions/stripe-webhook/index.ts` + `sendMetaPurchaseEvent`/`sendTikTokPurchaseEvent` (include them).

- [ ] **Step 1:** Client reads `_fbp`/`_fbc` and `ttp`/`_ttp` cookies and includes them in the create-payment-intent request body.
- [ ] **Step 2:** The payment-intent function writes them into `pi.metadata`.
- [ ] **Step 3:** The webhook reads `pi.metadata` and adds `fbp`/`fbc` to Meta `user_data` and `ttp`/`ttclid` to TikTok `user`. Deploy both dev+prod.
- [ ] **Step 4:** Verify EMQ rises in Meta Events Manager. Commit.

---

### Task 10: Update PostHog dashboards (new funnels)

**Files:**
- Create: `scripts/posthog/update_dashboards.py`

**Interfaces:** adds insights to the existing Deep Funnel dashboard (id `776101`).

- [ ] **Step 1: Write the updater script**

Create `scripts/posthog/update_dashboards.py` (mirror the prior builder: `PH`/`PID` env vars, SSL-disabled urllib, `trend()`/`funnel()` helpers, every source includes the PROD `$host` regex filter). Add three insights to dashboard `776101`:
  1. Funnel `QualifiedVisit → ViewContent → checkout_initiated → purchase` (true top-of-funnel).
  2. Funnel `buy_page_viewed → checkout_details_submitted → checkout_delivery_submitted → checkout_initiated → purchase` (in-checkout leak).
  3. Trend `ritual_video_progress` broken down by `percent`, display `ActionsBar` (video drop-off).

- [ ] **Step 2: Run it**

Run: `PH=<personal_key> PID=166881 python3 scripts/posthog/update_dashboards.py`
Expected: three insight ids printed, attached to 776101.

- [ ] **Step 3: Verify in PostHog**

Open `https://eu.posthog.com/project/166881/dashboard/776101` — the three new tiles render (will populate as the new events accrue).

- [ ] **Step 4: Commit**

```bash
git add scripts/posthog/update_dashboards.py
git commit -m "chore: PostHog dashboard updater — QualifiedVisit/in-checkout funnels + video drop-off"
```

---

### Task 11: Ads campaign runbook (Meta + TikTok)

**Files:**
- Create: `docs/runbooks/2026-06-26-ads-campaign-runbook.md`

- [ ] **Step 1: Write the runbook**

Create `docs/runbooks/2026-06-26-ads-campaign-runbook.md` covering, for **each** of Meta and TikTok:
  - **Custom audiences to create:** (a) `QualifiedVisit` last 14d/30d (from pixel custom event), (b) video viewers ≥50% (on-platform engagement), (c) `ViewContent`/`InitiateCheckout` 14d, (d) Purchasers (for exclusion).
  - **Campaign 1 — Cold/Leads:** objective Traffic or Lead-gen, optimise → `QualifiedVisit`; audience broad, exclude purchasers + warm; ~20–30% budget; messaging L1–L2; weekly champion/challenger creative.
  - **Campaign 2 — Warm/Retarget:** audiences = video ≥50% + `QualifiedVisit` 14d, exclude purchasers; messaging L3–L4 (education/objection/ritual demo).
  - **Campaign 3 — Hot/Convert:** audiences = `ViewContent`/`InitiateCheckout` + abandoners, optimise → Purchase; messaging L5 (offer + £10-back + social proof).
  - **Budget rule:** at <£50/day, cold optimises on `QualifiedVisit` not Purchase; move to Purchase optimisation once the pool is large.
  - **Frequency:** retargeting healthy 3–5, refresh creative at 6+.
  - **Exclusions:** always exclude purchasers from cold + warm.
  - **Verification:** confirm `QualifiedVisit` custom event is selectable as an optimisation event in both Ads Managers before launching.

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/2026-06-26-ads-campaign-runbook.md
git commit -m "docs: Meta/TikTok 3-campaign leads->retarget->sales runbook"
```

---

## Self-Review

**Spec coverage:**
- §4 event architecture → Tasks 1–8 (QualifiedVisit, mid-checkout, video progress, purchase parity). ✅
- §5 server-side (verify + PostHog parity + optional EMQ) → Task 8 + Task 9. ✅ (verification of existing Meta/TikTok secrets is a manual step folded into Task 8 Step 8.)
- §6 skip-zone instrumentation → Tasks 4, 5, 6. ✅
- §7 campaign architecture → Task 11. ✅
- §8 dashboard updates → Task 10. ✅
- Axon removal → Task 7. ✅
- Waitlist `Lead` deprecation → intentionally NOT actioned: the only remaining `fbLead` calls are on the sold-out waitlist + athlete forms which still serve a purpose; leaving them is harmless and out of scope. Noted here so it isn't a silent gap.

**Placeholder scan:** `<PROD_REF>` in Task 8 Step 7 and `<personal_key>` in Task 10 Step 2 are deliberate secrets to be supplied at run time, not code placeholders. No "TBD"/"handle edge cases" present.

**Type consistency:** `evaluateQualified` signature identical across Tasks 1 and 3; `markProductDetail`/`markRitualProgress`/`initQualifiedVisitTracker` consistent across Tasks 3 and 4; `buildPosthogPurchase`/`sendPosthogPurchase` consistent across Task 8.
