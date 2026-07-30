# E2E Checkout Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every SOLUM E2E run development-only, metrics-clean and worktree-safe while restoring a real Stripe test-card checkout through a card-only `/buy` flow.

**Architecture:** A dependency-free repository safety guard validates the exact site and Supabase development origins before Playwright can start. The web suite adds early environment discovery, shared setup/teardown data management, browser and webhook side-effect gates, and one real Stripe test-mode purchase. The checkout removes all express wallets and requests card-only PaymentIntents.

**Tech Stack:** Node.js 20, Playwright 1.60, React 19, Vite 8, Stripe Elements, Supabase Edge Functions on Deno 2.5.6, Vitest 2.1, `node:test`

## Global Constraints

- E2E must never target `bysolum.co.uk`, an unknown site, production Supabase or live Stripe.
- `E2E_TARGET` must equal `dev`; there is no production override.
- Allowed browser origins are `http://localhost:5173`, `http://127.0.0.1:5173`, and `https://dev.d3pa095gzazg3c.amplifyapp.com`.
- Allowed Supabase origin is exactly `https://rodvvmfzkyjsqbufkjbc.supabase.co`.
- Local runs require a Stripe publishable key beginning with `pk_test_`.
- The real purchase test must assert `livemode === false` before entering card details.
- Automated and test-mode traffic must not reach PostHog, Meta, TikTok, Google Ads, Awin, customer email or admin notification systems.
- Test records must be removed and development inventory restored to 250 after the suite.
- Implement and verify on `dev` only; do not deploy or run any verification against production.
- Never log service-role keys, Stripe keys, PaymentIntent client secrets or other secrets.

---

### Task 1: Fail-Closed Repository E2E Target Guard

**Files:**
- Create: `scripts/e2e-safety.mjs`
- Create: `scripts/e2e-safety.test.mjs`
- Modify: `web/playwright.config.ts`
- Modify: `tests/e2e/playwright.config.ts`
- Modify: `web/.env.test.example`
- Modify: `tests/e2e/.env.test.example`
- Modify: `buildspec.yml`

**Interfaces:**
- Produces: `assertSafeE2ETarget(input)` returning normalized `{ baseURL, supabaseURL }`.
- Consumes: explicit `target`, `baseURL`, `supabaseURL`, optional `stripePublishableKey`, and `localServer`.
- Both Playwright configurations must invoke it during module evaluation.

- [ ] **Step 1: Write the failing safety tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeE2ETarget } from './e2e-safety.mjs';

const dev = {
  target: 'dev',
  baseURL: 'https://dev.d3pa095gzazg3c.amplifyapp.com',
  supabaseURL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  localServer: false,
};

test('accepts the exact remote development target', () => {
  assert.deepEqual(assertSafeE2ETarget(dev), {
    baseURL: 'https://dev.d3pa095gzazg3c.amplifyapp.com',
    supabaseURL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  });
});

test('accepts localhost only with a Stripe test key', () => {
  assert.equal(assertSafeE2ETarget({
    ...dev,
    baseURL: 'http://localhost:5173',
    localServer: true,
    stripePublishableKey: 'pk_test_example',
  }).baseURL, 'http://localhost:5173');
});

for (const input of [
  { ...dev, target: undefined },
  { ...dev, baseURL: 'https://bysolum.co.uk' },
  { ...dev, baseURL: 'https://main.d3pa095gzazg3c.amplifyapp.com' },
  { ...dev, supabaseURL: 'https://gvfptmjluxpngfjendbi.supabase.co' },
  { ...dev, baseURL: 'http://localhost:5173', localServer: true, stripePublishableKey: 'pk_live_example' },
]) {
  test(`rejects unsafe input ${JSON.stringify({ ...input, stripePublishableKey: input.stripePublishableKey ? '[redacted]' : undefined })}`, () => {
    assert.throws(() => assertSafeE2ETarget(input), /E2E .* blocked|E2E .* required/);
  });
}
```

- [ ] **Step 2: Verify the tests fail because the guard does not exist**

Run: `node --test scripts/e2e-safety.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/e2e-safety.mjs`.

- [ ] **Step 3: Implement the dependency-free guard**

```js
const SAFE_BASE_URLS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://dev.d3pa095gzazg3c.amplifyapp.com',
]);
const SAFE_SUPABASE_URL = 'https://rodvvmfzkyjsqbufkjbc.supabase.co';

