# Essentials Rename + Outcome-Driven Product Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the word "tools" from all customer-facing copy (durables become "shower essentials", consumables become "refills") and give every active product an explicit outcome story: outcome headline + meaningful stat pill + Now / With SOLUM before-after block on product pages, with a compact transformation line + stat pill on lineup tiles.

**Architecture:** All outcome content lives as a new `outcome` object per product in `web/src/data/products.js`, guarded by a vitest data test. `ProductPage.jsx` and `ProductLineup.jsx` render it conditionally (products without `outcome` render exactly as today). The rename is a copy sweep across ~11 files with no structural changes.

**Tech Stack:** React (Vite), vitest (`npm run test:unit`), Playwright e2e (`npx playwright test`, auto-starts dev server on :5173).

**Spec:** `docs/superpowers/specs/2026-07-10-essentials-outcome-language-design.md`

## Global Constraints

- Work on the `dev` branch. All paths below are relative to repo root `/Users/harshamahadeva/NewCo/solum`.
- **No em dashes (—), en dashes (–), or double hyphens (--) in any copy string.** Use `·`, periods, commas, or "to" for ranges ("6 to 12 months").
- Minimum font sizes: **13px body, 11px labels** (hard rule from Harsha).
- Never the word "soap" in copy. Never lowercase the SOLUM wordmark. Clay is never called "organic".
- Claims guardrails: never "treats dandruff" or "regrows hair". Allowed: flakes, itch, "thicker hair measured at 24 weeks", "+120% blood flow", "68% clearer skin", "75× milder", "10× absorption". No new claims.
- Colours: SOLUM Black `#08090B`, Charcoal `#181C24` (`var(--char)`), Steel Blue `#2E6DA4` (`var(--blue)`), Sky Blue `#4A8FC7` (`var(--blit)`), Bone `#F0ECE2` (`var(--bone)`). After-panel tint `#12233a`.
- `TermsPage.jsx` is explicitly out of scope: "Physical Tools" is the legal CPSR/returns category and stays.
- Admin pages (`src/admin/**`) keep "consumable" (internal wording, not customer-facing).
- CSS class names containing "tool" (e.g. `.cs-tool-lifespan`) may stay; only rendered copy must change.

---

### Task 1: Outcome data + copy-rule guard test in products.js

**Files:**
- Create: `web/src/data/products.test.js`
- Modify: `web/src/data/products.js`

**Interfaces:**
- Produces: `outcome` object on the 8 active products (nums 01–08), shape:
  `{ headline, headlineAccent, stat, statMeaning, now, after, tileNow, tileAfter, tileStatMeaning }` — all non-empty strings. Products `09`, `10` (comingSoon) and `11` (mixing bowl) have **no** `outcome` key. Tasks 2 and 3 rely on exactly these field names.

- [ ] **Step 1: Write the failing test**

Create `web/src/data/products.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { PRODUCTS } from './products.js';

const OUTCOME_FIELDS = ['headline', 'headlineAccent', 'stat', 'statMeaning', 'now', 'after', 'tileNow', 'tileAfter', 'tileStatMeaning'];

// Active sellable products; the mixing bowl (11) is an accessory and gets no outcome story.
const withOutcome = PRODUCTS.filter((p) => !p.comingSoon && p.num !== '11');
const noOutcome = PRODUCTS.filter((p) => p.comingSoon || p.num === '11');

const copyStrings = (p) => [
  p.name, p.tagline, p.desc, p.tag, p.lifespan,
  ...(p.highlights || []), ...(p.benefits || []),
  ...Object.values(p.outcome || {}),
].filter(Boolean);

describe('product outcome data', () => {
  it('every active product has a complete outcome object', () => {
    expect(withOutcome.length).toBe(8);
    for (const p of withOutcome) {
      expect(p.outcome, `product ${p.num} missing outcome`).toBeTruthy();
      for (const f of OUTCOME_FIELDS) {
        expect(typeof p.outcome[f], `product ${p.num} outcome.${f}`).toBe('string');
        expect(p.outcome[f].length, `product ${p.num} outcome.${f} empty`).toBeGreaterThan(0);
      }
    }
  });

  it('coming-soon products and the mixing bowl have no outcome object', () => {
    for (const p of noOutcome) {
      expect(p.outcome, `product ${p.num} should not have outcome`).toBeUndefined();
    }
  });
});

describe('copy rules', () => {
  it('no em dashes, en dashes, or double hyphens in any copy string', () => {
    for (const p of PRODUCTS) {
      for (const s of copyStrings(p)) {
        expect(s, `product ${p.num}: "${s}"`).not.toMatch(/—|–|--/);
      }
    }
  });

  it('the word "tool" never appears in customer copy', () => {
    for (const p of PRODUCTS) {
      for (const s of copyStrings(p)) {
        expect(s.toLowerCase(), `product ${p.num}: "${s}"`).not.toMatch(/\btools?\b/);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm run test:unit -- products`
