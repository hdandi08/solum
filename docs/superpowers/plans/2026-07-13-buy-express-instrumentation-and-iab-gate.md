# /buy Express Instrumentation + IAB Checkout Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log every express-wallet interaction and checkout error on /buy (Part A), and gate the /buy details step for in-app-browser visitors with a blocking "open in browser / continue here" choice card (Part B).

**Architecture:** Part A is capture-only additions inside `web/src/pages/BuyPage.jsx` — no behaviour changes. Part B adds a pure visibility helper to `web/src/lib/inAppBrowser.js` (unit-tested), a new self-contained `IabCheckoutGate` component, and conditional rendering on the details step of BuyPage that mounts the gate *instead of* the express wallets + details form until the user picks a path.

**Tech Stack:** React (Vite), Stripe Elements (`ExpressCheckoutElement`), PostHog via `capture()` from `web/src/lib/analytics.js`, Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-07-13-buy-express-instrumentation-design.md`

## Global Constraints

- Work on the `dev` branch; Harsha signs off before any merge to master.
- All new events carry `{ kit, source }`; error messages truncated to 200 chars.
- Copy rules: never the word "soap"; no em/en dashes in customer-facing copy; min font sizes 13px body / 11px labels.
- Brand palette only: SOLUM Black #08090B, Charcoal #181C24, Deep Blue #1A4A78, Steel Blue #2E6DA4, Sky Blue #4A8FC7, Bone #F0ECE2.
- Honest copy: Stripe Link still works in-app, so the gate names the missing wallets (Apple Pay / Google Pay / PayPal) and never claims payment is impossible in-app.
- All commands below run from `web/`.

---

### Task 1: Part A — express wallet event instrumentation

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (the `ExpressCheckout` component, currently lines ~628–738)

**Interfaces:**
- Consumes: `capture(event, props)` from `../lib/analytics.js` (already imported in this file).
- Produces: module-scope helper `const errText = (m) => String(m ?? '').slice(0, 200);` used by Task 2. New PostHog events: `express_clicked`, `express_cancelled`, `express_error`.

- [ ] **Step 1: Add the `errText` helper at module scope**

Directly above the `function ExpressCheckout(...)` declaration add:

```js
// Truncate error text for analytics payloads — PostHog properties, not logs.
const errText = (m) => String(m ?? '').slice(0, 200);
```

- [ ] **Step 2: Instrument the four failure paths in the express `onConfirm` handler**

Inside the existing `onConfirm` function (declared as `async function onConfirm(event)` — it starts with `onError('');` and `const { error: submitError } = await elements.submit();`):

After the `elements.submit()` error check, change:

```js
if (submitError) { onError(submitError.message ?? 'Could not start payment.'); return; }
```

to:

```js
if (submitError) {
  capture('express_error', { kit: kitId, source, stage: 'submit', message: errText(submitError.message) });
  onError(submitError.message ?? 'Could not start payment.'); return;
}
```

Change the payment-intent failure branch:

```js
if (!res.ok) { onError(data.message ?? data.error ?? 'Something went wrong. Please try again.'); return; }
```

to:

```js
if (!res.ok) {
  capture('express_error', { kit: kitId, source, stage: 'create_intent', message: errText(data.message ?? data.error) });
  onError(data.message ?? data.error ?? 'Something went wrong. Please try again.'); return;
}
```

Change the confirm failure branch:

```js
if (confirmError) { onError(confirmError.message ?? 'Payment failed. Please try again.'); return; }
```

to:

```js
if (confirmError) {
  capture('express_error', { kit: kitId, source, stage: 'confirm', message: errText(confirmError.message) });
  onError(confirmError.message ?? 'Payment failed. Please try again.'); return;
}
```

Change the trailing catch:

```js
} catch {
  onError('Network error. Please try again.');
}
```

to:

```js
} catch {
  capture('express_error', { kit: kitId, source, stage: 'network', message: '' });
  onError('Network error. Please try again.');
}
```

- [ ] **Step 3: Instrument wallet clicks and sheet cancels on `ExpressCheckoutElement`**

Change the `onClick` and `onCancel` props of `<ExpressCheckoutElement ...>`:

```jsx
onClick={({ resolve }) => resolve({
  emailRequired: true,
  shippingAddressRequired: true,
  phoneNumberRequired: false,
  allowedShippingCountries: ['GB'],
})}
onConfirm={onConfirm}
onCancel={() => {}}
```

to:

```jsx
onClick={(event) => {
  // The only signal that a wallet button was tapped at all — the sheet,
  // like everything else inside the Stripe iframe, is invisible to replays.
  capture('express_clicked', { kit: kitId, source, wallet: event.expressPaymentType });
  event.resolve({
    emailRequired: true,
    shippingAddressRequired: true,
    phoneNumberRequired: false,
    allowedShippingCountries: ['GB'],
  });
}}
onConfirm={onConfirm}
onCancel={() => capture('express_cancelled', { kit: kitId, source })}
```

- [ ] **Step 4: Verify lint passes**

Run: `npm run lint`
Expected: no new errors (pre-existing warnings unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/pages/BuyPage.jsx
git commit -m "feat(buy): instrument express wallet clicks, cancels and errors"
```

