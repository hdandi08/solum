# Reconciled Meta/TikTok Ads — AddToCart Event + Campaign Runbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fire a standard `AddToCart` on Meta + TikTok when a user clicks a kit Buy-Now/select button (never on `/buy` page load), and document the reconciled 4-week campaign runbook.

**Architecture:** Mirror the existing `qualifiedVisit.js` (pure, unit-tested) / `qualifiedVisitTracker.js` (side-effectful, not unit-tested) split. A new pure resolver `addToCart.js` maps a kit id → `{kitId, kitName, value}` and is unit-tested in node. A new side-effectful `addToCartTracker.js` adds session dedup and fires PostHog + Meta + TikTok. All four kit-button entry points call the tracker; no page-load effect calls it.

**Tech Stack:** React (Vite), vitest (node env), Meta Pixel (`fbq`), TikTok Pixel (`ttq`), PostHog.

## Global Constraints

- Budget context: ~£35/day; cold optimizes `QualifiedVisit`, NOT AddToCart/Purchase. (Code here only fires the event; it does not change ad optimization.)
- `AddToCart` fires **only on an explicit kit button click**, never on `/buy` page load (including `?kit=` preselect).
- Dedup: at most once per kit per session (sessionStorage key `solum_atc_fired_<kitId>`).
- Currency always `'GBP'`. `content_type: 'product'`.
- Pixel calls are prod-gated inside `analytics.js` (`fbq`/`ttq` no-op unless host matches `bysolum.(com|co.uk)`); PostHog `capture` is NOT gated.
- vitest env is `node`; test files may import only modules that do NOT transitively import `analytics.js` (which reads `window.location` at module load). Pure resolver stays free of analytics imports.
- Never use the word "soap" anywhere.

---

### Task 1: Pure `resolveAddToCart` resolver + unit tests

**Files:**
- Create: `web/src/lib/addToCart.js`
- Test: `web/src/lib/addToCart.test.js`

**Interfaces:**
- Consumes: `KITS` from `web/src/data/kits.js` (array of `{ id, name, firstBoxPrice, comingSoon, ... }`).
- Produces: `resolveAddToCart(kitId: string) => { kitId: string, kitName: string, value: number } | null`. Returns `null` for unknown ids and coming-soon kits.

- [ ] **Step 1: Write the failing test**

```js
// web/src/lib/addToCart.test.js
import { describe, it, expect } from 'vitest';
import { resolveAddToCart } from './addToCart';

describe('resolveAddToCart', () => {
  it('resolves ground to its name + first-box price', () => {
    expect(resolveAddToCart('ground')).toEqual({ kitId: 'ground', kitName: 'GROUND', value: 65 });
  });
  it('resolves ritual to its name + first-box price', () => {
    expect(resolveAddToCart('ritual')).toEqual({ kitId: 'ritual', kitName: 'RITUAL', value: 85 });
  });
  it('returns null for an unknown kit id', () => {
    expect(resolveAddToCart('nope')).toBe(null);
  });
  it('returns null for a coming-soon kit (sovereign)', () => {
    expect(resolveAddToCart('sovereign')).toBe(null);
  });
  it('returns null for an undefined id', () => {
    expect(resolveAddToCart(undefined)).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit -- src/lib/addToCart.test.js`
Expected: FAIL — cannot resolve `./addToCart` / `resolveAddToCart is not a function`.

- [ ] **Step 3: Write the resolver**

```js
// web/src/lib/addToCart.js
import { KITS } from '../data/kits.js';

// Pure resolver: maps a kit id to the AddToCart payload, or null if the kit is
// unknown or not yet buyable (coming soon). No side effects, no analytics imports
// (keeps it node-testable — see plan Global Constraints).
export function resolveAddToCart(kitId) {
  const kit = KITS.find(k => k.id === kitId);
  if (!kit || kit.comingSoon) return null;
  return { kitId: kit.id, kitName: kit.name, value: kit.firstBoxPrice };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit -- src/lib/addToCart.test.js`