Expected: FAIL. "missing outcome" for products 01–08, dash violations (en dashes in existing strings like "2–3 months", "43–52%", "4–5 weeks", "9–10"), and "tool" hits (benefit on product 03, tag on product 11).

- [ ] **Step 3: Add outcome objects and clean existing strings in products.js**

3a. Add an `outcome` key to each of the 8 active products (place it directly after `desc`). Exact content:

Product 01 (Body Wash):
```js
outcome: {
  headline: 'Clean everywhere. Stripped nowhere.',
  headlineAccent: 'Gentle enough for every area.',
  stat: '75×',
  statMeaning: 'milder than SLS, the detergent in standard body wash',
  now: 'Tight, itchy skin after every shower. Standard wash strips the barrier and it takes 17 hours to recover.',
  after: 'Properly clean everywhere, barrier intact. No tightness, no irritation. Cedarwood + vetiver.',
  tileNow: 'Tight, stripped skin',
  tileAfter: 'clean everywhere, zero irritation',
  tileStatMeaning: 'milder than SLS',
},
```

Product 02 (Italy Towel Mitt):
```js
outcome: {
  headline: 'Smoother skin. Less odour.',
  headlineAccent: 'From the first use.',
  stat: '1 use',
  statMeaning: 'weeks of dead skin visibly rolls off in one session',
  now: 'Rough, bumpy, dull skin. Dead cells never shed on their own and odour bacteria feed on them.',
  after: 'Visibly smoother skin and less body odour from the first session. Lotion finally absorbs properly.',
  tileNow: 'Rough, bumpy skin',
  tileAfter: 'visibly smoother, first use',
  tileStatMeaning: 'weeks of dead skin gone',
},
```

Product 03 (Back Scrub Cloth):
```js
outcome: {
  headline: 'Your whole back. Actually clean.',
  headlineAccent: '60 seconds a day.',
  stat: '60 sec',
  statMeaning: 'to clean the zone with the most oil glands on your body',
  now: 'A back you have never properly reached. Oil, bacteria and breakouts build there daily.',
  after: 'Every inch of your back cleaned daily. Silver ions keep the cloth itself clean between uses.',
  tileNow: 'A back never reached',
  tileAfter: 'fully clean in 60 seconds',
  tileStatMeaning: 'to a fully clean back',
},
```

Product 04 (Scalp Massager):
```js
outcome: {
  headline: 'Thicker hair. Cleaner scalp.',
  headlineAccent: 'Two minutes a day.',
  stat: '+120%',
  statMeaning: 'scalp blood flow per session · thicker hair measured at 24 weeks',
  now: 'Itchy, flaky scalp. Buildup shampoo only moves around. Never once properly cleaned.',
  after: 'A genuinely clean scalp. No itch, no flakes, no scalp odour. Thicker hair you can measure.',
  tileNow: 'Itchy, flaky scalp',
  tileAfter: 'clean scalp, thicker hair',
  tileStatMeaning: 'blood flow per session',
},
```