---

### Task 2: Part A — standard card path `checkout_error` instrumentation

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (`handleDeliveryNext`, currently ~line 953; `handlePay` inside `StepPayment`, currently ~line 506)

**Interfaces:**
- Consumes: `errText` helper from Task 1; `capture` (already imported).
- Produces: new PostHog event `checkout_error` with `stage: 'create_intent' | 'confirm' | 'network'`.

- [ ] **Step 1: Instrument `handleDeliveryNext` failure paths**

In `handleDeliveryNext`, change:

```js
if (!res.ok) {
  setError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
  return;
}
```

to:

```js
if (!res.ok) {
  capture('checkout_error', { kit: selectedKit, source, stage: 'create_intent', message: errText(data.message ?? data.error) });
  setError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
  return;
}
```

and its catch:

```js
} catch {
  setError('Network error. Please try again.');
}
```

to:

```js
} catch {
  capture('checkout_error', { kit: selectedKit, source, stage: 'network', message: '' });
  setError('Network error. Please try again.');
}
```

- [ ] **Step 2: Instrument `handlePay` failure paths in `StepPayment`**

`StepPayment` receives `activeKit` and `source` as props. Change:

```js
if (confirmError) {
  setError(confirmError.message ?? 'Payment failed. Please try again.');
} else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
```

to:

```js
if (confirmError) {
  capture('checkout_error', { kit: activeKit.id, source, stage: 'confirm', message: errText(confirmError.message) });
  setError(confirmError.message ?? 'Payment failed. Please try again.');
} else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
```

and the two remaining failure branches:

```js
} else {
  setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
}
} catch (err) {
  setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
}
```

to:

```js
} else {
  capture('checkout_error', { kit: activeKit.id, source, stage: 'confirm', message: `unexpected status ${paymentIntent?.status}` });
  setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
}
} catch (err) {
  capture('checkout_error', { kit: activeKit.id, source, stage: 'network', message: '' });
  setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
}
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/BuyPage.jsx
git commit -m "feat(buy): capture checkout_error on card path failures"
```

---

### Task 3: Part B — `shouldShowIabGate` helper (TDD)

**Files:**
- Modify: `web/src/lib/inAppBrowser.js`
- Test: `web/src/lib/inAppBrowser.test.js`

**Interfaces:**
- Consumes: existing `isInAppBrowser(ua)`, `detectPlatform(ua)` in the same module.
- Produces: `shouldShowIabGate(ua?, search?) => boolean` — `ua` defaults to `navigator.userAgent`, `search` is a location-search string (e.g. `'?forceIab=1'`). Task 5 calls it as `shouldShowIabGate(undefined, window.location.search)`.

- [ ] **Step 1: Write the failing tests**

Append to `web/src/lib/inAppBrowser.test.js` (the `UA` fixture map with `facebook`, `androidWv`, `safari`, `chrome` keys already exists at the top of the file; add `shouldShowIabGate` to the existing import from `'./inAppBrowser'`):

