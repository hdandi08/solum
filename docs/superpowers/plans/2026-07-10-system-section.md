# System Section + Kit-List Outcome Lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Reviews section with the "Nobody ever gave you a system" chaos-vs-system section, reorder Products above Ritual on the homepage, and add outcome lines to all three kit product lists.

**Architecture:** One new self-contained component (`SystemSection.jsx`, CSS-in-component like every other section), a composition change in `FullSite.jsx`, deletion of three orphaned review files, and small row-markup additions in `KitComparison.jsx` and `BuyPage.jsx` consuming the existing `outcome.tileAfter` field.

**Tech Stack:** React (Vite) in `web/`, vitest (`npm run test:unit`), Playwright (`npx playwright test`, auto-starts dev server on :5173).

**Spec:** `docs/superpowers/specs/2026-07-10-system-section-design.md`

## Global Constraints

- Branch `dev`, repo root `/Users/harshamahadeva/NewCo/solum`. Commit messages end with trailer line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **No em dashes (—), en dashes (–), or double hyphens (--) in any copy.** Use `·`, periods, commas, "to" for ranges.
- Minimum font sizes: **13px body, 11px labels**.
- Colours via existing CSS vars: `--black`, `--char`, `--blue` (#2E6DA4), `--blit` (#4A8FC7), `--bone`, `--stone`, `--mist`, `--line`, `--lineb`. After-panel tint `#12233a`.
- Bebas Neue for section headings only; body Barlow Condensed (inherited).
- Never the word "soap" in copy. Products without `outcome` render without the new elements.
- Known pre-existing failures to ignore: 3 stale tests in `src/lib/dispatch.test.js`.

---

### Task A: SystemSection component, homepage reorder, Reviews removal

**Files:**
- Create: `web/src/components/SystemSection.jsx`
- Modify: `web/src/pages/FullSite.jsx` (imports ~lines 4-23, composition ~lines 93-105)
- Delete: `web/src/components/Reviews.jsx`, `web/src/components/ReviewsBadge.jsx`, `web/src/data/reviews.js`
- Test: `web/e2e/product-lineup.spec.ts` (homepage assertions live here)

**Interfaces:**
- Consumes: nothing from other tasks (static copy inside the component).
- Produces: `<SystemSection />` with `<section id="system">` (the existing FullSite IntersectionObserver auto-tracks `section[id]` for `section_viewed` analytics — no wiring needed).

- [ ] **Step 1: Write the failing e2e test**

Append to `web/e2e/product-lineup.spec.ts` (match existing style):

```ts
test('system section replaces reviews and products precede ritual', async ({ page }) => {
  await page.goto('/');
  const system = page.locator('#system');
  await expect(system).toBeVisible();
  await expect(system).toContainText('Nobody ever gave you');
  await expect(system).toContainText('The SOLUM system · 10 minutes');
  // Reviews section gone (check Reviews.jsx's root class before deleting it; it is .reviews-section unless found otherwise)
  await expect(page.locator('.reviews-section')).toHaveCount(0);
  // Products section appears before the ritual section in DOM order
  const order = await page.evaluate(() => {
    const products = document.querySelector('#products');
    const ritual = document.querySelector('#ritual, [data-track="ritual"], #ritual-in-action, [class*="ritual-section"]');
    if (!products || !ritual) return 'missing';
    return products.compareDocumentPosition(ritual) & Node.DOCUMENT_POSITION_FOLLOWING ? 'products-first' : 'ritual-first';
  });
  expect(order).toBe('products-first');
});
```

Before running: open `web/src/components/Reviews.jsx` and `web/src/components/RitualInAction.jsx` to confirm the root class/id names used above; adjust the selectors in the test to the real ones (the ritual selector list must match RitualInAction's actual section id/class, and the reviews selector its actual root class). Keep the assertions' intent identical.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx playwright test e2e/product-lineup.spec.ts`
Expected: new test FAILS (`#system` not found). Pre-existing tests pass.

- [ ] **Step 3: Create SystemSection.jsx**

Create `web/src/components/SystemSection.jsx` exactly:

```jsx
const CSS = `
.system-section{background:var(--black);padding:80px 0;border-top:1px solid var(--line);}
.system-inner{max-width:1100px;margin:0 auto;padding:0 48px;}
.system-kicker{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.system-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4.5vw,64px);letter-spacing:.05em;color:var(--bone);line-height:1.02;margin:0 0 36px;}
.system-title span{color:var(--blit);}
.system-grid{display:flex;align-items:stretch;gap:16px;}
.system-panel{flex:1;border-radius:10px;padding:24px;}
.system-panel-old{background:var(--char);border:1px dashed rgba(240,236,226,0.28);}
.system-panel-new{background:#12233a;border:1px solid var(--blue);}
.system-panel-label{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-bottom:16px;}
.system-panel-old .system-panel-label{color:var(--stone);}
.system-panel-new .system-panel-label{color:var(--blit);}
.system-scraps{display:flex;flex-direction:column;gap:10px;}
.system-scrap{background:var(--black);border-radius:6px;padding:8px 12px;font-size:14px;color:var(--stone);font-weight:300;width:fit-content;}
.system-scrap:nth-child(1){transform:rotate(-1.5deg);}
.system-scrap:nth-child(2){transform:rotate(1deg);margin-left:10%;}
.system-scrap:nth-child(3){transform:rotate(-1deg);}
.system-scrap:nth-child(4){transform:rotate(1.5deg);margin-left:14%;}
.system-scrap:nth-child(5){transform:rotate(-0.5deg);}
.system-steps{display:flex;flex-direction:column;gap:13px;}
.system-step{display:flex;align-items:center;gap:12px;font-size:15px;color:var(--bone);}
.system-step-num{width:26px;height:26px;border-radius:50%;background:var(--blue);color:var(--bone);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.system-arrow{display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--blit);flex-shrink:0;}
@media(max-width:768px){
  .system-section{padding:60px 0;}
  .system-inner{padding:0 24px;}
  .system-grid{flex-direction:column;}
  .system-arrow{transform:rotate(90deg);padding:2px 0;}
}
`;

const OLD_WAY = [
  'Hot water on the back',
  'Whatever wash was on offer',
  'A quick scrub with your hands',
  'Back never reached',
  'Scalp never once cleaned',
];

const STEPS = [
  'Scalp deep-cleaned · 2 min',
  'Wash that strips nothing',
  'Dead skin off, everywhere',
  'Back fully cleaned · 60 sec',
  'Locked in within 3 minutes',
];

export default function SystemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="system-section" id="system">
        <div className="system-inner">
          <div className="system-kicker reveal">Why nothing changed until now</div>
          <h2 className="system-title reveal">Nobody ever gave you<br /><span>a system for your body.</span></h2>
          <div className="system-grid reveal">
            <div className="system-panel system-panel-old">
              <div className="system-panel-label">Every shower until today</div>
              <div className="system-scraps">
                {OLD_WAY.map((s) => <div key={s} className="system-scrap">{s}</div>)}
              </div>
            </div>
            <div className="system-arrow" aria-hidden="true">→</div>
            <div className="system-panel system-panel-new">
              <div className="system-panel-label">The SOLUM system · 10 minutes</div>
              <div className="system-steps">
                {STEPS.map((s, i) => (
                  <div key={s} className="system-step">
                    <span className="system-step-num">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Rewire FullSite.jsx**

- Remove `import Reviews from '../components/Reviews.jsx';`
- Add `import SystemSection from '../components/SystemSection.jsx';`
- Composition change: replace

```jsx
<Reviews />

<RitualInAction />
<ProductLineup />
```

with

```jsx
<SystemSection />

<ProductLineup />
<RitualInAction />
```

(Preserve whatever wrappers/props currently sit between those lines — only swap the order of the two components and substitute SystemSection for Reviews.)

- [ ] **Step 5: Delete the orphaned review files**

First verify no remaining importers: `grep -rn "components/Reviews\|ReviewsBadge\|data/reviews" web/src --include='*.jsx' --include='*.js'` — the only hits must be inside the three files themselves (plus a possible mention in `web/src/data/abtests.js`: if abtests.js references a reviews A/B test, LEAVE the registry untouched and note it in your report). Then delete:
- `web/src/components/Reviews.jsx`
- `web/src/components/ReviewsBadge.jsx`
- `web/src/data/reviews.js`

If you find a real importer outside these files, STOP and report NEEDS_CONTEXT.

- [ ] **Step 6: Run tests**

Run: `cd web && npx playwright test e2e/product-lineup.spec.ts` → all pass including the new test.
Run: `cd web && npm run test:unit` → 91 pass / 3 known dispatch.test.js failures only.
Run: `cd web && npm run build` → succeeds.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/SystemSection.jsx web/src/pages/FullSite.jsx web/e2e/product-lineup.spec.ts
git rm web/src/components/Reviews.jsx web/src/components/ReviewsBadge.jsx web/src/data/reviews.js
git commit -m "feat(home): system section replaces reviews, products before ritual"
```

---

### Task B: Outcome lines in the three kit product lists

**Files:**
- Modify: `web/src/components/KitComparison.jsx` (row markup ~line 215, CSS ~lines 53-67)
- Modify: `web/src/pages/BuyPage.jsx` (desktop rows ~lines 445-465, mobile rows ~lines 313-326, CSS near `.co-product-worth` ~line 83)
- Test: `web/e2e/buy-flow.spec.ts`

**Interfaces:**
- Consumes: `p.outcome.tileAfter` (string; absent on bowl/coming-soon products — render nothing then).
- Produces: CSS classes `.kit-product-outcome`, `.co-product-outcome`, `.co-mobile-product-outcome`.

- [ ] **Step 1: Write the failing e2e test**

Append to `web/e2e/buy-flow.spec.ts` (match existing style; desktop viewport test):

```ts
test('kit product lists show outcome lines', async ({ page }) => {
  await page.goto('/buy');
  await expect(page.locator('.co-product-outcome', { hasText: 'clean scalp, thicker hair' }).first()).toBeVisible();
});
```

And append to `web/e2e/product-lineup.spec.ts`:

```ts
test('homepage kit card product list shows outcome lines after expanding', async ({ page }) => {
  await page.goto('/');
  await page.locator('.kit-products-toggle').first().click();
  await expect(page.locator('.kit-product-outcome', { hasText: 'clean scalp, thicker hair' }).first()).toBeVisible();
});
```

If `/buy`'s desktop order summary only renders at desktop width, ensure the test uses the default (desktop) viewport; if the toggle selector on the homepage differs, adjust to the real class (`.kit-products-toggle` exists today).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx playwright test e2e/buy-flow.spec.ts e2e/product-lineup.spec.ts`
Expected: the two new tests FAIL (classes not found); all others pass.

- [ ] **Step 3: KitComparison row**

In `web/src/components/KitComparison.jsx`, replace the row's name span:

```jsx
<span>{p.name}{p.comingSoon ? ' *' : ''}</span>
```

with:

```jsx
<span className="kit-product-name-wrap">
  <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
  {p.outcome?.tileAfter && <span className="kit-product-outcome">{p.outcome.tileAfter}</span>}
</span>
```

Add CSS next to the existing `.kit-product` rules:

```css
.kit-product-name-wrap{display:flex;flex-direction:column;gap:2px;min-width:0;}
.kit-product-outcome{font-size:13px;color:var(--stone);font-weight:300;line-height:1.3;}
```

- [ ] **Step 4: BuyPage desktop order-summary row**

In `BuyOrderSummary` (`.co-product` rows), replace:

```jsx
<span>{p.name}{p.comingSoon ? ' *' : ''}</span>
```

with:

```jsx
<span className="co-product-name-wrap">
  <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
  {p.outcome?.tileAfter && <span className="co-product-outcome">{p.outcome.tileAfter}</span>}
</span>
```

- [ ] **Step 5: BuyPage mobile bottom-sheet row**

In the mobile products list (`.co-mobile-product` buttons), replace:

```jsx
<span className="co-mobile-product-name">{p.name}</span>
```

with:

```jsx
<span className="co-mobile-product-name">
  {p.name}
  {p.outcome?.tileAfter && <span className="co-mobile-product-outcome">{p.outcome.tileAfter}</span>}
</span>
```

- [ ] **Step 6: BuyPage CSS**

Add near `.co-product-worth` (line ~83):

```css
.co-product-name-wrap{display:flex;flex-direction:column;gap:2px;min-width:0;}
.co-product-outcome{font-size:13px;color:var(--stone);font-weight:300;line-height:1.3;}
.co-mobile-product-outcome{display:block;font-size:13px;color:var(--stone);font-weight:300;line-height:1.3;margin-top:2px;}
```

Check the `.co-mobile-product` and `.co-product` row styles: if they use `align-items:center`, that remains correct; if the name span had flex sizing (`flex:1` etc.), move that sizing onto the new wrapper so the worth chip stays right-aligned.

- [ ] **Step 7: Run tests**

Run: `cd web && npx playwright test e2e/buy-flow.spec.ts e2e/product-lineup.spec.ts` → all pass.
Run: `cd web && npm run test:unit && npm run build` → 91 pass / 3 known failures; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/KitComparison.jsx web/src/pages/BuyPage.jsx web/e2e/buy-flow.spec.ts web/e2e/product-lineup.spec.ts
git commit -m "feat(kits): outcome line under each product in kit lists (home + buy)"
```

---

### Task C: Verification

- Full: `cd web && npm run test:unit && npx playwright test e2e/product-page.spec.ts e2e/product-lineup.spec.ts e2e/buy-flow.spec.ts`
- Visual sweep (controller): homepage desktop + 375px (system section, order Problem→Kits→System→Products→Ritual), kit card expanded list, /buy desktop right panel + mobile sheet.
- Grep: `grep -rn '—\|–\|--' web/src/components/SystemSection.jsx` → no copy hits.