Product 05 (Atlas Clay Mask):
```js
outcome: {
  headline: 'Clearer skin. Emptied pores.',
  headlineAccent: 'Once a week.',
  stat: '68%',
  statMeaning: 'improvement in skin clarity from a single application',
  now: 'Clogged pores, dull skin, breakouts that keep coming back. Washing only cleans the surface.',
  after: 'Pores emptied of what causes spots and odour. Visibly clearer, firmer skin.',
  tileNow: 'Clogged pores, dull skin',
  tileAfter: 'visibly clearer skin',
  tileStatMeaning: 'clearer skin, one use',
},
```

Product 06 (Argan Body Oil):
```js
outcome: {
  headline: 'Skin properly fed.',
  headlineAccent: 'Not just moisturised.',
  stat: '1 ingredient',
  statMeaning: 'cold pressed organic argan, nothing added',
  now: 'Dry, rough skin that lotion alone never quite fixes. The barrier stays broken.',
  after: 'The barrier rebuilt with the fatty acid your body cannot make. Absorbs fully, zero residue.',
  tileNow: 'Dry skin lotion can\'t fix',
  tileAfter: 'barrier rebuilt, properly fed',
  tileStatMeaning: 'nothing added',
},
```

Product 07 (Body Lotion):
```js
outcome: {
  headline: 'Hydrated all day.',
  headlineAccent: 'From a 3 minute habit.',
  stat: '10×',
  statMeaning: 'absorption when applied within 3 minutes of towelling',
  now: 'Skin tight and dry by lunchtime. The shower takes more than it gives back.',
  after: 'Comfortable skin all day, barrier restored. And you smell amazing for hours · cedarwood + vetiver that lingers on skin.',
  tileNow: 'Tight and dry by lunch',
  tileAfter: 'hydrated all day, smells amazing',
  tileStatMeaning: 'absorption post shower',
},
```

Product 08 (Intimate Cleansing Cloth):
```js
outcome: {
  headline: 'No odour worry.',
  headlineAccent: 'All day, every day.',
  stat: '1 job',
  statMeaning: 'a dedicated cloth built only for this. Hands spread bacteria, this removes it.',
  now: 'Hands for intimate cleansing. They spread bacteria as much as they remove it. The worry follows you all day.',
  after: 'Confident and clean, all day. Bamboo kun keeps the cloth itself clean between uses.',
  tileNow: 'Odour worry all day',
  tileAfter: 'confident all day',
  tileStatMeaning: 'done properly',
},
```

3b. Rename strings in `products.js`:
- Product 03 benefit: `'The only tool that reaches the back properly · 90cm, handles at both ends'` → `'The only essential that reaches your whole back · 90cm, handles at both ends'`
- Product 11 tag: `'Weekly · Tool'` → `'Weekly · Essential'`

3c. Replace every en dash in `products.js` copy strings with "to" ranges (the test enforces this). Exact edits:
- Product 01 desc: `forces skin pH to 9–10` → `forces skin pH to 9 to 10`
- Product 03 lifespan: `'2–3 months · rinse after use, wash weekly'` → `'2 to 3 months · rinse after use, wash weekly'`
- Product 03 benefit: `'Lasts 2–3 months · rinse after use · wash weekly'` → `'Lasts 2 to 3 months · rinse after use · wash weekly'`
- Product 03 desc: `Lasts 2–3 months.` → `Lasts 2 to 3 months.`
- Product 06 benefit: `'43–52% oleic acid · the same fatty acid your skin produces naturally'` → `'43 to 52% oleic acid · the same fatty acid your skin produces naturally'`
- Product 06 desc: `43–52% oleic acid` → `43 to 52% oleic acid`
- Product 07 lifespan: `'4–5 weeks · spreads well, less than you think'` → `'4 to 5 weeks · spreads well, less than you think'`
- Product 07 benefit: `'Spreads well · two pumps is enough · 200ml lasts 4–5 weeks · no residue'` → `'Spreads well · two pumps is enough · 200ml lasts 4 to 5 weeks · no residue'`
- Product 07 desc: `200ml lasts 4–5 weeks.` → `200ml lasts 4 to 5 weeks.`
- Check for any remaining with `grep -n '–\|—\|--' web/src/data/products.js` (comments excluded from the test but clean strings only).

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm run test:unit -- products`
Expected: PASS (4 tests). Also run the full unit suite to check nothing else broke: `npm run test:unit` → all pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/data/products.js web/src/data/products.test.js
git commit -m "feat(products): outcome story data per product + copy-rule guard tests"
```