Expected: PASS (5 passing).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/addToCart.js web/src/lib/addToCart.test.js
git commit -m "feat(ads): pure resolveAddToCart resolver + unit tests"
```

---

### Task 2: Meta `fbAddToCart` helper + side-effectful `trackAddToCart` tracker

**Files:**
- Modify: `web/src/lib/analytics.js` (add `fbAddToCart` near `fbViewContent`, ~line 51)
- Create: `web/src/lib/addToCartTracker.js`

**Interfaces:**
- Consumes: `capture`, `fbAddToCart`, `ttqAddToCart` from `./analytics`; `resolveAddToCart` from `./addToCart`.
- Produces: `fbAddToCart(kitId, kitName, value) => void`; `trackAddToCart(kitId: string) => boolean` (returns `true` if it fired, `false` if unknown/coming-soon/duplicate).

> No unit test for the tracker: it imports `analytics.js`, which reads `window.location` at module load and would throw under the node test env. This mirrors `qualifiedVisitTracker.js` (untested; verified by build + manual/e2e smoke). Verification here is the production build.

- [ ] **Step 1: Add the Meta `fbAddToCart` helper**

In `web/src/lib/analytics.js`, immediately after `fbViewContent` (ends ~line 51), add:

```js
// Fires when a user clicks a kit Buy Now / select button (checkout begins)
export function fbAddToCart(kitId, kitName, value) {
  fbq('track', 'AddToCart', { content_name: kitName, content_ids: [kitId], content_type: 'product', value, currency: 'GBP' });
}
```

- [ ] **Step 2: Create the tracker**

```js
// web/src/lib/addToCartTracker.js
import { capture, fbAddToCart, ttqAddToCart } from './analytics';
import { resolveAddToCart } from './addToCart';

