# Free Delivery Launch Offer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the (already free) UK delivery as a visible, honest, time-bound launch incentive — "free delivery worth £5.95, launch offer ends 11 Aug 2026" — across four placements, driven by one config file, with no backend changes.

**Architecture:** A single config module (`web/src/lib/offer.js`) exposes the offer values and two pure helpers (`offerActive`, `daysLeft`). Four frontend placements import it and render the offer only when `offerActive()` is true: a new sitewide `OfferBar` (mounted in `App.jsx`, dismiss-for-session), a Hero line, a struck price line on kit cards, and a struck delivery row in the BuyPage order summary.

**Tech Stack:** React (Vite), plain CSS-in-JS string `<style>` blocks (existing pattern), Vitest (node env) for pure-logic unit tests.

**Spec:** `docs/superpowers/specs/2026-06-30-free-delivery-launch-offer-design.md`

## Global Constraints

- No backend / Stripe / DB / migration changes. Frontend only.
- No £5.95 (or any) auto-charge. Delivery stays genuinely free; copy never claims "you will pay £5.95 after".
- Offer values live ONLY in `web/src/lib/offer.js` — no hardcoded `£5.95` or `11 Aug` duplicated in components except as display text fed from config where practical.
- Copy: NO em/en/double dashes — use `·` or commas. Anchored value text is `£5.95`. End date display is `11 Aug`.
- Min font sizes: 13px body, 11px labels. Palette: SOLUM Black `#08090B`, Bone `#F0ECE2`, Steel Blue `#2E6DA4`. Barlow Condensed; uppercase for labels.
- Each placement renders nothing when `offerActive()` is false (graceful fallback to existing plain "Free UK delivery" trust signal).
- Vitest is node-env (`vitest.config.js`): only pure JS is unit-tested. Components are verified via `npm run build` + manual check.
- Work on the `dev` branch (project rule). Commit per task.

---

### Task 1: Offer config module + unit tests

**Files:**
- Create: `web/src/lib/offer.js`
- Test: `web/src/lib/offer.test.js`

**Interfaces:**
- Produces:
  - `DELIVERY_OFFER` — `{ enabled: boolean, value: string, valuePence: number, endDate: string }`
  - `offerActive(now?: Date): boolean` — true when `enabled` and `now <= endDate 23:59:59`
  - `daysLeft(now?: Date): number` — whole days until `endDate` end-of-day, floored at 0

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/offer.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { DELIVERY_OFFER, offerActive, daysLeft } from './offer.js';

describe('DELIVERY_OFFER config', () => {
  it('has the locked launch values', () => {
    expect(DELIVERY_OFFER.value).toBe('£5.95');
    expect(DELIVERY_OFFER.valuePence).toBe(595);
    expect(DELIVERY_OFFER.endDate).toBe('2026-08-11');
  });
});

describe('offerActive', () => {
  it('is true on a day before the end date', () => {
    expect(offerActive(new Date('2026-08-01T12:00:00'))).toBe(true);
  });
  it('is true on the end date itself (before end of day)', () => {
    expect(offerActive(new Date('2026-08-11T12:00:00'))).toBe(true);
  });
  it('is false the day after the end date', () => {
    expect(offerActive(new Date('2026-08-12T00:00:00'))).toBe(false);
  });
});

