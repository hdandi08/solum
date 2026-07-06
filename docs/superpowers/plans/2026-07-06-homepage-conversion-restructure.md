# Homepage Conversion Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the visitor instantly recognise their own problem (concrete-symptom hero + a Problem section), add customer social proof + buy-moment friction reduction, unify to one outcome-led CTA, reorder the homepage to Problem → Solution → Proof → Offer, and recalibrate the QualifiedVisit ad signal so none of this breaks Meta/TikTok optimisation. Mobile-first: every change is designed and verified at ~390px first, then desktop.

**Architecture:** In-place restructure of the existing single homepage (`web/src/pages/FullSite.jsx`), reusing existing components and the existing pages (`/ritual`, `/product/:slug`) as "secondary pages". Two new presentational components (`Reviews`, `FrictionStrip`) driven by a new data file. QualifiedVisit gains an intent-anchored `offer_reached` trigger (added first, before any structural change) and later retires the `scroll_dwell` trigger.

**Tech Stack:** React 19, Vite, react-router-dom, Vitest (unit, `npm run test:unit`), Playwright (e2e). Styling = per-component `const CSS = \`…\`` string injected via `<style>{CSS}</style>`, using the locked CSS-variable palette.

## Global Constraints

- Work on the `dev` branch (already checked out). Do not merge to `master` without sign-off.
- Copy rules: never use the word "soap"; never use em-dashes, en-dashes, or double-dashes in copy (use commas/periods); always number products 01–08.
- Colour palette (CSS vars already defined globally): `--black #08090B`, `--char/--mid` UI surfaces, `--blue #2E6DA4`, `--blit`/`--sky #4A8FC7`, `--bone #F0ECE2`, `--mist`/`--stone` muted type, `--line`/`--lineb` borders. Never orange, amber, yellow, or green. Review stars use Sky Blue (`--blit`), NOT gold.
- Fonts: Bebas Neue (wordmark/headings, uppercase, letterspacing ~0.06–0.15em), Barlow Condensed (subheads 700, labels 600, body 300, micro 500).
- Minimum font sizes: 13px body, 11px labels. Nothing smaller.
- **Mobile-first, fix both breakpoints.** Design and verify every change at mobile (~390px) FIRST, then desktop. Both must be correct. GOTCHA: `Hero.jsx` currently hides `.hero-subline` on mobile (`@media(max-width:959px){...display:none}`) so hero body copy does NOT show on mobile today — any problem/symptom messaging must be made visible on mobile, not left hidden.
- Logo: only ever embed `/solum-wordmark-clean.svg` via `<img>` — never recreate as text/CSS. (No logo work in this plan, but do not violate it.)
- Testimonials are placeholder personas written under founder consent; they must be replaced with genuine, on-file testimonials before public launch. No medical/drug claims (scalp copy stays experiential).

---

## Phase 1 — Trust + Offer + QualifiedVisit safety net

Goal: ship social proof, friction reduction, and one dominant CTA, and make the QV signal safe **before** any reordering. Each task is independently shippable.

---

### Task 1: Add the `offer_reached` QualifiedVisit trigger (pure logic + tests)

**Files:**
- Modify: `web/src/lib/qualifiedVisit.js`
- Test: `web/src/lib/qualifiedVisit.test.js`

**Interfaces:**
- Produces: `evaluateQualified({ ..., offerReached })` returns `'offer_reached'` when `offerReached` is true and no stronger signal fired.

- [ ] **Step 1: Write the failing tests** — append to `web/src/lib/qualifiedVisit.test.js`:

```js
describe('offer_reached', () => {
  it('fires offer_reached when the offer/kits section is reached', () => {
    expect(evaluateQualified({ ...base, offerReached: true })).toBe('offer_reached');
  });
  it('does not fire offer_reached when the offer was not reached', () => {
    expect(evaluateQualified({ ...base, offerReached: false })).toBe(null);
  });
  it('product_detail beats offer_reached when both set', () => {
    expect(evaluateQualified({ ...base, productDetailViewed: true, offerReached: true })).toBe('product_detail');
  });
  it('ritual_50 beats offer_reached when both set', () => {
    expect(evaluateQualified({ ...base, ritualVideoPct: 55, offerReached: true })).toBe('ritual_50');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm run test:unit -- qualifiedVisit`
Expected: FAIL — the `offer_reached` cases return `null` (param not yet handled).