// Fires AddToCart (PostHog + Meta + TikTok) for an EXPLICIT kit button click.
// Dedup: at most once per kit per session. NEVER call from a page-load effect.
export function trackAddToCart(kitId) {
  const payload = resolveAddToCart(kitId);
  if (!payload) return false;
  const key = `solum_atc_fired_${payload.kitId}`;
  try { if (sessionStorage.getItem(key) === '1') return false; } catch { /* storage unavailable */ }
  try { sessionStorage.setItem(key, '1'); } catch { /* swallow */ }
  capture('add_to_cart', { kit_id: payload.kitId, kit_name: payload.kitName, value: payload.value });
  fbAddToCart(payload.kitId, payload.kitName, payload.value);
  ttqAddToCart(payload.kitId, payload.kitName, payload.value);
  return true;
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd web && npm run build`
Expected: build succeeds, no unresolved-import errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/analytics.js web/src/lib/addToCartTracker.js
git commit -m "feat(ads): fbAddToCart helper + trackAddToCart tracker (session-deduped)"
```

---

### Task 3: Wire `trackAddToCart` into all four kit-button entry points

**Files:**
- Modify: `web/src/components/KitComparison.jsx` (kit-cta `onClick`, ~line 165)
- Modify: `web/src/components/CTASection.jsx` (two kit `<a>` `onClick`, ~lines 37 & 45)
- Modify: `web/src/components/Hero.jsx` (Father's Day kit buttons, ~lines 126 & 130)
- Modify: `web/src/pages/BuyPage.jsx` (kit-card select, line 876; imports ~top)

**Interfaces:**
- Consumes: `trackAddToCart` from `../lib/addToCartTracker` (components) / `../lib/addToCartTracker` (BuyPage is in `pages/`, so `../lib/addToCartTracker`).

> Invariant being enforced: a click fires; a page load never does. Do NOT add `trackAddToCart` to any `useEffect`. The `/buy` page-load effect (`BuyPage.jsx:597`) must keep firing only `ViewContent`.

- [ ] **Step 1: Wire KitComparison**

Add import at top of `web/src/components/KitComparison.jsx`:

```jsx
import { trackAddToCart } from '../lib/addToCartTracker';
```

Change the kit-cta `onClick` (currently lines ~165-168):

```jsx
                      onClick={() => {
                        capture('kit_cta_clicked', { kit: kit.id, kit_name: kit.name });
                        trackAddToCart(kit.id);
                        navigate(`/buy?kit=${kit.id}`);
                      }}
```

- [ ] **Step 2: Wire CTASection**

Add import at top of `web/src/components/CTASection.jsx`:

```jsx
import { trackAddToCart } from '../lib/addToCartTracker';
```

Change the two kit `<a>` `onClick` handlers:

```jsx
            onClick={() => { trackGoal('bottom_cta_clicked', { variant: 'ritual' }); trackAddToCart('ritual'); }}
```

```jsx
            onClick={() => { trackGoal('bottom_cta_clicked', { variant: 'ground' }); trackAddToCart('ground'); }}
```

- [ ] **Step 3: Wire Hero (Father's Day kit buttons only — NOT the generic "Get Your Kit")**

Add import at top of `web/src/components/Hero.jsx`:

```jsx
import { trackAddToCart } from '../lib/addToCartTracker';
```

Change the RITUAL Father's Day `<a>` `onClick` (~line 126):

```jsx
                    onClick={() => { trackGoal('hero_cta_clicked', { variant: 'fathers-day-ritual' }); trackAddToCart('ritual'); }}
```

Add an `onClick` to the GROUND Father's Day `<a>` (~line 130), which currently has none:

```jsx
                  <a href="/buy?kit=ground&source=fathers-day" className="btn-ghost" onClick={() => trackAddToCart('ground')}>Gift the GROUND Kit</a>
```

Leave the generic `Get Your Kit` button (`href={IS_FIRST_BATCH ? '/buy' : '#kits'}`) unchanged — no kit chosen, no AddToCart.

- [ ] **Step 4: Wire BuyPage kit-card select; drop the now-unused direct `ttqAddToCart`**

In `web/src/pages/BuyPage.jsx`, add import (top, with the other lib imports):

```jsx
import { trackAddToCart } from '../lib/addToCartTracker';
```

Remove `ttqAddToCart` from the `analytics` import line (it is used only at line 876, which we are replacing).

Change line 876:

```jsx
                        onClick={() => { setSelectedKit(id); trackAddToCart(id); }}
```

- [ ] **Step 5: Verify no page-load AddToCart and build passes**

Run: `cd web && grep -n "trackAddToCart\|fbAddToCart\|ttqAddToCart" src/pages/BuyPage.jsx src/components/Hero.jsx src/components/CTASection.jsx src/components/KitComparison.jsx`
Expected: every match is inside an `onClick`, none inside a `useEffect`. The `BuyPage.jsx:597` load effect still shows only `fbViewContent` / `ttqViewContent`.

Run: `cd web && npm run build`
Expected: build succeeds, no unused-import or unresolved-import errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/KitComparison.jsx web/src/components/CTASection.jsx web/src/components/Hero.jsx web/src/pages/BuyPage.jsx
git commit -m "feat(ads): fire AddToCart on kit button clicks across all entry points"
```

---

### Task 4: Reconciled 4-week campaign runbook

**Files:**
- Create: `docs/runbooks/2026-06-30-ads-campaign-runbook.md`

> Operational documentation (no code, no test). Content drawn from the spec `docs/superpowers/specs/2026-06-30-reconciled-meta-ads-plan-design.md`.

- [ ] **Step 1: Write the runbook**

```markdown
# Ads Campaign Runbook — Reconciled 4-Week Launch (2026-06-30)

Budget ~£35/day. Spine: our QualifiedVisit-cold strategy. Sequencing: doc's warm-pixel-first.
Cross-cutting prerequisite: AddToCart-on-Buy-Now is live (see plan 2026-06-30-reconciled-meta-ads-plan).

## Week 1 — Signal building
- 1 Cold campaign, ~£25–30/day, broad (men 18–45, UK), Advantage+ placements, 3–5 creatives.
- Optimize: QualifiedVisit. Seed video-viewer + QualifiedVisit retargeting pools.
- Creative: personal invisible-consequence hooks, premium/proof-led.

## Week 2 — Layer conversion
- Cold stays on QualifiedVisit (~£20/day).
- Add Warm/Retarget (~£10–15/day): video-viewers 50%+ + QualifiedVisit-14d, offer-led (free delivery),
  optimize AddToCart.

## Week 3 — Purchase optimization
- Add Hot/Convert (~£10–15/day): checkout abandoners + InitiateCheckout, optimize Purchase (CAPI feeds it).
- Budget ~30/35/35 cold/warm/hot. Skip ASC (deferred).

## Week 4 — Scale what works
- ROAS >2× → +20–30% every 2–3 days. ROAS <1× after 5 days → kill. CPA rising → add creatives, not spend.
- Fresh creatives for fatigue. Skip subscription angle + lookalikes (deferred).

## Deferred triggers
- ASC: at ≥30–50 purchases. 1% Purchase LAL: at ≥50 purchasers.
- Subscription-angle creative: at Phase 3 (~2 months). Switch cold optimization
  QualifiedVisit→AddToCart→Purchase as weekly volume for the next-deeper event crosses ~50/week.

## Event reference (what fires)
- ViewContent: /buy load. AddToCart: kit button click (Meta + TikTok, deduped once/kit/session).
- InitiateCheckout: payment step. Purchase/CompletePayment: success + server CAPI (event_id = Stripe PI id).
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/2026-06-30-ads-campaign-runbook.md
git commit -m "docs(ads): reconciled 4-week campaign runbook"
```

---

## Post-implementation manual verification (cannot be unit-tested)

Pixel calls are prod-gated, so verify on a `bysolum` deploy:
- **PostHog (works on any env):** click a homepage kit button and a `/buy` kit card → confirm `add_to_cart` events with `kit_id`/`kit_name`/`value`, and that landing on `/buy` (incl. `?kit=ritual`) emits **no** `add_to_cart`.
- **Meta Events Manager → Test Events (prod):** kit click → one `AddToCart`; reaching payment → `InitiateCheckout` (distinct, not duplicated by the click).
- **TikTok Events (prod):** kit click → one `AddToCart`.
- **Dedup:** click the same kit twice in a session → exactly one `AddToCart`; clicking a different kit → a separate `AddToCart`.
