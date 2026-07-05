# In-App-Browser Break-Out Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dismissible `/buy` banner that lets in-app-browser (Instagram/Facebook/TikTok) users reopen checkout in their system browser — unlocking Apple Pay / Google Pay — while preserving ad attribution and PostHog person continuity across the jump.

**Architecture:** Pure detection/URL helpers live in `web/src/lib/inAppBrowser.js` (already contains `detectInAppBrowser`/`isInAppBrowser`). A self-contained `InAppBrowserBanner` component consumes them and renders on `/buy`. `analytics.js` bootstraps PostHog from a forwarded `distinct_id`. No server changes.

**Tech Stack:** React 19, Vite, vitest (unit), posthog-js, existing checkout CSS.

## Global Constraints

- All web app code under `web/`. Unit tests are vitest, colocated as `*.test.js`, run with `npm run test:unit` (from `web/`).
- Min font sizes: body ≥ 13px, labels ≥ 11px.
- Copy: no em/en/double dashes.
- Brand colours only: SOLUM Black `#08090B`, Charcoal `#181C24`, Deep Blue `#1A4A78`, Steel Blue `#2E6DA4`, Sky Blue `#4A8FC7`, Bone `#F0ECE2`. Never orange/amber/yellow/green.
- Scope: `/buy` only. No auto-redirect. No server-side changes. No A/B wiring in v1.
- Existing tested exports in `inAppBrowser.js` (`detectInAppBrowser`, `isInAppBrowser`) must keep passing — extend, do not rewrite.

---

## File Structure

- `web/src/lib/inAppBrowser.js` — MODIFY: add `detectPlatform`, `buildBreakoutUrl`, `buildAndroidIntentUrl`.
- `web/src/lib/inAppBrowser.test.js` — MODIFY: add tests for the three new functions.
- `web/src/components/InAppBrowserBanner.jsx` — CREATE: banner + iOS instructions overlay.
- `web/src/components/InAppBrowserBanner.css` — CREATE: banner/overlay styles.
- `web/src/lib/analytics.js` — MODIFY: bootstrap PostHog `distinctID` from URL, strip param.
- `web/src/pages/BuyPage.jsx` — MODIFY: mount `<InAppBrowserBanner />` inside each `BuyCheckoutNav` render branch.

---

### Task 1: Platform detection

**Files:**
- Modify: `web/src/lib/inAppBrowser.js`
- Test: `web/src/lib/inAppBrowser.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `detectPlatform(ua?: string) => 'ios' | 'android' | 'other'`

- [ ] **Step 1: Write the failing test** — append to `web/src/lib/inAppBrowser.test.js`:

```js
import { detectPlatform } from './inAppBrowser';