- [ ] **Step 3: Implement** — replace the body of `web/src/lib/qualifiedVisit.js` with:

```js
// Decides whether a visitor is "qualified" (a convertible browser) and why.
// Strong signals fire immediately; otherwise require sustained engagement.
export function evaluateQualified({ productDetailViewed = false, offerReached = false, ritualVideoPct = 0, unboxingVideoPct = 0, scrollPct = 0, dwellMs = 0, ritualVideosEngaged = 0 } = {}) {
  if (productDetailViewed) return 'product_detail';
  if (ritualVideoPct >= 50) return 'ritual_50';
  if (unboxingVideoPct >= 50) return 'unboxing_50';
  if (ritualVideosEngaged >= 3) return 'ritual_multi';
  if (offerReached) return 'offer_reached';                 // reached the kits/offer — genuine consideration
  if (scrollPct >= 50 && dwellMs >= 60000) return 'scroll_dwell';
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm run test:unit -- qualifiedVisit`
Expected: PASS — all existing + 4 new cases green.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/qualifiedVisit.js web/src/lib/qualifiedVisit.test.js
git commit -m "feat(qv): add intent-anchored offer_reached qualified-visit trigger"
```

---

### Task 2: Wire `markOfferReached()` into the tracker and the kits section

**Files:**
- Modify: `web/src/lib/qualifiedVisitTracker.js`
- Modify: `web/src/components/KitComparison.jsx`

**Interfaces:**
- Consumes: `evaluateQualified` (Task 1) now honours `offerReached`.
- Produces: `export function markOfferReached()` — sets `state.offerReached = true` and re-evaluates. Fires `QualifiedVisit` (reason `offer_reached`) once per session.

- [ ] **Step 1: Add offer state + marker to the tracker.** In `web/src/lib/qualifiedVisitTracker.js`:

Change the `state` initialiser (line ~5) to include `offerReached: false`:

```js
const state = { productDetailViewed: false, offerReached: false, ritualVideoPct: 0, unboxingVideoPct: 0, scrollPct: 0, ritualSlugs: new Set(), startTs: Date.now() };
```

Add this exported marker next to the other `mark*` exports (after `markRitualEngaged`):

```js
export function markOfferReached() { state.offerReached = true; evaluate(); }
```

(No change needed to `evaluate()` — it already spreads `state` into `evaluateQualified`, so `offerReached` is passed automatically.)

- [ ] **Step 2: Fire the marker when the kits section is seen.** In `web/src/components/KitComparison.jsx`:

Add to the imports at the top:

```js
import { useEffect } from 'react';
import { markOfferReached } from '../lib/qualifiedVisitTracker.js';
```

(Merge `useEffect` into the existing `import { useState, useRef } from 'react';` line so it reads `import { useState, useRef, useEffect } from 'react';`.)

Inside `export default function KitComparison()`, after the `toggle` definition, add:

```js
  // Reaching the offer is an intent-anchored QualifiedVisit signal.
  useEffect(() => {
    const el = document.getElementById('kits');
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { markOfferReached(); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
```

- [ ] **Step 3: Verify the build + unit suite still pass**

Run: `cd web && npm run test:unit`
Expected: PASS (no regressions).

- [ ] **Step 4: Manual check.** Run `cd web && npm run dev`, open `http://localhost:5173`, open devtools console, scroll to the kits section. Confirm a single `QualifiedVisit` capture with `reason: 'offer_reached'` fires (and only once per session).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/qualifiedVisitTracker.js web/src/components/KitComparison.jsx
git commit -m "feat(qv): fire offer_reached when the kits section enters view"
```

---

### Task 3: Reviews data file (6 personas, headshot-ready)

**Files:**
- Create: `web/src/data/reviews.js`
- Create (empty dir marker): `web/public/reviews/.gitkeep`

**Interfaces:**
- Produces: `export const REVIEWS` — array of `{ id, rating, headline, body, name, descriptor, photo }`. `photo` is `null` until real headshots are added to `web/public/reviews/`.

- [ ] **Step 1: Create `web/src/data/reviews.js`:**

```js
// Customer social proof for the homepage + /buy.
// `photo` is null until real headshots land in web/public/reviews/ (then set e.g. '/reviews/marcus.jpg').
// PLACEHOLDER personas written under founder consent — replace with genuine, on-file
// testimonials before public launch (ASA/CAP: testimonials must be truthful and verifiable).
export const REVIEWS = [
  {
    id: 'gym-odour',
    rating: 5,
    headline: '"My gym kit doesn\'t beat me anymore."',
    body: 'I train five mornings a week and used to catch myself by lunch, no matter how hard I scrubbed. Two weeks in, gone. Turns out I was never getting clean, just wet.',
    name: 'Marcus',
    descriptor: '29 · trains 5x a week',
    photo: null,
  },
  {
    id: 'bacne',
    rating: 5,
    headline: '"The spots on my back cleared up."',
    body: 'Breakouts across my shoulders for years, and I assumed it was just me. The back cloth reaches everywhere my hands never could. Three weeks and it is the clearest it has been since school.',
    name: 'Tom',
    descriptor: '31 · plays 5-a-side',
    photo: null,
  },
  {
    id: 'scalp',
    rating: 5,
    headline: '"No more flakes, no more itch."',
    body: 'Had an itchy scalp and flakes on my collar I had just learned to live with. The massager sorted both inside a week, and my hair feels fuller at the root than it has in years.',
    name: 'Adewale',
    descriptor: '34 · hard-water flat',
    photo: null,
  },
  {
    id: 'clay-oil',
    rating: 5,
    headline: '"My skin actually feels fed now."',
    body: 'The weekly clay and argan oil are the bit I did not expect to love. First mask, the amount that came off was grim. After, skin feels soft instead of tight, and my rough elbows and shins are gone.',
    name: 'Ash',
    descriptor: '33 · cyclist',
    photo: null,
  },
  {
    id: 'scent',
    rating: 5,
    headline: '"Subtle, and it lasts all day."',
    body: 'Did not think I would care how it smells, but the cedar and vetiver is spot on. Clean and understated, not a body spray. Still there in the evening, and my partner keeps commenting on it.',
    name: 'Nathan',
    descriptor: '30 · works in the city',
    photo: null,
  },
  {
    id: 'irresistible',
    rating: 5,
    headline: '"Couldn\'t go back to just body wash if I tried."',
    body: 'Cleaner than I have ever felt, and it is ten minutes I look forward to. I have stopped thinking of it as products and started thinking of it as a standard. Can not imagine showering the old way again.',
    name: 'Liam',
    descriptor: '27 · personal trainer',
    photo: null,
  },
];
```

- [ ] **Step 2: Create the headshot folder marker**

```bash
mkdir -p web/public/reviews && touch web/public/reviews/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add web/src/data/reviews.js web/public/reviews/.gitkeep
git commit -m "feat(reviews): add 6-persona social-proof data (headshot-ready)"
```

---

### Task 4: Reviews component (grid + monogram-avatar fallback)

**Files:**
- Create: `web/src/components/Reviews.jsx`

**Interfaces:**
- Consumes: `REVIEWS` (Task 3).
- Produces: `export default function Reviews()` — renders `<section id="reviews" data-track="reviews">`. No props.

- [ ] **Step 1: Create `web/src/components/Reviews.jsx`:**

```jsx
import { REVIEWS } from '../data/reviews.js';

const CSS = `
.reviews-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.reviews-inner{max-width:1200px;margin:0 auto;}
.reviews-header{text-align:center;margin-bottom:56px;}
.reviews-stars-lead{color:var(--blit);font-size:22px;letter-spacing:4px;margin-bottom:16px;}
.reviews-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,3.6vw,56px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.reviews-header p{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-top:12px;}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.review-card{background:var(--char);padding:32px 28px;display:flex;flex-direction:column;}
.review-stars{color:var(--blit);font-size:15px;letter-spacing:3px;margin-bottom:16px;}
.review-headline{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:19px;line-height:1.25;color:var(--bone);margin-bottom:14px;}
.review-body{font-size:15px;font-weight:300;line-height:1.6;color:var(--mist);margin-bottom:24px;flex:1;}
.review-author{display:flex;align-items:center;gap:12px;}
.review-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--mid);}
.review-avatar-mono{width:42px;height:42px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:.04em;color:var(--bone);background:linear-gradient(135deg,#1A4A78,#2E6DA4);}
.review-author-name{font-size:14px;font-weight:600;color:var(--bone);letter-spacing:.3px;}
.review-author-desc{font-size:13px;font-weight:300;color:var(--stone);}
@media(max-width:900px){.reviews-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){
  .reviews-section{padding:56px 20px;}
  .reviews-grid{grid-template-columns:1fr;}
  .review-card{padding:26px 22px;}
}
`;

function Stars({ n }) {
  return <div className="review-stars" aria-label={`${n} out of 5 stars`}>{'★'.repeat(n)}</div>;
}

export default function Reviews() {
  return (
    <>
      <style>{CSS}</style>
      <section className="reviews-section" id="reviews" data-track="reviews">
        <div className="reviews-inner">
          <div className="reviews-header reveal">
            <div className="reviews-stars-lead" aria-hidden="true">{'★★★★★'}</div>
            <h2>Rated 5/5 by our first users</h2>
            <p>Real results, head to toe</p>
          </div>
          <div className="reviews-grid reveal">
            {REVIEWS.map(r => (
              <article key={r.id} className="review-card">
                <Stars n={r.rating} />
                <h3 className="review-headline">{r.headline}</h3>
                <p className="review-body">{r.body}</p>
                <div className="review-author">
                  {r.photo
                    ? <img src={r.photo} alt={r.name} className="review-avatar" loading="lazy" />
                    : <div className="review-avatar-mono" aria-hidden="true">{r.name.charAt(0)}</div>}
                  <div>
                    <div className="review-author-name">{r.name}</div>
                    <div className="review-author-desc">{r.descriptor}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify it renders in isolation.** Temporarily is not needed — it is wired in Task 6. Just confirm the build compiles:

Run: `cd web && npm run build`
Expected: build succeeds with no errors referencing `Reviews.jsx`.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Reviews.jsx
git commit -m "feat(reviews): reviews section with monogram-avatar fallback"
```

---

### Task 5: Friction strip (buy-moment reassurance)

**Files:**
- Create: `web/src/components/FrictionStrip.jsx`
- Read for truth: `web/src/pages/TermsPage.jsx` (confirm the returns window before publishing the claim)

**Interfaces:**
- Produces: `export default function FrictionStrip()` — a compact reassurance row. No props.

- [ ] **Step 1: Confirm the returns window.** Open `web/src/pages/TermsPage.jsx` and find the returns/cancellation clause. Use the actual stated window in the copy below. If none is stated, use "14-day returns" (UK distance-selling minimum) and note it for the founder.

- [ ] **Step 2: Create `web/src/components/FrictionStrip.jsx`:**

```jsx
import { offerActive } from '../lib/offer.js';

const CSS = `
.friction-strip{background:var(--black);border-top:1px solid var(--line);padding:28px 24px;}
.friction-inner{max-width:1100px;margin:0 auto;display:flex;align-items:stretch;justify-content:center;gap:0;flex-wrap:wrap;}
.friction-item{display:flex;align-items:center;gap:10px;padding:8px 26px;color:var(--mist);font-size:14px;font-weight:300;letter-spacing:.3px;}
.friction-item:not(:last-child){border-right:1px solid var(--line);}
.friction-item strong{color:var(--bone);font-weight:600;}
.friction-ic{flex-shrink:0;color:var(--blit);}
@media(max-width:760px){
  .friction-inner{flex-direction:column;align-items:stretch;gap:0;}
  .friction-item{justify-content:flex-start;padding:12px 8px;border-right:none;}
  .friction-item:not(:last-child){border-right:none;border-bottom:1px solid var(--line);}
}
`;

const Check = () => (
  <svg className="friction-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);

export default function FrictionStrip() {
  return (
    <>
      <style>{CSS}</style>
      <div className="friction-strip">
        <div className="friction-inner">
          <div className="friction-item"><Check /><span><strong>{offerActive() ? 'Free UK delivery' : 'UK delivery'}</strong> · Royal Mail Tracked</span></div>
          <div className="friction-item"><Check /><span>Dispatched <strong>next working day</strong></span></div>
          <div className="friction-item"><Check /><span><strong>14-day returns</strong> · UK consumer rights</span></div>
          <div className="friction-item"><Check /><span>Secure <strong>Stripe</strong> checkout</span></div>
        </div>
      </div>
    </>
  );
}
```

(If Step 1 found a different returns window, edit the "14-day returns" text to match.)

- [ ] **Step 3: Confirm the build compiles**

Run: `cd web && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/FrictionStrip.jsx
git commit -m "feat(offer): buy-moment friction-reduction strip"
```

---

### Task 6: Place Reviews + FrictionStrip on the homepage and /buy

**Files:**
- Modify: `web/src/pages/FullSite.jsx`
- Modify: `web/src/pages/BuyPage.jsx`

**Interfaces:**
- Consumes: `Reviews` (Task 4), `FrictionStrip` (Task 5).

- [ ] **Step 1: Import both in `FullSite.jsx`** — add with the other component imports (after the `KitComparison` import line):

```js
import Reviews from '../components/Reviews.jsx';
import FrictionStrip from '../components/FrictionStrip.jsx';
```

- [ ] **Step 2: Insert them around the kits in the `FullSite` return.** Replace this current fragment:

```jsx
      <ProductLineup />
      <KitComparison />
      <TruthSection />
```

with:

```jsx
      <ProductLineup />
      <Reviews />
      <KitComparison />
      <FrictionStrip />
      <TruthSection />
```

(Reviews sit immediately before the offer; the friction strip sits immediately after it. Full reordering happens in Phase 2 — this task only adds the two new sections in their final relative positions.)

- [ ] **Step 3: Reuse Reviews on `/buy`.** In `web/src/pages/BuyPage.jsx`, add the import:

```js
import Reviews from '../components/Reviews.jsx';
```

Render `<Reviews />` just below the main purchase form/kit summary and above the page footer. (Open the file, locate the closing of the purchase form section / the footer element, and place `<Reviews />` between them.)

- [ ] **Step 4: Verify end-to-end at mobile (~390px) AND desktop.** Run `cd web && npm run dev`, open `http://localhost:5173`:
  - Reviews render above the kits with monogram avatars; stars are Sky Blue, not gold. Mobile: cards stack to a single column and are fully legible (body ≥13px).
  - Friction strip renders directly under the kits; mobile: items stack vertically with dividers, not squashed.
  - Open `http://localhost:5173/buy` — Reviews render there too, both breakpoints.
  - Scroll to kits → `QualifiedVisit` `offer_reached` still fires once.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/FullSite.jsx web/src/pages/BuyPage.jsx
git commit -m "feat(home): place reviews before kits + friction strip after; reuse reviews on /buy"
```

---

### Task 7: One dominant, outcome-led CTA

**Files:**
- Modify: `web/src/components/CTASection.jsx`
- Modify: `web/src/components/Hero.jsx`

**Interfaces:** none new — copy/label changes only.

Rationale: the audit flags too many competing CTAs and labels that describe what to buy ("Get Ground", "Begin with Ground") not what you get. Collapse to one dominant primary per section with an outcome-led label; keep at most one quiet secondary link. Per-kit buttons inside `KitComparison` stay ("Get GROUND"/"Get RITUAL") because they are explicit kit choices, not competing primaries.

- [ ] **Step 1: Bottom CTA — outcome-led, de-emphasise the second button.** In `web/src/components/CTASection.jsx`, change the two `cta-btn-primary` links so the primary is outcome-led and the second is visibly secondary. Replace the label text `Begin with Ritual · £85` with `Build My Ritual · £85` and `Begin with Ground · £65` with `Or start with Ground · £65`. (Keep the existing `href`, tracking, and `buyClick` calls unchanged.)

- [ ] **Step 2: Hero — outcome-led primary label.** In `web/src/components/Hero.jsx`, in the non-Father's-Day branch, change the primary button text `Get Your Kit` to `Build My Ritual`. Leave the `See The Kits` ghost link as the single quiet secondary. (Keep `href`, `trackGoal`, and the A/B `ctaVariant` wiring unchanged.)

- [ ] **Step 3: Verify.** `cd web && npm run dev` → confirm hero shows one dominant "Build My Ritual" + one quiet "See The Kits"; bottom CTA shows one dominant "Build My Ritual · £85" + a clearly secondary "Or start with Ground · £65".

- [ ] **Step 4: Commit**

```bash
git add web/src/components/CTASection.jsx web/src/components/Hero.jsx
git commit -m "feat(cta): collapse to one dominant outcome-led CTA per section"
```

> **Note for reviewer (founder):** final CTA wording is a judgement call — "Build My Ritual" is the recommended default. Alternatives considered: "Fix My Shower Routine", "Start My Reset". Change in review if preferred; it is a single-line edit per file.

---

## Phase 2 — Problem clarity, reorder, compress, and retire the stale QV signal

Goal: make the visitor instantly recognise their own problem (sharpen the hero to concrete symptoms, add a symptom-recognition Problem section), then reorder to Problem → Solution → Proof → Offer → Founder → FAQ → demoted tail, and retire `scroll_dwell` now that `offer_reached` is the down-page intent signal.

> Finding: the committed hero on `master` ("You feel clean. Then you don't.") does not appear to be live on production (production still shows the older "First Guided Body Ritual" hero per the founder's audit today) — a stale-deploy issue to investigate separately. Either way the current copy is too abstract; this phase makes it concrete.

Chosen framing (founder-approved): **Name the symptoms** — the hero names the problems men recognise; a Problem section lets them self-select a symptom; then the mechanism (dead skin + bacteria) and the 10-minute fix.

---

### Task 8: Sharpen the hero to concrete symptoms (mobile + desktop)

**Files:**
- Modify: `web/src/components/Hero.jsx`

**Interfaces:** none — copy + responsive CSS change only.

Mobile-first note: the hero body currently hides on mobile. We keep a CONCISE symptom line visible on mobile (readable over the film gradient) and show the fuller line on desktop.

- [ ] **Step 1: Replace the non-Father's-Day headline + subline.** In `web/src/components/Hero.jsx`, in the `IS_FATHERS_DAY ? (...) : (...)` else branch, replace:

```jsx
                <h1 className="hero-title">
                  You feel clean.<br />Then you don't.
                </h1>
                <div className="hero-line" />
                <p className="hero-subline">A shower only wets the surface, so the dead skin and bacteria are back within hours and the freshness fades. SOLUM clears what's underneath, head to toe, in the 10 minutes you already spend in the shower. Clean that actually lasts.</p>
```

with (note the two spans — a short symptom line always visible, and a desktop-only continuation):

```jsx
                <h1 className="hero-title">
                  You shower every day.<br />So why don't you feel clean?
                </h1>
                <div className="hero-line" />
                <p className="hero-subline"><span className="hero-sub-symptoms">Odour by midday. Rough skin. Bacne you can't reach. An itchy scalp.</span> <span className="hero-sub-more">A daily shower fixes none of it. SOLUM clears what's underneath, head to toe, in the 10 minutes you already spend in the shower.</span></p>
```

- [ ] **Step 2: Keep the symptom line visible on mobile.** In the `Hero.jsx` `CSS` string, in the `@media(max-width:959px)` block, change the hide rule so `.hero-subline` is NO LONGER hidden, and hide the desktop-only continuation instead. Replace:

```css
  .hero-subline,.hero-scope,.hero-ghost,.hero-glow,.scroll-cue{display:none;}
```

with:

```css
  .hero-scope,.hero-ghost,.hero-glow,.scroll-cue{display:none;}
  .hero-sub-more{display:none;}
  .hero-subline{font-size:15px;line-height:1.5;margin-bottom:22px;}
```

(On desktop both spans render inline as one paragraph; `.hero-sub-more` has no special desktop rule so it shows normally.)

- [ ] **Step 3: Verify BOTH breakpoints.** `cd web && npm run dev`:
  - Mobile (devtools ~390px): headline + the four concrete symptoms are clearly readable over the film; no clipping.
  - Desktop (≥960px): the full sentence reads as one paragraph.
  - No console errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Hero.jsx
git commit -m "copy(hero): name concrete symptoms, kept visible on mobile"
```

---

### Task 9: Problem section — symptom recognition (mobile-first)

**Files:**
- Create: `web/src/components/ProblemSection.jsx`

**Interfaces:**
- Produces: `export default function ProblemSection()` — renders `<section id="problem" data-track="problem">`. No props.

- [ ] **Step 1: Create `web/src/components/ProblemSection.jsx`:**

```jsx
const CSS = `
.problem-section{background:var(--black);border-top:1px solid var(--line);padding:100px 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-head{max-width:660px;margin-bottom:52px;}
.problem-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.problem-head h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4vw,60px);letter-spacing:.06em;color:var(--bone);line-height:1.04;margin-bottom:16px;}
.problem-head p{font-size:17px;font-weight:300;color:var(--mist);line-height:1.7;}
.problem-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.problem-card{background:var(--char);padding:30px 26px;}
.problem-card h3{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:var(--bone);line-height:1.2;margin-bottom:10px;}
.problem-card p{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
.problem-fix{background:var(--mid);border:1px solid var(--blue);padding:32px;margin-top:24px;}
.problem-fix p{font-size:17px;font-weight:300;color:var(--bone);line-height:1.7;}
.problem-fix strong{font-weight:600;}
@media(max-width:900px){.problem-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){
  .problem-section{padding:56px 20px;}
  .problem-grid{grid-template-columns:1fr;}
  .problem-fix{padding:24px 20px;}
  .problem-fix p{font-size:15px;}
}
`;

const SYMPTOMS = [
  ['Odour back by midday', 'You showered this morning. By lunch you catch yourself again.'],
  ['Rough, bumpy skin', 'Arms, shoulders, thighs. Years of dead skin nobody taught you to remove.'],
  ['A back you can\'t reach', 'Breakouts and buildup exactly where your hands never get to.'],
  ['An itchy, flaky scalp', 'Washed with shampoo every day, never actually cleaned.'],
  ['Never clean after the gym', 'The sweat rinses off. What causes the smell does not.'],
  ['Tight and dry, then greasy', 'Your skin never settles. It just swings from one to the other.'],
];

export default function ProblemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="problem-section" id="problem" data-track="problem">
        <div className="problem-inner">
          <div className="problem-head reveal">
            <div className="problem-tag">It isn't hygiene.</div>
            <h2>You do everything right.<br />You still don't feel clean.</h2>
            <p>If any of these sound familiar, it isn't you. It's the routine nobody ever fixed.</p>
          </div>
          <div className="problem-grid reveal">
            {SYMPTOMS.map(([title, body]) => (
              <div key={title} className="problem-card">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <div className="problem-fix reveal">
            <p>None of this is poor hygiene. A shower only wets the surface. Dead skin builds up for years and bacteria feed on it. <strong>SOLUM is the 10-minute system that clears it, head to toe.</strong></p>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Confirm the build compiles**

Run: `cd web && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ProblemSection.jsx
git commit -m "feat(home): problem section — symptom recognition before the solution"
```

---

### Task 10: Reorder the homepage sections

**Files:**
- Modify: `web/src/pages/FullSite.jsx`

**Interfaces:** none — reordering existing elements + adding `ProblemSection`.

- [ ] **Step 1: Import `ProblemSection`** in `FullSite.jsx`, alongside the other component imports:

```js
import ProblemSection from '../components/ProblemSection.jsx';
```

- [ ] **Step 2: Reorder the `FullSite` return (tight funnel).** Replace the current section sequence (from `<Hero />` through `<CTASection />`) with this order. The decision surface (kits) sits high — only Problem + a single "what it is" block + Reviews precede it; the ritual detail, full product lineup, and results timeline move BELOW the kits for people who want more:

```jsx
      <Hero />
      <Marquee />
      <ProblemSection />
      <WhatSolumIs />
      <Reviews />
      <KitComparison />
      <FrictionStrip />
      <RitualInAction />
      <ProductLineup />
      <TruthSection />
      <FounderSection />
      <FullBleedBand
        image="/products/feature/identity.webp"
        eyebrow="The Standard"
        head={<>Your body.<br />Finally done right.</>}
        sub="One system, head to toe. Built for the men who were never given one."
      />
      <FAQ />
      <CredibilityStrip />
      <ProvenanceSection />
      <SubscriptionSection />
      <CTASection />
```

Rationale (tight funnel, founder-approved): `ProblemSection` (symptoms) lands the problem immediately after the hero; `WhatSolumIs` is the single orienting "what it is" block so a first-timer isn't shown a price cold; `Reviews` supplies proof; then `KitComparison` + `FrictionStrip` are the decision surface — reached fast. Everything educational (`RitualInAction`, `ProductLineup`, `TruthSection` results, `FounderSection`) sits below the kits for considerers. `ProvenanceSection` + `SubscriptionSection` are the demoted tail before the closing `CTASection`.

- [ ] **Step 3: Verify order + that all section-view/scroll analytics still fire, on mobile AND desktop.** `cd web && npm run dev` → scroll the whole page at ~390px and at desktop width; confirm no console errors and the visual order matches above.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/FullSite.jsx
git commit -m "refactor(home): reorder to problem->solution->proof->offer->founder->tail"
```

---

### Task 11: Demote the product lineup to a "system" framing

**Files:**
- Modify: `web/src/components/ProductLineup.jsx`

**Interfaces:** none new.

Goal (audit #7): stop asking visitors to evaluate seven products; frame it as one system, with detail a click away on the existing `/product/:slug` pages. Keep the component but reduce its dominance and ensure it links out rather than being the decision surface.

- [ ] **Step 1: Read `web/src/components/ProductLineup.jsx`** to see its current header/intro and whether product cards already link to `/product/:slug`.

- [ ] **Step 2: Retune the section framing.** Change the section's heading/intro copy so it presents the lineup as *one 10-minute system*, not a catalogue to study (e.g. intro line: "One system, ten pieces, ten minutes. Here is what is inside." — adjust to match the existing copy voice and the component's actual props/structure). Ensure each product card is (or links to) its `/product/:slug` page so depth is opt-in. Do not add new claims; only reframe.

- [ ] **Step 3: Verify.** `cd web && npm run dev` → the lineup reads as a system overview with click-through to product pages; no console errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ProductLineup.jsx
git commit -m "refactor(home): frame product lineup as one system, detail via product pages"
```

---

### Task 12: Retire the `scroll_dwell` QualifiedVisit trigger

**Files:**
- Modify: `web/src/lib/qualifiedVisit.js`
- Test: `web/src/lib/qualifiedVisit.test.js`

**Interfaces:**
- Produces: `evaluateQualified` no longer returns `'scroll_dwell'`; down-page intent is represented solely by `'offer_reached'`.

Rationale: on the now-compressed page, `scroll >= 50%` happens in seconds, so `scroll_dwell` would fire for near-every visitor and flood Meta with low-intent "qualified" visits. `offer_reached` (must reach the actual kits section) replaces it as the intent-anchored down-page signal.

- [ ] **Step 1: Update the tests first.** In `web/src/lib/qualifiedVisit.test.js`:
  - Remove the two `scroll_dwell` assertions:
    - `it('fires scroll_dwell when scroll>=50 AND dwell>=60s', ...)`
    - the `'strong signal beats accumulated (product_detail wins)'` test uses scroll+dwell but asserts `product_detail`; it stays valid (product_detail still wins) — leave it.
  - Add:

```js
  it('no longer qualifies on scroll+dwell alone (scroll_dwell retired)', () => {
    expect(evaluateQualified({ ...base, scrollPct: 80, dwellMs: 120000 })).toBe(null);
  });
```

- [ ] **Step 2: Run tests to verify the retired case fails**

Run: `cd web && npm run test:unit -- qualifiedVisit`
Expected: FAIL — `scrollPct:80, dwellMs:120000` still returns `'scroll_dwell'`.

- [ ] **Step 3: Remove the trigger.** In `web/src/lib/qualifiedVisit.js`, delete the line:

```js
  if (scrollPct >= 50 && dwellMs >= 60000) return 'scroll_dwell';
```

Leave the `scrollPct`/`dwellMs` params in the signature (still reported as telemetry props by the tracker) — they simply no longer qualify a visit.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd web && npm run test:unit -- qualifiedVisit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/qualifiedVisit.js web/src/lib/qualifiedVisit.test.js
git commit -m "refactor(qv): retire scroll_dwell; offer_reached is the down-page intent signal"
```

---

### Task 13: Full-suite verification

- [ ] **Step 1: Unit suite**

Run: `cd web && npm run test:unit`
Expected: PASS.

- [ ] **Step 2: Build**

Run: `cd web && npm run build`
Expected: success, no errors.

- [ ] **Step 3: Manual QV audit on the reordered page.** `cd web && npm run dev`:
  - Fast scroll to bottom without engaging → `QualifiedVisit` fires with `offer_reached` (because the kits section was reached), and does NOT fire twice.
  - Confirm `product_detail` (open a `/product/:slug`) and `ritual_50` still fire as before.
  - Reviews + friction render on `/` and `/buy`.

- [ ] **Step 4: Commit any doc/status updates** (if applicable) and stop for review.

---

## Notes / open items for founder review (from spec §13)

- Final primary-CTA label (default shipped: "Build My Ritual").
- Mobile reviews layout is a single-column stack (no carousel) — simplest, fully legible. Say if you want a swipe carousel instead.
- Friction-strip returns claim: verify the exact window against `TermsPage.jsx` (defaulted to "14-day returns").
- Placeholder review personas + monogram avatars ship now; swap in real names + `/reviews/*.jpg` headshots when available (edit `web/src/data/reviews.js` only).