```js
describe('shouldShowIabGate', () => {
  it('shows for Facebook iOS in-app browser', () =>
    expect(shouldShowIabGate(UA.facebook, '')).toBe(true));
  it('shows for a generic Android WebView', () =>
    expect(shouldShowIabGate(UA.androidWv, '')).toBe(true));
  it('hides for real Safari', () =>
    expect(shouldShowIabGate(UA.safari, '')).toBe(false));
  it('hides for real Chrome', () =>
    expect(shouldShowIabGate(UA.chrome, '')).toBe(false));
  it('forceIab=1 forces the gate in any browser', () =>
    expect(shouldShowIabGate(UA.chrome, '?forceIab=1')).toBe(true));
  it('handles missing search string', () =>
    expect(shouldShowIabGate(UA.safari, undefined)).toBe(false));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `shouldShowIabGate` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `web/src/lib/inAppBrowser.js`:

```js
/**
 * Whether /buy should replace the payment area with the in-app-browser gate:
 * a blocking "open in browser / continue here" choice card. True inside any
 * recognised iOS/Android in-app webview, where Apple Pay / Google Pay /
 * PayPal never render. `?forceIab=1` forces it for preview in any browser.
 * @param {string} [ua] user-agent; defaults to navigator.userAgent
 * @param {string} [search] location search string, e.g. '?forceIab=1'
 * @returns {boolean}
 */