function origin(name, value) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`E2E ${name} required`);
  }
}

export function assertSafeE2ETarget(input) {
  if (input.target !== 'dev') throw new Error('E2E target blocked: E2E_TARGET=dev required');
  const baseURL = origin('base URL', input.baseURL);
  const supabaseURL = origin('Supabase URL', input.supabaseURL);
  if (!SAFE_BASE_URLS.has(baseURL)) throw new Error('E2E site blocked: production or unknown origin');
  if (supabaseURL !== SAFE_SUPABASE_URL) throw new Error('E2E Supabase blocked: production or unknown project');
  if (input.localServer && !String(input.stripePublishableKey ?? '').startsWith('pk_test_')) {
    throw new Error('E2E Stripe blocked: local runs require a test publishable key');
  }
  return { baseURL, supabaseURL };
}
```

- [ ] **Step 4: Wire the guard into both Playwright configurations**

In `web/playwright.config.ts`, call the guard before `defineConfig`:

```ts
const isCI = !!process.env.CI;
const baseURL = process.env.DEV_BASE_URL ?? 'http://localhost:5173';
assertSafeE2ETarget({
  target: process.env.E2E_TARGET,
  baseURL,
  supabaseURL: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL,
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
  localServer: !isCI,
});
```

Apply the same exact-origin guard in `tests/e2e/playwright.config.ts` with `localServer: false`.

Add `E2E_TARGET=dev` to both example env files. Add this non-secret value to `buildspec.yml`:

```yml
env:
  variables:
    E2E_TARGET: dev
```

- [ ] **Step 5: Add the explicit marker to ignored local test env files**

Add this exact non-secret line to the existing local `web/.env.test` and
`tests/e2e/.env.test` files:

```dotenv
E2E_TARGET=dev
```

These files remain ignored and must not be staged.

- [ ] **Step 6: Verify safe and unsafe configuration**

Run: `node --test scripts/e2e-safety.test.mjs`
Expected: all tests PASS.

Run with deliberately rejected values and no network request:

```bash
E2E_TARGET=dev \
DEV_BASE_URL=https://bysolum.co.uk \
SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co \
npx playwright test --list
```

Expected: non-zero exit with `E2E site blocked` before global setup or web server output.

- [ ] **Step 7: Commit the safety guard**

```bash
git add scripts/e2e-safety.mjs scripts/e2e-safety.test.mjs \
  web/playwright.config.ts tests/e2e/playwright.config.ts \
  web/.env.test.example tests/e2e/.env.test.example buildspec.yml