describe('detectPlatform', () => {
  it('detects iOS from iPhone UA', () =>
    expect(detectPlatform(UA.instagram)).toBe('ios'));
  it('detects iOS from iPad UA', () =>
    expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe('ios'));
  it('detects Android', () =>
    expect(detectPlatform(UA.androidWv)).toBe('android'));
  it('returns other for desktop', () =>
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15')).toBe('other'));
  it('returns other for empty UA', () =>
    expect(detectPlatform('')).toBe('other'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/inAppBrowser.test.js`
Expected: FAIL — `detectPlatform is not a function` (or import error).

- [ ] **Step 3: Write minimal implementation** — add to `web/src/lib/inAppBrowser.js`:

```js
/**
 * @param {string} [ua] user-agent string; defaults to navigator.userAgent
 * @returns {'ios'|'android'|'other'}
 */
export function detectPlatform(ua) {
  const s = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!s) return 'other';
  if (/iPhone|iPad|iPod/i.test(s)) return 'ios';
  if (/Android/i.test(s)) return 'android';
  return 'other';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/inAppBrowser.test.js`
Expected: PASS (all detectInAppBrowser + detectPlatform tests green).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/inAppBrowser.js web/src/lib/inAppBrowser.test.js
git commit -m "feat(checkout): detectPlatform for iab break-out"
```

---

### Task 2: Break-out URL builder

**Files:**
- Modify: `web/src/lib/inAppBrowser.js`
- Test: `web/src/lib/inAppBrowser.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildBreakoutUrl(distinctId?: string, href?: string) => string` — returns an absolute https URL equal to `href` (default `window.location.href`) with `distinct_id` appended when provided and not already present. `href` param exists for testability.

- [ ] **Step 1: Write the failing test** — append:

```js
import { buildBreakoutUrl } from './inAppBrowser';

describe('buildBreakoutUrl', () => {
  const base = 'https://bysolum.co.uk/buy?source=first_batch&kit=ritual&fbclid=abc';

  it('preserves all existing query params', () => {
    const out = buildBreakoutUrl('ph_123', base);
    expect(out).toContain('source=first_batch');
    expect(out).toContain('kit=ritual');
    expect(out).toContain('fbclid=abc');
  });
  it('appends distinct_id', () => {
    expect(buildBreakoutUrl('ph_123', base)).toContain('distinct_id=ph_123');
  });
  it('does not duplicate distinct_id if already present', () => {
    const withId = base + '&distinct_id=old';
    const out = buildBreakoutUrl('ph_new', withId);
    expect(out.match(/distinct_id=/g)).toHaveLength(1);
    expect(out).toContain('distinct_id=old');
  });
  it('omits distinct_id when none provided', () => {
    expect(buildBreakoutUrl(undefined, base)).not.toContain('distinct_id=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/inAppBrowser.test.js`
Expected: FAIL — `buildBreakoutUrl is not a function`.

- [ ] **Step 3: Write minimal implementation** — add to `web/src/lib/inAppBrowser.js`:

```js
/**
 * Absolute https URL to reopen in the system browser, with distinct_id forwarded
 * for PostHog person continuity. All existing query params are preserved.
 * @param {string} [distinctId] PostHog distinct id to forward
 * @param {string} [href] source URL; defaults to window.location.href
 * @returns {string}
 */
export function buildBreakoutUrl(distinctId, href) {
  const src = href ?? (typeof window !== 'undefined' ? window.location.href : '');
  const url = new URL(src);
  if (distinctId && !url.searchParams.has('distinct_id')) {
    url.searchParams.set('distinct_id', distinctId);
  }
  return url.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/inAppBrowser.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/inAppBrowser.js web/src/lib/inAppBrowser.test.js
git commit -m "feat(checkout): buildBreakoutUrl forwards params + distinct_id"
```

---

### Task 3: Android intent URL builder

**Files:**
- Modify: `web/src/lib/inAppBrowser.js`
- Test: `web/src/lib/inAppBrowser.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildAndroidIntentUrl(httpsUrl: string) => string` — wraps an https URL in an `intent://` URL that opens the default browser, with the original URL as `browser_fallback_url`. Any `#fragment` on the input is stripped so the intent string stays well-formed.

- [ ] **Step 1: Write the failing test** — append:

```js
import { buildAndroidIntentUrl } from './inAppBrowser';

describe('buildAndroidIntentUrl', () => {
  const url = 'https://bysolum.co.uk/buy?source=first_batch&distinct_id=ph_1';

  it('produces a scheme=https intent that ends with ;end', () => {
    const out = buildAndroidIntentUrl(url);
    expect(out.startsWith('intent://bysolum.co.uk/buy?source=first_batch&distinct_id=ph_1')).toBe(true);
    expect(out).toContain('#Intent;scheme=https;');
    expect(out.endsWith(';end')).toBe(true);
  });
  it('does NOT hardcode a browser package', () => {
    expect(buildAndroidIntentUrl(url)).not.toContain('package=');
  });
  it('includes a URL-encoded browser_fallback_url', () => {
    const out = buildAndroidIntentUrl(url);
    expect(out).toContain('S.browser_fallback_url=' + encodeURIComponent(url));
  });
  it('strips a fragment so the intent delimiter cannot collide', () => {
    const out = buildAndroidIntentUrl(url + '#section');
    // exactly one "#Intent" delimiter, no stray "#section" before it
    expect(out.match(/#/g)).toHaveLength(1);
    expect(out).not.toContain('#section');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/inAppBrowser.test.js`
Expected: FAIL — `buildAndroidIntentUrl is not a function`.

- [ ] **Step 3: Write minimal implementation** — add to `web/src/lib/inAppBrowser.js`:

```js
/**
 * Wrap an https URL in an Android intent:// URL that opens the user's default
 * browser (no hardcoded package). The original URL is the browser_fallback_url.
 * Any fragment on the input is dropped so it can't collide with the #Intent
 * delimiter.
 * @param {string} httpsUrl
 * @returns {string}
 */
export function buildAndroidIntentUrl(httpsUrl) {
  const u = new URL(httpsUrl);
  const fallback = u.origin + u.pathname + u.search; // no hash
  const withoutScheme = u.host + u.pathname + u.search; // host + path + query
  return `intent://${withoutScheme}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/inAppBrowser.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/inAppBrowser.js web/src/lib/inAppBrowser.test.js
git commit -m "feat(checkout): buildAndroidIntentUrl default-browser intent"
```

---

### Task 4: PostHog distinct_id bootstrap on arrival

**Files:**
- Modify: `web/src/lib/analytics.js:6-27` (the `initAnalytics` function)

**Interfaces:**
- Consumes: `posthog.init` options.
- Produces: no new export; behavioural change only — when the current URL has `?distinct_id=…`, PostHog is bootstrapped with it and the param is removed from the address bar.

- [ ] **Step 1: Implement the bootstrap + param strip**

Replace the body of `initAnalytics()` in `web/src/lib/analytics.js` so it reads the param before init and strips it after. The function currently starts with `if (!KEY) return;` then `posthog.init(KEY, { ... });`. Update to:

```js
export function initAnalytics() {
  if (!KEY) return;

  // Session continuity across an in-app-browser break-out: if we were reopened
  // in the system browser with a forwarded distinct_id, bootstrap PostHog with
  // it so this visit is the same person, not a new one.
  let bootstrap;
  try {
    const forwarded = new URLSearchParams(window.location.search).get('distinct_id');
    if (forwarded) bootstrap = { distinctID: forwarded };
  } catch { /* no-op */ }

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: 'https://eu.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true, creditCard: true },
    },
    persistence: 'localStorage',
    ...(bootstrap ? { bootstrap } : {}),
  });

  // Remove distinct_id from the address bar so it does not linger or get re-forwarded.
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('distinct_id')) {
      url.searchParams.delete('distinct_id');
      window.history.replaceState({}, '', url.toString());
    }
  } catch { /* no-op */ }

  // Tag every event with the in-app browser (Instagram/TikTok/etc.) so we can
  // segment sessions that can't show Apple Pay / Google Pay wallet buttons.
  // $browser can't distinguish these — the webview reports itself as Safari/Chrome.
  const iab = detectInAppBrowser();
  posthog.register({ in_app_browser: iab, is_in_app_browser: iab !== 'none' });
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd web && npx vite build`
Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/analytics.js
git commit -m "feat(analytics): bootstrap posthog distinct_id from break-out URL"
```

---

### Task 5: InAppBrowserBanner component + styles

**Files:**
- Create: `web/src/components/InAppBrowserBanner.jsx`
- Create: `web/src/components/InAppBrowserBanner.css`

**Interfaces:**
- Consumes: `isInAppBrowser`, `detectPlatform`, `buildBreakoutUrl`, `buildAndroidIntentUrl` from `../lib/inAppBrowser.js`; `capture` from `../lib/analytics.js`; `posthog` for `get_distinct_id()`.
- Produces: default export `InAppBrowserBanner` (no props). Renders null unless in an iOS/Android in-app browser and not dismissed this session.

- [ ] **Step 1: Create the stylesheet** — `web/src/components/InAppBrowserBanner.css`:

```css
.iab-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: #1A4A78; /* Deep Blue */
  color: #F0ECE2;      /* Bone */
  border: none;
  border-bottom: 1px solid rgba(240, 236, 226, 0.15);
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.3;
}
.iab-banner-text { flex: 1; font-weight: 600; letter-spacing: 0.2px; }
.iab-banner-arrow { flex-shrink: 0; color: #4A8FC7; font-weight: 700; }
.iab-banner-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(240, 236, 226, 0.7);
  cursor: pointer;
}
.iab-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(8, 9, 11, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.iab-overlay-card {
  background: #181C24; /* Charcoal */
  border: 1px solid rgba(240, 236, 226, 0.15);
  border-radius: 12px;
  padding: 22px 20px;
  max-width: 340px;
  color: #F0ECE2;
}
.iab-overlay-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
}
.iab-overlay-steps { font-size: 13px; line-height: 1.55; margin: 0 0 18px 18px; }
.iab-overlay-btn {
  width: 100%;
  padding: 11px;
  background: #2E6DA4; /* Steel Blue */
  color: #F0ECE2;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 2: Create the component** — `web/src/components/InAppBrowserBanner.jsx`:

```jsx
import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { isInAppBrowser, detectPlatform, buildBreakoutUrl, buildAndroidIntentUrl } from '../lib/inAppBrowser.js';
import { capture } from '../lib/analytics.js';
import './InAppBrowserBanner.css';

const DISMISS_KEY = 'solum_iab_banner_dismissed';

function wasDismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

export default function InAppBrowserBanner() {
  const platform = detectPlatform();
  const active = isInAppBrowser() && (platform === 'ios' || platform === 'android');

  const [hidden, setHidden] = useState(() => wasDismissed());
  const [showOverlay, setShowOverlay] = useState(false);

  // Fire the "shown" event once on mount when the banner is actually visible.
  useEffect(() => {
    if (active && !hidden) capture('iab_banner_shown', { platform });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active || hidden) return null;

  const distinctId = posthog.__loaded ? posthog.get_distinct_id() : undefined;
  const wallet = platform === 'ios' ? 'Apple Pay' : 'Google Pay';

  function onOpen() {
    capture('iab_banner_clicked', { platform });
    if (platform === 'android') {
      window.location.href = buildAndroidIntentUrl(buildBreakoutUrl(distinctId));
    } else {
      setShowOverlay(true);
    }
  }

  function onDismiss(e) {
    e.stopPropagation();
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* no-op */ }
    capture('iab_banner_dismissed', { platform });
    setHidden(true);
  }

  return (
    <>
      <button type="button" className="iab-banner" onClick={onOpen}>
        <span className="iab-banner-text">
          Faster checkout. Open in your browser for 1 tap {wallet}
        </span>
        <span className="iab-banner-arrow" aria-hidden="true">&#8599;</span>
        <span
          className="iab-banner-close"
          role="button"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
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
    </>
  );
}
```

Note: copy uses no dashes (constraint). The `&#8599;` is the up-right arrow glyph.

- [ ] **Step 3: Verify build compiles**

Run: `cd web && npx vite build`
Expected: `✓ built` with no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/InAppBrowserBanner.jsx web/src/components/InAppBrowserBanner.css
git commit -m "feat(checkout): InAppBrowserBanner nudge + iOS instructions overlay"
```

---

### Task 6: Mount the banner on /buy

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (imports near top; the three `return (` branches that render `<BuyCheckoutNav />` — around lines 842, 916, 945)

**Interfaces:**
- Consumes: default export `InAppBrowserBanner` from `../components/InAppBrowserBanner.jsx`.
- Produces: banner rendered directly under `<BuyCheckoutNav />` in every `/buy` render branch.

- [ ] **Step 1: Add the import** — near the other component imports (e.g. after the `TrustBar` import around line 12):

```jsx
import InAppBrowserBanner from '../components/InAppBrowserBanner.jsx';
```

- [ ] **Step 2: Render it under each BuyCheckoutNav** — for EACH of the three occurrences of `<BuyCheckoutNav />` in `BuyPage.jsx`, insert the banner immediately after it:

```jsx
        <BuyCheckoutNav />
        <InAppBrowserBanner />
```

(There are three: the soldout branch ~842, another early-return branch ~916, and the main return ~945. Apply to all three so the banner shows regardless of checkout state.)

- [ ] **Step 3: Verify build + lint of the file compile**

Run: `cd web && npx vite build && npx eslint src/pages/BuyPage.jsx`
Expected: `✓ built`; eslint shows only the pre-existing warnings already present in the file (no new errors referencing `InAppBrowserBanner`).

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/BuyPage.jsx
git commit -m "feat(checkout): mount InAppBrowserBanner on /buy"
```

---

### Task 7: Full suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `cd web && npm run test:unit`
Expected: PASS, including all `inAppBrowser.test.js` cases (detectInAppBrowser, detectPlatform, buildBreakoutUrl, buildAndroidIntentUrl).

- [ ] **Step 2: Production build**

Run: `cd web && npx vite build`
Expected: `✓ built` with no errors.

- [ ] **Step 3: Manual device check (document results, do not block commit)**

Verify on real devices/emulators where possible:
- iOS in-app browser (open a `bysolum.co.uk/buy` link inside Instagram DM): banner appears, tap opens the instructions overlay.
- Android in-app browser: banner appears, tap opens the default browser at `/buy` with `source`/`fbclid` params intact.
- Real Safari and real Chrome: no banner.
- After Android break-out, confirm the address bar has no `distinct_id` param (stripped) and the page loads normally.

---

## Notes for the implementer

- Do not modify the existing `detectInAppBrowser` / `isInAppBrowser` functions or their tests — only append new exports and new `describe` blocks.
- `posthog.get_distinct_id()` is only safe after init; the component guards with `posthog.__loaded`. If unavailable, `buildBreakoutUrl(undefined)` correctly omits the param (Meta/TikTok attribution still rides the existing query string).
- Keep all copy free of em/en/double dashes and all colours within the locked brand palette (see Global Constraints).