describe('daysLeft', () => {
  it('counts whole days to end of the end date', () => {
    expect(daysLeft(new Date('2026-08-09T23:59:59'))).toBe(2);
  });
  it('floors at 0 once the date has passed', () => {
    expect(daysLeft(new Date('2026-08-12T00:00:00'))).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit -- offer`
Expected: FAIL — `Failed to resolve import "./offer.js"` / module not found.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/offer.js`:
```js
// Single source of truth for the free-delivery launch offer.
// Honest, time-bound, no auto-charge: delivery is genuinely free during launch;
// £5.95 is the realistic tracked-delivery price we would charge post-launch.
// Turn the offer off by setting enabled:false or letting endDate pass — one place.
export const DELIVERY_OFFER = {
  enabled: true,
  value: '£5.95',        // anchored worth of UK tracked delivery (display)
  valuePence: 595,       // for the struck-through checkout line
  endDate: '2026-08-11', // launch offer end (6 weeks from 2026-06-30)
};

function endOfDay() {
  return new Date(DELIVERY_OFFER.endDate + 'T23:59:59');
}

export function offerActive(now = new Date()) {
  return DELIVERY_OFFER.enabled && now <= endOfDay();
}

export function daysLeft(now = new Date()) {
  return Math.max(0, Math.ceil((endOfDay() - now) / 86400000));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit -- offer`
Expected: PASS — all assertions green, output pristine.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/offer.js web/src/lib/offer.test.js
git commit -m "feat(offer): free-delivery launch offer config + helpers"
```

---

### Task 2: Sitewide OfferBar + mount in App

**Files:**
- Create: `web/src/components/OfferBar.jsx`
- Modify: `web/src/App.jsx` (add import; render `<OfferBar />` inside `<BrowserRouter>` above `<AuthRedirectGuard />`)

**Interfaces:**
- Consumes: `offerActive`, `daysLeft`, `DELIVERY_OFFER` from `web/src/lib/offer.js`
- Produces: default-exported `OfferBar` React component

- [ ] **Step 1: Create the component**

Create `web/src/components/OfferBar.jsx`:
```jsx
import { useState } from 'react';
import { offerActive, daysLeft, DELIVERY_OFFER } from '../lib/offer.js';

const CSS = `
.offerbar {
  width: 100%;
  background: #08090B;
  border-bottom: 1px solid rgba(240,236,226,0.10);
  color: #F0ECE2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 9px 40px;
  position: relative;
  font-family: 'Barlow Condensed', sans-serif;
}
.offerbar-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
}
.offerbar-accent { color: #2E6DA4; }
.offerbar-dismiss {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(240,236,226,0.55);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}
.offerbar-dismiss:hover { color: #F0ECE2; }
@media (max-width: 600px) {
  .offerbar { padding: 8px 32px; }
  .offerbar-text { font-size: 11px; letter-spacing: 1px; }
}
`;

const DISMISS_KEY = 'offerbar_dismissed';

export default function OfferBar() {
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  if (!offerActive() || dismissed) return null;

  const dleft = daysLeft();
  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="offerbar" role="region" aria-label="Delivery offer">
      <style>{CSS}</style>
      <span className="offerbar-text">
        Free UK delivery · <span className="offerbar-accent">worth {DELIVERY_OFFER.value}</span> · launch offer ends 11 Aug{dleft > 0 ? ` · ${dleft} days left` : ''}
      </span>
      <button className="offerbar-dismiss" onClick={dismiss} aria-label="Dismiss offer">×</button>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in App.jsx**

In `web/src/App.jsx`, add the import near the other component imports:
```jsx
import OfferBar from './components/OfferBar.jsx';
```
Then render it inside `<BrowserRouter>`, immediately before `<AuthRedirectGuard />`:
```jsx
    <BrowserRouter>
      <OfferBar />
      <AuthRedirectGuard />
      <Routes>
```

- [ ] **Step 3: Verify build + existing unit tests**

Run: `cd web && npm run build && npm run test:unit`
Expected: build succeeds with no errors; all unit tests pass (including Task 1's `offer.test.js`).

- [ ] **Step 4: Manual visual check**

Run `cd web && npm run dev`, open localhost:5173. Expected: slim black bar at the very top on `/` and `/buy`, text "Free UK delivery · worth £5.95 · launch offer ends 11 Aug · N days left", `×` dismisses it for the session (gone after dismiss, returns after closing the tab and reopening). Confirm it does not visually collide with `Nav`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/OfferBar.jsx web/src/App.jsx
git commit -m "feat(offer): sitewide dismiss-for-session free-delivery bar"
```

---

### Task 3: Hero line, kit-card price line, checkout summary row

**Files:**
- Modify: `web/src/components/Hero.jsx` (the non-Father's-Day hero branch, near the CTA actions ~line 132)
- Modify: `web/src/components/KitComparison.jsx` (inside the `.kit-prices` block per card, after the `KITS.filter(k => !k.hidden).map` ~line 101; add CSS in the component's `CSS` string)
- Modify: `web/src/pages/BuyPage.jsx` (right-rail summary, after the existing delivery line at ~line 262)

**Interfaces:**
- Consumes: `offerActive`, `DELIVERY_OFFER` from `web/src/lib/offer.js`

- [ ] **Step 1: Hero line**

In `web/src/components/Hero.jsx`, add the import at the top with the other imports:
```jsx
import { offerActive } from '../lib/offer.js';
```
The current Father's Day branch shows a dated `hero-fd-deadline` line. In the standard (non-Father's-Day) hero branch, immediately after the `hero-actions` block (the `<div className="hero-actions">…</div>` containing the primary/ghost CTAs), add:
```jsx
{offerActive() && (
  <p className="hero-fd-deadline" style={{ color: 'rgba(240,236,226,0.7)' }}>
    <span style={{ color: '#2E6DA4' }}>✓</span> Free UK delivery this batch · worth £5.95
  </p>
)}
```
(Reuses the existing `hero-fd-deadline` class for spacing; ≥13px is satisfied by that class. If the standard hero branch has no `hero-actions` wrapper, place the line directly after the primary CTA anchor.)

- [ ] **Step 2: Kit-card delivery line**

In `web/src/components/KitComparison.jsx`, add the import at the top:
```jsx
import { offerActive } from '../lib/offer.js';
```
Add this rule to the component's CSS string (near `.kit-price-sub` ~line 33):
```css
.kit-price-delivery{font-size:13px;color:var(--mist);font-weight:300;margin-top:6px;}
.kit-price-delivery s{color:var(--stone);}
.kit-price-delivery .free{color:#2E6DA4;font-weight:600;letter-spacing:1px;}
```
Inside the per-card render, within the `.kit-prices` container (after `.kit-price-sub`), add (only for purchasable cards — the `.filter(k => !k.hidden)` already excludes SOVEREIGN, and guard on `!kit.comingSoon`):
```jsx
{offerActive() && !kit.comingSoon && (
  <div className="kit-price-delivery">
    Delivery <s>£5.95</s> <span className="free">FREE</span> · launch offer
  </div>
)}
```

- [ ] **Step 3: Checkout summary delivery row**

In `web/src/pages/BuyPage.jsx`, add the import at the top with the other imports:
```jsx
import { offerActive } from '../lib/offer.js';
```
In the right-rail summary (the `co-right` block), immediately after the existing line at ~262 (`<div className="co-price-sub" style={{ marginTop: 3 }}>Royal Mail Tracked 48 · Free · UK only</div>`), replace that line and add the struck treatment:
```jsx
{offerActive() ? (
  <div className="co-price-sub" style={{ marginTop: 3 }}>
    Royal Mail Tracked 48 · <s style={{ color: 'var(--stone)' }}>£5.95</s>{' '}
    <span style={{ color: '#2E6DA4', fontWeight: 600 }}>FREE</span> · UK only
  </div>
) : (
  <div className="co-price-sub" style={{ marginTop: 3 }}>Royal Mail Tracked 48 · Free · UK only</div>
)}
```
The order total is unchanged (delivery is genuinely free). Do NOT alter `price` / `Pay £{price}` anywhere.

- [ ] **Step 4: Verify build + unit tests + no dash violations**

Run:
```bash
cd web && npm run build && npm run test:unit
grep -rnE "—|–|--" src/components/Hero.jsx src/components/KitComparison.jsx src/components/OfferBar.jsx src/pages/BuyPage.jsx src/lib/offer.js | grep -iE "deliver|offer|5.95|free" || echo "no dash violations in offer copy"
```
Expected: build succeeds; unit tests pass; the grep prints "no dash violations in offer copy" (offer copy uses `·` and commas only).

- [ ] **Step 5: Manual visual check**

`cd web && npm run dev` → localhost:5173. Expected: hero shows the free-delivery line under the CTA; both GROUND and RITUAL kit cards show `Delivery £5̶.̶9̶5̶ FREE · launch offer`; `/buy?kit=ritual` order summary shows `Royal Mail Tracked 48 · £5̶.̶9̶5̶ FREE · UK only`; the Pay total is unchanged.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Hero.jsx web/src/components/KitComparison.jsx web/src/pages/BuyPage.jsx
git commit -m "feat(offer): free-delivery anchoring on hero, kit cards, checkout summary"
```

---

## Notes for the executor

- If `npm run build` flags an unused import in a file where `offerActive()` ended up guarded out, ensure the import is actually used (it is, in each placement).
- The Hero file has two branches (Father's Day vs standard). Put the new line in the STANDARD branch (the one with `hero-title` "You feel clean. Then you don't."). Leave the Father's Day branch alone.
- Playwright e2e (`npm test`) is not required for these visual additions, but if run, confirm no buy-flow selector broke (the summary change keeps existing classes; the new delivery row adds no test-id collisions).
- Turning the offer off after 11 Aug needs no code change (date-based); to kill it early, set `enabled:false` in `web/src/lib/offer.js`.