git commit -m "test: block e2e production targets"
```

---

### Task 2: Worktree Environment Discovery

**Files:**
- Create: `web/e2e/support/load-e2e-environment.ts`
- Create: `web/e2e/support/load-e2e-environment.test.ts`
- Modify: `web/playwright.config.ts`

**Interfaces:**
- Produces: `loadE2EEnvironment(webRoot?: string): void`.
- Loads existing process values first, current-worktree files second, and main-worktree files only for missing values.
- Must execute before the Task 1 guard and before Playwright defines `webServer`.

- [ ] **Step 1: Write failing worktree-discovery tests**

Use a temporary fake repository structure and inject a `resolveCommonGitDir` callback:

```ts
test('uses the main worktree env files only for values missing locally', () => {
  const currentWeb = join(tmp, 'feature', 'web');
  const mainWeb = join(tmp, 'main', 'web');
  writeFileSync(join(currentWeb, '.env.test'), 'E2E_TARGET=dev\n');
  writeFileSync(join(mainWeb, '.env.test'), 'SUPABASE_SERVICE_ROLE_KEY=service_dev\n');
  writeFileSync(join(mainWeb, '.env.local'), 'VITE_SUPABASE_ANON_KEY=anon_dev\nVITE_STRIPE_PUBLISHABLE_KEY=pk_test_dev\n');

  const env = { VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co' };
  loadE2EEnvironment(currentWeb, env, () => join(tmp, 'main', '.git'));

  expect(env).toMatchObject({
    E2E_TARGET: 'dev',
    SUPABASE_SERVICE_ROLE_KEY: 'service_dev',
    VITE_SUPABASE_ANON_KEY: 'anon_dev',
    VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_dev',
  });
});
```

Add a second test proving an existing process value is not overwritten by either file.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run e2e/support/load-e2e-environment.test.ts` from `web`.
Expected: FAIL because `loadE2EEnvironment` is not defined.

- [ ] **Step 3: Implement environment loading**

Implement:

```ts
export function loadE2EEnvironment(
  webRoot = process.cwd(),
  env = process.env,
  resolveCommonGitDir = () => execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd: webRoot, encoding: 'utf8' },
  ).trim(),
) {
  const load = (file: string) => {
    if (existsSync(file)) dotenv.config({ path: file, processEnv: env, override: false, quiet: true });
  };
  load(join(webRoot, '.env.test'));
  load(join(webRoot, '.env.local'));
  const mainWeb = join(dirname(resolveCommonGitDir()), 'web');
  if (resolve(mainWeb) !== resolve(webRoot)) {
    load(join(mainWeb, '.env.test'));
    load(join(mainWeb, '.env.local'));
  }
}
```

Catch Git discovery failure only after local files are loaded; the safety guard remains responsible for rejecting missing values.

- [ ] **Step 4: Load the environment at Playwright configuration time**

At the top of `web/playwright.config.ts`:

```ts
loadE2EEnvironment();
```

Then calculate `isCI`, `baseURL` and invoke `assertSafeE2ETarget`.

- [ ] **Step 5: Verify GREEN**

Run: `npx vitest run e2e/support/load-e2e-environment.test.ts` from `web`.
Expected: all tests PASS.

- [ ] **Step 6: Commit environment discovery**

```bash
git add web/e2e/support/load-e2e-environment.ts \
  web/e2e/support/load-e2e-environment.test.ts web/playwright.config.ts
git commit -m "test: load e2e env in worktrees"
```

---

### Task 3: Development Test Data Setup and Teardown

**Files:**
- Create: `web/e2e/support/test-data.ts`
- Create: `web/e2e/global-teardown.ts`
- Modify: `web/e2e/global-setup.ts`
- Modify: `web/playwright.config.ts`

**Interfaces:**
- Produces: `resetE2EData(client): Promise<void>`.
- Setup and teardown both call the same idempotent reset.
- The safety guard runs immediately before the admin client is created.

- [ ] **Step 1: Extract one reset function**

Move inventory reset and `e2e+%@%` lead/customer/order deletion from `global-setup.ts` into:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function resetE2EData(db: SupabaseClient) {
  await db.from('leads').delete().like('email', 'e2e+%@%');
  const { data: customers, error: customerLookupError } = await db
    .from('customers').select('id').like('email', 'e2e+%@%');
  if (customerLookupError) throw new Error(`[e2e reset] customer lookup failed: ${customerLookupError.message}`);
  if (customers?.length) {
    const ids = customers.map(({ id }) => id);
    const { error: orderDeleteError } = await db.from('orders').delete().in('customer_id', ids);
    if (orderDeleteError) throw new Error(`[e2e reset] order cleanup failed: ${orderDeleteError.message}`);
    const { error: customerDeleteError } = await db.from('customers').delete().in('id', ids);
    if (customerDeleteError) throw new Error(`[e2e reset] customer cleanup failed: ${customerDeleteError.message}`);
  }
  const { error: inventoryError } = await db.from('kit_inventory').upsert([
    { kit_id: 'ground', available_count: 250 },
    { kit_id: 'ritual', available_count: 250 },
  ], { onConflict: 'kit_id' });
  if (inventoryError) throw new Error(`[e2e reset] inventory seed failed: ${inventoryError.message}`);
}
```

Check and throw on the lead deletion error as well.

- [ ] **Step 2: Add defense-in-depth guarded setup and teardown**

Both files must call:

```ts
loadE2EEnvironment();
const isCI = !!process.env.CI;
const baseURL = process.env.DEV_BASE_URL ?? 'http://localhost:5173';
const supabaseURL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
assertSafeE2ETarget({
  target: process.env.E2E_TARGET,
  baseURL,
  supabaseURL,
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
  localServer: !isCI,
});
const db = createClient(supabaseURL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
await resetE2EData(db);
```

Configure:

```ts
globalSetup: './e2e/global-setup.ts',
globalTeardown: './e2e/global-teardown.ts',
```

- [ ] **Step 3: Run a non-purchase E2E smoke**

Run: `npx playwright test e2e/ritual-media.spec.ts --project=chromium` from `web`.
Expected: 1 PASS, setup logs inventory 250, teardown logs cleanup and inventory restoration.

- [ ] **Step 4: Commit lifecycle cleanup**

```bash
git add web/e2e/support/test-data.ts web/e2e/global-setup.ts \
  web/e2e/global-teardown.ts web/playwright.config.ts
git commit -m "test: clean dev data after e2e"
```

---

### Task 4: Browser Automation Analytics Isolation

**Files:**
- Create: `web/src/lib/analyticsEnvironment.js`
- Create: `web/src/lib/analyticsEnvironment.test.js`
- Modify: `web/src/lib/analytics.js`
- Modify: `web/index.html`

**Interfaces:**
- Produces: `isAutomatedBrowser(navigatorLike): boolean`.
- Analytics helpers and inline loaders treat WebDriver as disabled.
- Awin MasterTag loads dynamically only on the exact production hostname in a non-WebDriver browser.

- [ ] **Step 1: Write the failing pure unit tests**

```js
import { describe, expect, it } from 'vitest';
import { isAutomatedBrowser } from './analyticsEnvironment.js';

describe('isAutomatedBrowser', () => {
  it('returns true only for an explicit WebDriver browser', () => {
    expect(isAutomatedBrowser({ webdriver: true })).toBe(true);
    expect(isAutomatedBrowser({ webdriver: false })).toBe(false);
    expect(isAutomatedBrowser(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/lib/analyticsEnvironment.test.js` from `web`.
Expected: FAIL because `analyticsEnvironment.js` does not exist.

- [ ] **Step 3: Implement and wire the automation gate**

```js
export function isAutomatedBrowser(navigatorLike = globalThis.navigator) {
  return navigatorLike?.webdriver === true;
}
```

In `analytics.js`, calculate `const ANALYTICS_DISABLED = isAutomatedBrowser();`. Return early from `initAnalytics`, `capture` and `identify`; include `!ANALYTICS_DISABLED` in `IS_PROD` so Meta, TikTok and Google helpers remain no-ops.

In `index.html`, require both the exact production hostname and `navigator.webdriver !== true` for the early-hit beacon and delayed Meta/Google/TikTok loaders.

Replace the static Awin script with:

```html
<script>
  if (/^(www\.)?bysolum\.co\.uk$/.test(location.hostname) && navigator.webdriver !== true) {
    var awin = document.createElement('script');
    awin.src = 'https://www.dwin1.com/129171.js';
    awin.defer = true;
    document.body.appendChild(awin);
  }
</script>
```

- [ ] **Step 4: Verify browser isolation**

Run: `npm run test:unit` from `web`.
Expected: all unit tests PASS.

Run the Ritual Playwright test while recording requests and assert no request host contains `posthog.com`, `facebook.net`, `googletagmanager.com`, `tiktok.com`, or `dwin1.com`.

- [ ] **Step 5: Commit browser isolation**

```bash
git add web/src/lib/analyticsEnvironment.js web/src/lib/analyticsEnvironment.test.js \
  web/src/lib/analytics.js web/index.html
git commit -m "fix: suppress analytics in automated browsers"
```

---

### Task 5: Stripe Test-Mode Webhook Side-Effect Fence

**Files:**
- Create: `supabase/functions/_shared/purchaseSafety.ts`
- Create: `supabase/functions/_shared/purchaseSafety.test.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`

**Interfaces:**
- Produces: `shouldSendExternalPurchaseSideEffects(livemode): boolean`.
- All webhook branches must call external messaging or marketing functions only when the helper returns true.
- Core development order, address and inventory persistence remains enabled for test mode.

- [ ] **Step 1: Write the failing Deno test**

```ts
import { assertEquals } from 'jsr:@std/assert';
import { shouldSendExternalPurchaseSideEffects } from './purchaseSafety.ts';

Deno.test('external purchase side effects require Stripe live mode', () => {
  assertEquals(shouldSendExternalPurchaseSideEffects(true), true);
  assertEquals(shouldSendExternalPurchaseSideEffects(false), false);
  assertEquals(shouldSendExternalPurchaseSideEffects(undefined), false);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx --yes deno@2.5.6 test supabase/functions/_shared/purchaseSafety.test.ts
```

Expected: FAIL because `purchaseSafety.ts` does not exist.

- [ ] **Step 3: Implement the fail-closed helper**

```ts
export function shouldSendExternalPurchaseSideEffects(livemode: boolean | undefined): boolean {
  return livemode === true;
}
```

- [ ] **Step 4: Fence every purchase side-effect cluster**

Import the helper into `stripe-webhook/index.ts`. Gate these functions behind the relevant `pi.livemode` or `session.livemode`:

- `sendConfirmationEmail`
- `sendAdminNotification`
- `sendTikTokPurchaseEvent`
- `sendMetaPurchaseEvent`
- `sendPosthogPurchase`
- `sendAwinPurchaseEvent`

Apply the gate in `handleOneTimeOrderFromPI`, `handleOneTimeOrder`, the subscription PaymentIntent handler, and every Checkout Session completion branch. Do not gate customer/order/address persistence, inventory deduction or lead completion.

- [ ] **Step 5: Verify GREEN and regression coverage**

Run:

```bash
npx --yes deno@2.5.6 test \
  supabase/functions/_shared/purchaseSafety.test.ts \
  supabase/functions/_shared/awin.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit webhook isolation**

```bash
git add supabase/functions/_shared/purchaseSafety.ts \
  supabase/functions/_shared/purchaseSafety.test.ts \
  supabase/functions/stripe-webhook/index.ts
git commit -m "fix: suppress test payment side effects"
```

---

### Task 6: Card-Only Checkout and Real Purchase E2E

**Files:**
- Modify: `web/e2e/buy-flow.spec.ts`
- Modify: `web/src/pages/BuyPage.jsx`
- Modify: `supabase/functions/create-first-box-payment-intent/index.ts`
- Delete: `web/src/components/IabCheckoutGate.jsx`
- Delete: `web/src/components/IabCheckoutGate.css`
- Delete: `web/src/components/InAppBrowserBanner.jsx`

**Interfaces:**
- `create-first-box-payment-intent` accepts the existing payload and returns the existing fields plus `livemode: boolean`.
- PaymentIntent creation includes `payment_method_types: ['card']`.
- `/buy` exposes only Details → Delivery → card PaymentElement → Success.

- [ ] **Step 1: Enable and strengthen the real checkout test**

Remove `test.skip`. Before clicking Delivery, register:

```ts
const intentResponsePromise = page.waitForResponse(response =>
  response.url().includes('/functions/v1/create-first-box-payment-intent') &&
  response.request().method() === 'POST',
);
await page.getByTestId('delivery-btn').click();
const intentBody = await (await intentResponsePromise).json();
expect(intentBody.livemode).toBe(false);
await expect(page.locator('.by-express-wrap')).toHaveCount(0);
```

Keep the existing test-card, success URL, paid-order, customer and inventory assertions.

- [ ] **Step 2: Verify RED safely in development**

Run only the full-purchase test:

```bash
npx playwright test e2e/buy-flow.spec.ts \
  --project=chromium \
  --grep "full purchase: test card"
```

Expected: FAIL before payment because `livemode` is missing and/or the express wrapper still exists. Task 1 prevents a production target; Tasks 3–5 prevent persistent dev data and external side effects.

- [ ] **Step 3: Make PaymentIntents card-only**

In `create-first-box-payment-intent/index.ts`:

```ts
payment_method_types: ['card'],
```

Insert that property immediately after `currency: 'gbp'` in the existing
`stripe.paymentIntents.create` object. Return this additional property in the
existing JSON response:

```ts
livemode: pi.livemode,
```

- [ ] **Step 4: Remove express checkout from `BuyPage`**

Remove `ExpressCheckoutElement`, `ExpressCheckout`, express state/effects, `IabCheckoutGate`, `InAppBrowserBanner`, `shouldShowIabGate`, express CSS and the express render block.

Attach `formStartRef` to the Details form:

```jsx
<form ref={formStartRef} onSubmit={handleDetailsNext} noValidate data-testid="details-form">
```

Render `ProgressBar` and the Details form whenever `step === 'details'`; no in-app-browser gate may block them.

Delete the three now-unused wallet-specific component files.

- [ ] **Step 5: Deploy only the development Edge Functions required by the test**

Deploy `create-first-box-payment-intent` and `stripe-webhook` to the exact development Supabase project `rodvvmfzkyjsqbufkjbc`. Do not deploy to production. Confirm the selected project reference before each command.

```bash
npx supabase functions deploy create-first-box-payment-intent \
  --project-ref rodvvmfzkyjsqbufkjbc
npx supabase functions deploy stripe-webhook \
  --project-ref rodvvmfzkyjsqbufkjbc
```

- [ ] **Step 6: Verify the real purchase test passes**

Run:

```bash
npx playwright test e2e/buy-flow.spec.ts \
  --project=chromium \
  --grep "full purchase: test card"
```

Expected: 1 PASS, zero skipped; teardown restores inventory and removes the E2E order/customer/lead.

- [ ] **Step 7: Commit card-only checkout**

```bash
git add web/e2e/buy-flow.spec.ts web/src/pages/BuyPage.jsx \
  supabase/functions/create-first-box-payment-intent/index.ts \
  web/src/components/IabCheckoutGate.jsx \
  web/src/components/IabCheckoutGate.css \
  web/src/components/InAppBrowserBanner.jsx
git commit -m "feat: make checkout card only"
```

---

### Task 7: Full Verification and Worktree Proof

**Files:**
- Modify only if verification exposes an in-scope defect.

**Interfaces:**
- Consumes all prior tasks.
- Produces fresh evidence that the main checkout and an env-less worktree are safe and green.

- [ ] **Step 1: Run all local verification**

```bash
node --test scripts/e2e-safety.test.mjs
cd web && npm run test:unit
cd .. && npx --yes deno@2.5.6 test \
  supabase/functions/_shared/purchaseSafety.test.ts \
  supabase/functions/_shared/awin.test.ts
cd web && npm test
cd .. && npm --prefix web run build
```

Expected:

- Repository safety tests PASS.
- All Vitest unit tests PASS.
- All Deno purchase-safety and Awin tests PASS.
- All 38 web Playwright tests PASS with zero skipped.
- Production build succeeds.

- [ ] **Step 2: Prove production fails before execution**

```bash
cd web
E2E_TARGET=dev \
DEV_BASE_URL=https://bysolum.co.uk \
SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co \
npx playwright test --list
```

Expected: non-zero exit with `E2E site blocked`; no web server, browser or global setup output.

- [ ] **Step 3: Prove env-less worktree discovery**

From the repository root, add a disposable worktree at the completed commit:

```bash
verification_parent="$(mktemp -d)"
verification_worktree="$verification_parent/solum-e2e-verify"
git worktree add "$verification_worktree" HEAD
test ! -e "$verification_worktree/web/.env.test"
test ! -e "$verification_worktree/web/.env.local"
cd "$verification_worktree/web"
npm ci
npm test
```

Expected: all 38 tests PASS with zero skipped using main-worktree env fallback. Remove only this disposable verification worktree afterward:

```bash
cd /Users/harshamahadeva/NewCo/solum
git worktree remove "$verification_worktree"
```

- [ ] **Step 4: Confirm cleanup and repository hygiene**

Verify development inventory is 250 for both kits and no `e2e+` customer, order or lead remains. Run:

```bash
git status --short
git diff --check
```

Restore or exclude generated `test-results`, Playwright reports, screenshots and videos; keep source changes only.

- [ ] **Step 5: Handle any verification defect through its owning task**

If verification exposes an in-scope defect, return to the task that owns the
failing behavior, reproduce it with that task's focused test, apply one fix,
rerun the focused test and commit only the files listed in that task. Then
repeat Task 7 from Step 1. If verification is clean, create no empty commit.