---

### Task 2: Product page outcome block

**Files:**
- Modify: `web/src/pages/ProductPage.jsx` (CSS string ~line 12–70; JSX after `.pp-hero` closes ~line 162)
- Test: `web/e2e/product-page.spec.ts`

**Interfaces:**
- Consumes: `p.outcome` (Task 1 shape), `p.media.gallery[0]`.
- Produces: CSS classes `.pp-outcome`, `.pp-statpill`, `.pp-ba-now`, `.pp-ba-after` (Task 5 verification greps for these).

- [ ] **Step 1: Write the failing e2e test**

Append to `web/e2e/product-page.spec.ts` (match the file's existing import/describe style):

```ts
test('outcome block renders on the scalp massager page', async ({ page }) => {
  await page.goto('/product/04-scalp-massager');
  const block = page.locator('.pp-outcome');
  await expect(block).toBeVisible();
  await expect(block.locator('.pp-statpill')).toContainText('+120%');
  await expect(block.locator('.pp-ba-now')).toContainText('Itchy, flaky scalp');
  await expect(block.locator('.pp-ba-after')).toContainText('With SOLUM');
});

test('outcome block absent on a product without outcome data', async ({ page }) => {
  await page.goto('/product/11-clay-mixing-bowl');
  await expect(page.locator('.pp-outcome')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx playwright test e2e/product-page.spec.ts`
Expected: the two new tests FAIL (`.pp-outcome` not found / not visible). Pre-existing tests in the file should pass; if any fail before your change, note it and judge against `main` behaviour rather than fixing unrelated tests.

- [ ] **Step 3: Implement the block**

3a. Append to the `CSS` template string in `ProductPage.jsx` (before the closing backtick):

```css
/* ── Outcome story ─────────────────────────────── */
.pp-outcome{max-width:1000px;margin:0 auto;padding:48px 24px 8px;}
.pp-outcome-head{margin-bottom:24px;}
.pp-outcome-headline{font-family:'Barlow Condensed',sans-serif;font-size:clamp(26px,3.4vw,38px);font-weight:700;letter-spacing:.04em;line-height:1.12;color:var(--bone);margin:0 0 12px;text-transform:uppercase;}
.pp-outcome-headline span{color:var(--blit);}
.pp-statpill{display:inline-flex;align-items:center;gap:10px;background:var(--char);border:1px solid var(--blue);border-radius:999px;padding:7px 16px;max-width:100%;}
.pp-statpill strong{font-size:20px;font-weight:700;color:var(--blit);white-space:nowrap;}
.pp-statpill span{font-size:13px;color:var(--stone);line-height:1.35;}
.pp-outcome-grid{display:grid;grid-template-columns:1fr;gap:0;}
.pp-outcome-photo img{width:100%;height:100%;object-fit:cover;display:block;border:1px solid var(--line);}
.pp-ba{padding:18px;}
.pp-ba-label{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-bottom:7px;}
.pp-ba p{font-size:15px;line-height:1.5;margin:0;}
.pp-ba-now{background:var(--char);border:1px solid var(--line);border-radius:8px 8px 0 0;}
.pp-ba-now .pp-ba-label{color:var(--stone);}
.pp-ba-now p{color:var(--mist);font-weight:300;}
.pp-ba-after{background:#12233a;border:1px solid var(--blue);border-radius:0 0 8px 8px;}
.pp-ba-after .pp-ba-label{color:var(--blit);}
.pp-ba-after p{color:var(--bone);font-weight:400;}
@keyframes ppPulse{0%,100%{box-shadow:0 0 0 0 rgba(74,143,199,.5);}50%{box-shadow:0 0 0 8px rgba(74,143,199,0);}}
.pp-ba-arrow{width:32px;height:32px;border-radius:50%;background:var(--blue);color:var(--bone);display:flex;align-items:center;justify-content:center;font-size:15px;border:3px solid var(--black);animation:ppPulse 2s infinite;position:relative;z-index:2;margin:-16px auto;transform:rotate(90deg);}
.pp-outcome-photo{display:none;}
@media(min-width:769px){
  .pp-outcome-grid{grid-template-columns:2fr 3fr;gap:20px;align-items:stretch;}
  .pp-outcome-photo{display:block;min-height:280px;}
  .pp-outcome-photo img{height:100%;}
}
```

Note: `--stone` and `--mist` are existing global vars used elsewhere in this file. Mobile hides the block photo (the hero media directly above already gives the visual); desktop shows it at 40% width per the approved mockup.

3b. Insert the JSX in `ProductPage.jsx` immediately after the closing `</div>` of `.pp-hero` (currently line 162) and before the first `.pp-body`:

```jsx
{p.outcome && (
  <section className="pp-outcome">
    <div className="pp-outcome-head">
      <h2 className="pp-outcome-headline">
        {p.outcome.headline}<br /><span>{p.outcome.headlineAccent}</span>
      </h2>
      <div className="pp-statpill">
        <strong>{p.outcome.stat}</strong>
        <span>{p.outcome.statMeaning}</span>
      </div>
    </div>
    <div className="pp-outcome-grid">
      {p.media?.gallery?.[0] && (
        <div className="pp-outcome-photo">
          <img src={p.media.gallery[0]} alt={`${p.name} in use`} loading="lazy" width="600" height="800" />
        </div>
      )}
      <div className="pp-outcome-panels">
        <div className="pp-ba pp-ba-now">
          <div className="pp-ba-label">Now</div>
          <p>{p.outcome.now}</p>
        </div>
        <div className="pp-ba-arrow" aria-hidden="true">→</div>
        <div className="pp-ba pp-ba-after">
          <div className="pp-ba-label">With SOLUM</div>
          <p>{p.outcome.after}</p>
        </div>
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx playwright test e2e/product-page.spec.ts`
Expected: PASS including the two new tests.

- [ ] **Step 5: Visual check (desktop + mobile)**

Start dev server if not already running (`cd web && npm run dev`, port 5173 — ask Harsha first whether he wants test stock inserted, per standing rule). Check `http://localhost:5173/product/04-scalp-massager` at desktop width and 375px: headline with Sky Blue accent line, stat pill, photo left on desktop only, Now panel dim, With SOLUM panel lit, pulsing arrow between. Confirm no text below 13px body / 11px labels.

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/ProductPage.jsx web/e2e/product-page.spec.ts
git commit -m "feat(product-page): outcome headline, stat pill and Now/With SOLUM block"
```

---

### Task 3: Lineup tile transformation line + stat pill

**Files:**
- Modify: `web/src/components/ProductLineup.jsx` (CSS ~line 42; `infoEl` ~lines 139–148)
- Test: `web/e2e/product-lineup.spec.ts`

**Interfaces:**
- Consumes: `p.outcome.tileNow`, `p.outcome.tileAfter`, `p.outcome.stat`, `p.outcome.tileStatMeaning` (Task 1). Falls back to `p.tagline` when `outcome` is absent.
- Produces: CSS classes `.prod-transform`, `.prod-statpill` (Task 5 greps for these).

- [ ] **Step 1: Write the failing e2e test**

Append to `web/e2e/product-lineup.spec.ts` (match existing style):

```ts
test('tiles show transformation line and stat pill', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('.product-card', { hasText: 'Scalp Massager' });
  await expect(tile.locator('.prod-transform')).toContainText('Itchy, flaky scalp');
  await expect(tile.locator('.prod-transform')).toContainText('clean scalp, thicker hair');
  await expect(tile.locator('.prod-statpill')).toContainText('+120%');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx playwright test e2e/product-lineup.spec.ts`
Expected: new test FAILS (`.prod-transform` not found).

- [ ] **Step 3: Implement the tile treatment**

3a. In the `CSS` string of `ProductLineup.jsx`, replace the line

```css
.prod-tagline{font-size:13px;font-weight:600;color:var(--bone);line-height:1.4;margin-top:8px;}
```

with:

```css
.prod-tagline{font-size:13px;font-weight:600;color:var(--bone);line-height:1.4;margin-top:8px;}
.prod-transform{font-size:13px;line-height:1.45;margin-top:8px;}
.prod-transform .pt-now{color:var(--stone);font-weight:300;}
.prod-transform .pt-arrow{color:var(--blit);margin:0 5px;}
.prod-transform .pt-after{color:var(--bone);font-weight:600;}
.prod-statpill{display:inline-flex;align-items:center;gap:7px;background:var(--char);border:1px solid var(--blue);border-radius:999px;padding:3px 10px;margin-top:7px;align-self:flex-start;max-width:100%;}
.prod-statpill strong{font-size:14px;font-weight:700;color:var(--blit);white-space:nowrap;}
.prod-statpill span{font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:var(--stone);font-weight:600;line-height:1.3;}
```

3b. In `infoEl`, replace

```jsx
<div className="prod-tagline">{p.tagline}</div>
```

with:

```jsx
{p.outcome ? (
  <>
    <div className="prod-transform">
      <span className="pt-now">{p.outcome.tileNow}</span>
      <span className="pt-arrow" aria-hidden="true">→</span>
      <span className="pt-after">{p.outcome.tileAfter}</span>
    </div>
    <div className="prod-statpill">
      <strong>{p.outcome.stat}</strong>
      <span>{p.outcome.tileStatMeaning}</span>
    </div>
  </>
) : (
  <div className="prod-tagline">{p.tagline}</div>
)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx playwright test e2e/product-lineup.spec.ts`
Expected: PASS including the new test.

- [ ] **Step 5: Visual check**

On `http://localhost:5173/#products` at desktop and 375px (2-column grid): transformation line wraps to two lines cleanly, stat pill doesn't overflow the tile, mixing bowl tile still shows its tagline, "Worth £X" line and "View Product →" unaffected.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ProductLineup.jsx web/e2e/product-lineup.spec.ts
git commit -m "feat(lineup): transformation line + stat pill on product tiles"
```

---

### Task 4: Rename sweep · tools → shower essentials, consumables → refills

**Files (all Modify):**
- `web/src/components/KitComparison.jsx`
- `web/src/components/UnboxingFilm.jsx`
- `web/src/components/SubscriptionSection.jsx`
- `web/src/pages/CheckoutPage.jsx`
- `web/src/pages/checkout/OrderSummary.jsx`
- `web/src/pages/SuccessPage.jsx`
- `web/src/pages/AccountPage.jsx`
- `web/src/pages/EmailPreviewPage.jsx`
- `web/src/pages/ComingSoon.jsx`
- `web/src/data/guide.js`

**Interfaces:** none (copy-only). Do NOT touch `TermsPage.jsx` or `src/admin/**`.

- [ ] **Step 1: Apply exact string replacements**

Each edit below is old → new. Lines we touch also get their em/en dashes cleaned (rule applies to edited copy).

`KitComparison.jsx` (~line 183):
- `Complete {products.filter(p => !p.comingSoon).length}-piece system · tools last 6–12 months` → `Complete {products.filter(p => !p.comingSoon).length}-piece system · your shower essentials last 6 to 12 months`

`UnboxingFilm.jsx`:
- alt (~111): `SOLUM kit products laid out showing the daily ritual tools` → `SOLUM kit products laid out showing the daily ritual essentials`
- caption (~118): `Every kit ships as one system. Wash, tools, and lotion together. Nothing to figure out, nothing missing.` → `Every kit ships as one system. Your refills and your shower essentials, together. Nothing to figure out, nothing missing.`

`SubscriptionSection.jsx`:
- alt (~198): same alt replacement as UnboxingFilm.
- caption (~212): `Every kit ships as one system — wash, tools, and lotion together. Nothing to figure out, nothing missing.` → `Every kit ships as one system. Your refills and your shower essentials, together. Nothing to figure out, nothing missing.`

`CheckoutPage.jsx` (~556):
- `Your consumables arrive before you run out — tools replaced when due` → `Your refills arrive before you run out · essentials replaced when due`

`checkout/OrderSummary.jsx` (~66):
- `Refills arrive before you run out — tools replaced when due` → `Refills arrive before you run out · essentials replaced when due`

`SuccessPage.jsx`:
- (~161): `Your full {kitName} kit — tools and consumables — packed and dispatched.` → `Your full {kitName} kit, shower essentials and refills, packed and dispatched.`
- (~177): `Consumables replenish automatically every 30 days. Your first box lasts 4–6 weeks — you won't run out before the first refill arrives.` → `Refills arrive automatically every 30 days. Your first box lasts 4 to 6 weeks, you won't run out before the first one arrives.`

`AccountPage.jsx` (~322):
- `This is a quarterly refresh box — tools and weekly ritual products ship alongside your monthly essentials.` → `This is a quarterly refresh box. Your shower essentials and weekly ritual products ship alongside your monthly refills.`

`EmailPreviewPage.jsx` (~74):
- `Your full ${kitName} Kit, tools and consumables.` → `Your full ${kitName} Kit, shower essentials and refills.`

`ComingSoon.jsx` (copy only, CSS class names like `.cs-tool-lifespan` stay):
- pill (~1557): `Tool care` → `Essentials care`
- gate label (~1634): `Step by step guide · Video walkthroughs · Tool care` → `Step by step guide · Video walkthroughs · Essentials care`
- gate title (~1635): `Every step. Every tool. Every detail.` → `Every step. Every essential. Every detail.`
- provenance (~1670): `The rougher resistance that does what softer tools can't.` → `The rougher resistance that does what softer essentials can't.`
- sub body (~1681): `The tools last months. The consumables run out. Your monthly` → `Your shower essentials last months. The wash, lotion, clay and oil run out. Your monthly` (rest of sentence unchanged)
- first box (~1690): `All 9 products arrive together. Tools and consumables. Everything you need to run both rituals from the moment the box opens.` → `All 9 products arrive together. Shower essentials and refills. Everything you need to run both rituals from the moment the box opens.`
- refill (~1695): `Consumables replenished automatically before you run out. Body wash, lotion, clay, oil. The tools stay in your bathroom. They last 6–12 months.` → `Refills arrive automatically before you run out. Body wash, lotion, clay, oil. Your shower essentials stay in your bathroom. They last 6 to 12 months.`

`guide.js`:
- (~14): `The problem isn't effort — it's the tools and the order.` → `The problem isn't effort. It's the essentials and the order.`
- (~31): `This is the only tool that properly reaches every zone of your back.` → `This is the only essential that properly reaches every zone of your back.`
- (~66 metaDescription): `the right tools, the right technique` → `the right essentials, the right technique`
- (~70): `Most men have either never exfoliated properly or use the wrong tool.` → `Most men have either never exfoliated properly or scrub with the wrong thing.`
- (~75): `the best exfoliation tool isn't a scrub at all — it's a cloth.` → `the best exfoliator isn't a scrub at all. It's a cloth.`
- (~80 h2): `The Two Tools You Need` → `The Two Essentials You Need`
- (~84): `These are two separate tools for a reason.` → `These are two separate essentials for a reason.`
- (~92): `use both tools after the rhassoul clay mask` → `use both essentials after the rhassoul clay mask`
- (~106): `The only tools that cover the whole body properly.` → `The only essentials that cover the whole body properly.`
- (~203): `Scrubbing with their hands instead of a tool.` → `Scrubbing with their hands instead of the right essential.`
- (~209): `Tools that last, consumables that replenish monthly.` → `Shower essentials that last, refills that arrive monthly.`
- (~223): `it's the simplest tool in the system` → `it's the simplest essential in the system`
- (~251): `the supplier that produces silicone scalp tools for the Korean market` → `the supplier that produces silicone scalp massagers for the Korean market`
- (~287): `the exfoliating tools remove it` → `the exfoliating essentials remove it`

- [ ] **Step 2: Verify with grep**

Run:
```bash
cd web && grep -rniE '\btools?\b' src --include='*.jsx' --include='*.js' | grep -viE 'toolbar|tooltip' | grep -vE 'TermsPage|src/admin|cs-tool-lifespan|cs-ritual-col-tools|\.test\.'
```
Expected: no output (zero remaining customer-facing "tool"/"tools" copy).

Run:
```bash
grep -rn -i 'consumable' src --include='*.jsx' --include='*.js' | grep -v 'TermsPage\|src/admin'
```
Expected: no output.

- [ ] **Step 3: Run unit tests and build**

Run: `cd web && npm run test:unit && npm run build`
Expected: all unit tests pass; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(copy): tools become shower essentials, consumables become refills, site-wide"
```

---

### Task 5: Full verification pass

**Files:** none created; verification only.

- [ ] **Step 1: Full test suite**

Run: `cd web && npm run test:unit && npx playwright test e2e/product-page.spec.ts e2e/product-lineup.spec.ts e2e/buy-flow.spec.ts`
Expected: unit tests pass; the two product specs pass. If `buy-flow` fails, check whether it fails on `main` too (there are known pre-existing e2e flakes) before attributing it to this work.

- [ ] **Step 2: Dash regression grep on touched files**

Run:
```bash
cd web && grep -n '—\|–\|--' src/data/products.js src/components/KitComparison.jsx src/components/UnboxingFilm.jsx src/components/SubscriptionSection.jsx src/pages/checkout/OrderSummary.jsx | grep -v '^\s*//' | grep -v 'border\|margin\|padding\|font\|/\*'
```
Expected: no copy-string hits (CSS/comment hits are acceptable; judge each line).

- [ ] **Step 3: Manual visual sweep (use the superpowers:verification-before-completion mindset)**

With the dev server running, check at desktop and 375px:
1. `/` product lineup: all 9 tiles, transformation lines + pills on the 8, tagline on the bowl
2. `/product/04-scalp-massager` and `/product/01-body-wash`: outcome block
3. `/buy`: kit comparison "shower essentials last 6 to 12 months"
4. `/checkout` microcopy (add a kit first), success-page copy if reachable, `/account` quarterly copy
5. `/guide` articles: essentials language reads naturally

- [ ] **Step 4: Report**

Summarise results to Harsha with screenshots or exact copy readouts. Do not merge to master; Harsha signs off first (standing rule).

---

## Out of scope (recorded decisions)

- Homepage "Nobody ever gave you a system" section: **chaos vs system** direction chosen, separate spec/plan next.
- Full dash cleanup of `guide.js` prose beyond lines edited here.
- `TermsPage.jsx` and admin pages keep current wording.