export function shouldShowIabGate(ua, search) {
  if (search && new URLSearchParams(search).has('forceIab')) return true;
  if (!isInAppBrowser(ua)) return false;
  const platform = detectPlatform(ua);
  return platform === 'ios' || platform === 'android';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS (all pre-existing tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/inAppBrowser.js src/lib/inAppBrowser.test.js
git commit -m "feat(iab): shouldShowIabGate helper with forceIab preview override"
```

---

### Task 4: Part B — `IabCheckoutGate` component

**Files:**
- Create: `web/src/components/IabCheckoutGate.jsx`
- Create: `web/src/components/IabCheckoutGate.css`

**Interfaces:**
- Consumes: `detectInAppBrowser`, `detectPlatform`, `buildBreakoutUrl`, `buildAndroidIntentUrl` from `../lib/inAppBrowser.js`; `capture` from `../lib/analytics.js`; the global `.iab-overlay*` CSS classes from `InAppBrowserBanner.css` (already loaded on /buy via the fixed banner import).
- Produces: `<IabCheckoutGate kit={string} source={string} onContinue={() => void} />` — Task 5 mounts it. Events: `iab_gate_shown` (once per session), `iab_gate_open_clicked`, `iab_gate_continue_clicked`, all with `{ platform, app, kit, source }`.

- [ ] **Step 1: Create the component**

`web/src/components/IabCheckoutGate.jsx`:

```jsx
import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { detectInAppBrowser, detectPlatform, buildBreakoutUrl, buildAndroidIntentUrl } from '../lib/inAppBrowser.js';
import { capture } from '../lib/analytics.js';
import './IabCheckoutGate.css';

const SHOWN_KEY = 'solum_iab_gate_shown';

const APP_NAMES = {
  instagram: 'the Instagram app',
  facebook:  'the Facebook app',
  tiktok:    'the TikTok app',
  snapchat:  'the Snapchat app',
  twitter:   'the X app',
  android_webview: 'this app',
  none: 'this app', // forceIab preview in a real browser
};

// Blocking choice card shown in place of the express wallets + details form
// when the visitor is inside a social in-app webview. Apple Pay, Google Pay
// and PayPal never render there (Link does), so the card offers the breakout
// first and keeps the card form one tap away.
export default function IabCheckoutGate({ kit, source, onContinue }) {
  const app      = detectInAppBrowser();
  const platform = detectPlatform();
  const [showOverlay, setShowOverlay] = useState(false);

  const wallets = platform === 'android'
    ? 'Google Pay, Apple Pay or PayPal'
    : 'Apple Pay, Google Pay or PayPal';

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch { /* no-op */ }
    capture('iab_gate_shown', { platform, app, kit, source });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onOpen() {
    capture('iab_gate_open_clicked', { platform, app, kit, source });
    const distinctId = posthog.__loaded ? posthog.get_distinct_id() : undefined;
    if (platform === 'android') {
      window.location.href = buildAndroidIntentUrl(buildBreakoutUrl(distinctId));
    } else {
      if (distinctId) window.history.replaceState({}, '', buildBreakoutUrl(distinctId));
      setShowOverlay(true);
    }
  }

  function onStay() {
    capture('iab_gate_continue_clicked', { platform, app, kit, source });
    onContinue();
  }

  return (
    <div className="iabg-card">
      <div className="iabg-title">Pay with {wallets}</div>
      <p className="iabg-body">
        One tap payment only works in your full browser, not inside {APP_NAMES[app] ?? 'this app'}.
        Your kit and details carry over.
      </p>
      <button type="button" className="iabg-open" onClick={onOpen}>
        Open in browser <span aria-hidden="true">&#8599;</span>
      </button>
      <button type="button" className="iabg-stay" onClick={onStay}>
        or continue here and pay by card
      </button>

      {showOverlay && (
        <div className="iab-overlay" role="dialog" aria-modal="true" onClick={() => setShowOverlay(false)}>
          <div className="iab-overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="iab-overlay-title">Open in Safari for 1 tap Apple Pay</div>
            <ol className="iab-overlay-steps">
              <li>Tap the menu (the dots or aA) at the top of the screen.</li>
              <li>Choose Open in Safari (or Open in Browser).</li>
            </ol>
            <button type="button" className="iab-overlay-btn" onClick={() => setShowOverlay(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the styles**

`web/src/components/IabCheckoutGate.css`:

```css
/* Blocking choice card — replaces the express wallets + details form for
   in-app-browser visitors until they pick a path. Brand palette only. */
.iabg-card {
  margin: 0 0 22px;
  padding: 20px 16px;
  background: #181C24;                            /* Charcoal */
  border: 1px solid rgba(74, 143, 199, 0.35);      /* Sky Blue @ 35% */
  border-radius: 10px;
  text-align: center;
}
.iabg-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: #F0ECE2;                                  /* Bone */
  letter-spacing: 0.4px;
  margin-bottom: 8px;
}
.iabg-body {
  font-size: 13px;
  font-weight: 300;
  line-height: 1.5;
  color: rgba(240, 236, 226, 0.75);
  margin: 0 auto 16px;
  max-width: 300px;
}
.iabg-open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  background: #2E6DA4;                             /* Steel Blue */
  color: #F0ECE2;
  border: none;
  border-radius: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
}
.iabg-stay {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  background: none;
  border: none;
  color: rgba(240, 236, 226, 0.65);
  font-size: 13px;
  font-weight: 400;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/IabCheckoutGate.jsx src/components/IabCheckoutGate.css
git commit -m "feat(iab): blocking checkout gate card for in-app browsers"
```

---

### Task 5: Part B — wire the gate into the /buy details step

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (imports ~line 14; main component state ~line 825; details-step render block, currently lines ~1261–1302)

**Interfaces:**
- Consumes: `shouldShowIabGate(ua, search)` (Task 3), `<IabCheckoutGate kit source onContinue />` (Task 4).
- Produces: sessionStorage key `solum_iab_gate_continue` ('1' once the user chooses the card path).

- [ ] **Step 1: Add imports**

Next to the existing `InAppBrowserBanner` import:

```js
import IabCheckoutGate from '../components/IabCheckoutGate.jsx';
```

and add `shouldShowIabGate` to the existing import from `../lib/inAppBrowser.js` (if BuyPage has no import from that module yet, add:
`import { shouldShowIabGate } from '../lib/inAppBrowser.js';`).

- [ ] **Step 2: Add gate state to the main component**

Near the express state (`const [expressAvailable, setExpressAvailable] = useState(false);`):

```js
// In-app-browser gate: block the payment area until the visitor either
// breaks out to their real browser or knowingly continues in-app.
const IAB_CONTINUE_KEY = 'solum_iab_gate_continue';
const [iabContinued, setIabContinued] = useState(() => {
  try { return sessionStorage.getItem(IAB_CONTINUE_KEY) === '1'; } catch { return false; }
});
const iabGate = !iabContinued && shouldShowIabGate(undefined, window.location.search);
const continueInApp = () => {
  try { sessionStorage.setItem(IAB_CONTINUE_KEY, '1'); } catch { /* no-op */ }
  setIabContinued(true);
};
```

(Declare `IAB_CONTINUE_KEY` at module scope next to other constants if the codebase style prefers; either is fine.)

- [ ] **Step 3: Replace the inline banner and gate the payment area**

Delete the line:

```jsx
{step === 'details' && <InAppBrowserBanner variant="inline" />}
```

Change the express wrap so the gate renders inside the same `formStartRef` container (this keeps `scrollToForm()` and the `scroll-margin-top` working):

```jsx
{/* Express checkout — one-tap wallets, above the manual form. For in-app
    browsers the blocking gate takes this slot until the visitor chooses. */}
{step === 'details' && (
  <div className="by-express-wrap" ref={formStartRef}>
    {iabGate ? (
      <IabCheckoutGate kit={selectedKit} source={source} onContinue={continueInApp} />
    ) : (
      <>
        {!expressReady && <div className="by-express-skel" aria-hidden="true" />}
        <Elements
          key={selectedKit}
          stripe={stripePromise}
          options={{ mode: 'payment', amount: price * 100, currency: 'gbp', appearance: stripeAppearance }}
        >
          <ExpressCheckout
            kitId={selectedKit}
            price={price}
            source={source}
            authHeaders={authHeaders}
            onError={setError}
            onAvailability={(a) => { setExpressAvailable(a); setExpressReady(true); }}
          />
        </Elements>
        {expressAvailable && (
          <>
            <div className="by-express-consent">
              By continuing with Apple Pay or Link, you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </div>
            <div className="by-express-or"><span>or pay by card</span></div>
          </>
        )}
      </>
    )}
  </div>
)}
```

Gate the progress bar and details form (the two blocks immediately following):

```jsx
{step === 'details' && !iabGate && <ProgressBar step="details" />}
```

and change `{step === 'details' && (` on the details `<form onSubmit={handleDetailsNext} ...>` block to:

```jsx
{step === 'details' && !iabGate && (
```

- [ ] **Step 4: Run unit tests and lint**

Run: `npm run test:unit && npm run lint`
Expected: PASS / no new errors.

- [ ] **Step 5: Verify in the browser**

Run the dev server (`npm run dev`, port 5173) and open:
`http://localhost:5173/buy?kit=ritual&forceIab=1`

Expected: kit summary renders; in the payment slot a Charcoal card titled "Pay with Apple Pay, Google Pay or PayPal" with a Steel Blue "Open in browser" button and an underlined "or continue here and pay by card" link. No Stripe wallets, no progress bar, no details form. Tapping "continue here" reveals the normal express skeleton + form, and reloading with `forceIab=1` keeps the form (sessionStorage). Without `forceIab=1` the page is unchanged.
Also confirm `iab_gate_shown` / `iab_gate_continue_clicked` appear in the network tab (PostHog `/e/` requests) or via `scripts/posthog/watch_events.py`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/BuyPage.jsx
git commit -m "feat(buy): block payment area with IAB gate until browser breakout or explicit continue"
```

---

### Task 6: Full verification + deploy to dev

**Files:** none new.

- [ ] **Step 1: Full test + build pass**

Run: `npm run test:unit && npm run lint && npm run build`
Expected: all green, production build succeeds.

- [ ] **Step 2: Verify Part A events fire on dev**

On `http://localhost:5173/buy?kit=ritual` (real browser, no forceIab): open devtools network tab filtered to `/e/`, click a wallet button (Link renders in dev), close the sheet. Expected: `express_clicked` with `wallet`, then `express_cancelled`.

- [ ] **Step 3: Push dev branch**

```bash
git push origin dev
```

Amplify auto-deploys the dev branch. Smoke-test the gate on the dev URL from a phone inside the Instagram/Facebook app (paste the dev link in a DM to yourself) — confirm the gate shows, "Open in browser" breaks out on Android / shows Safari instructions on iOS, and the events land in PostHog.

- [ ] **Step 4: Hand off for sign-off**

Report verification results to Harsha. Merge to master only after explicit sign-off (standard workflow).
