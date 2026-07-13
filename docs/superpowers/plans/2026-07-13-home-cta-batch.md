# Home CTA Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the home→/buy leak: sticky mobile kit bar, urgency + trust at the kits section, a real conversion band after RitualInAction, a hero value anchor, and /kit/ redirect fixes.

**Architecture:** One new component (`StickyKitBar`), surgical edits to three existing components (`KitComparison`, `HomeCTABand`, `Hero`), and a redirect route in `App.jsx`. All prices/worths derive from `KITS`/`kitWorth()` in `web/src/data/kits.js`.

**Tech Stack:** React (Vite), react-router-dom, PostHog `capture()` from `web/src/lib/analytics.js`, `trackAddToCart` from `web/src/lib/addToCartTracker.js`.

**Spec:** `docs/superpowers/specs/2026-07-13-home-cta-batch-design.md`

## Global Constraints

- Work on the `dev` branch; Harsha signs off before merge to master.
- Copy: no em/en dashes, never the word "soap", min 13px body / 11px labels.
- Brand palette only: #08090B, #181C24, #1A4A78, #2E6DA4, #4A8FC7, #F0ECE2 (plus existing CSS vars).
- Never hardcode kit prices/worths in copy — compute from `KITS` / `kitWorth()`.
- All commands run from `web/`. `git add` only the files you touched — never `git add -A`.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: StickyKitBar component + FullSite mount

**Files:**
- Create: `web/src/components/StickyKitBar.jsx`
- Modify: `web/src/pages/FullSite.jsx` (add import; mount after `<FounderChat />`, line ~119)

**Interfaces:**
- Consumes: `KITS` from `../data/kits.js` (array of kits with `id`, `name`, `firstBoxPrice`, `comingSoon`, `hidden`), `capture` from `../lib/analytics.js`.
- Produces: `<StickyKitBar />` (no props). Events `sticky_bar_shown` (once per pageview), `sticky_bar_cta_clicked`. Body class `has-kitbar` while visible (offsets the FounderChat launcher, `.fc-launcher` at bottom:24px right:24px z-index:9000).

- [ ] **Step 1: Create the component**

`web/src/components/StickyKitBar.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { KITS } from '../data/kits.js';
import { capture } from '../lib/analytics.js';

const CSS = `
.sticky-kitbar{
  position:fixed;bottom:0;left:0;right:0;z-index:180;
  display:none;align-items:center;justify-content:space-between;gap:12px;
  height:56px;padding:0 14px;padding-bottom:env(safe-area-inset-bottom, 0px);
  box-sizing:content-box;background:#08090B;
  border-top:1px solid rgba(46,109,164,0.55);
}
.sticky-kitbar-prices{
  font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;
  letter-spacing:1.2px;text-transform:uppercase;color:var(--mist);white-space:nowrap;
}
.sticky-kitbar-cta{
  font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;
  background:var(--bone);color:var(--black);border:none;
  padding:13px 22px;cursor:pointer;white-space:nowrap;
}
/* Lift the founder chat launcher above the bar while it is shown */
body.has-kitbar .fc-launcher{bottom:calc(80px + env(safe-area-inset-bottom, 0px));}
body.has-kitbar .fc-bubble{bottom:calc(142px + env(safe-area-inset-bottom, 0px));}
@media(max-width:768px){.sticky-kitbar{display:flex;}}
`;

// Mobile-only persistent path to purchase: appears once the visitor scrolls past
// the hero and stays until the kit cards are actually on screen — the one moment
// it would only duplicate what is already visible.
export default function StickyKitBar() {
  const [pastHero, setPastHero] = useState(false);
  const [kitsInView, setKitsInView] = useState(false);
  const shownOnce = useRef(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = document.getElementById('kits');
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => setKitsInView(entries.some(e => e.isIntersecting)),
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const show = pastHero && !kitsInView;

  useEffect(() => {
    document.body.classList.toggle('has-kitbar', show);
    if (show && !shownOnce.current) {
      shownOnce.current = true;
      capture('sticky_bar_shown');
    }
    return () => document.body.classList.remove('has-kitbar');
  }, [show]);

  if (!show) return null;

  const prices = KITS
    .filter(k => !k.comingSoon && !k.hidden)
    .map(k => `${k.name} £${k.firstBoxPrice}`)
    .join(' · ');

  const goToKits = () => {
    capture('sticky_bar_cta_clicked');
    document.getElementById('kits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="sticky-kitbar">
        <span className="sticky-kitbar-prices">{prices}</span>
        <button type="button" className="sticky-kitbar-cta" onClick={goToKits}>
          Get Your Kit &#8594;
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Mount in FullSite**

In `web/src/pages/FullSite.jsx`, add next to the other component imports:

```js
import StickyKitBar from '../components/StickyKitBar.jsx';
```

and in the JSX, directly after `<FounderChat />`:

```jsx
      <StickyKitBar />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors (22 pre-existing errors / 2 warnings unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/StickyKitBar.jsx src/pages/FullSite.jsx
git commit -m "feat(home): sticky mobile kit bar after hero, hides at kits section"
```

---

### Task 2: Kits urgency + trust, HomeCTABand conversion band, hero value anchor

**Files:**
- Modify: `web/src/components/KitComparison.jsx`
- Modify: `web/src/components/HomeCTABand.jsx` (full rewrite, 23 lines currently)
- Modify: `web/src/components/Hero.jsx`

**Interfaces:**
- Consumes: `KITS`, `kitWorth(kit)` from `../data/kits.js`; `capture`; `trackAddToCart(kitId)` from `../lib/addToCartTracker.js`; `useNavigate`.
- Produces: new event `ctaband_buy_clicked` `{ kit }`. No changes to existing events or section ids (`#kits`, `#ritual-cta`).

- [ ] **Step 1: KitComparison — urgency footnote + trust row below the grid**

In `web/src/components/KitComparison.jsx`, the `.kits-footnote` class already exists in CSS (line ~76) but is unused. Add to the CSS string, directly after the `.kits-footnote` rule:

```css
.kits-footnote strong{color:var(--bone);font-weight:600;}
.kits-trust-row{margin-top:10px;font-size:13px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
```

In the JSX, directly after the closing `</div>` of `<div className="kits-grid reveal">` (i.e. between it and `</div>` of `.kits-inner`):

```jsx
          <div className="kits-footnote reveal">
            <strong>First batch · only 250 kits made.</strong> Next batch £75 and £95.
            <div className="kits-trust-row">🚚 Free UK delivery · ✓ 14-day returns · 🔒 Secured by Stripe</div>
          </div>
```

- [ ] **Step 2: Rewrite HomeCTABand as a conversion band**

Replace the entire contents of `web/src/components/HomeCTABand.jsx` with:

```jsx
import { useNavigate } from 'react-router-dom';
import { KITS, kitWorth } from '../data/kits.js';
import { capture } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';

const CSS = `
.home-ctaband{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:52px 24px;}
.home-ctaband-inner{max-width:640px;margin:0 auto;text-align:center;}
.home-ctaband-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(26px,3vw,38px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin:0 0 10px;}
.home-ctaband-title span{color:var(--blit);}
.home-ctaband-value{font-size:16px;color:var(--mist);font-weight:300;line-height:1.55;margin:0 0 24px;}
.home-ctaband-value strong{color:var(--bone);font-weight:600;}
.home-ctaband-buttons{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
.home-ctaband-buy{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;background:var(--bone);color:var(--black);border:none;padding:16px 30px;cursor:pointer;transition:background .2s,transform .15s;}
.home-ctaband-buy:hover{background:#fff;transform:translateY(-1px);}
.home-ctaband-ground{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;background:none;color:var(--bone);border:1px solid var(--lineb);padding:16px 30px;cursor:pointer;transition:border-color .2s,color .2s;}
.home-ctaband-ground:hover{border-color:var(--blue);}
.home-ctaband-trust{margin-top:18px;font-size:13px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
@media(max-width:640px){
  .home-ctaband-buttons{flex-direction:column;}
  .home-ctaband-buy,.home-ctaband-ground{width:100%;}
}
`;

// Conversion band after the ritual film: the visitor has just seen the system in
// action — this is the value maths plus a direct path to /buy for both kits.
export default function HomeCTABand() {
  const navigate = useNavigate();
  const ritual = KITS.find(k => k.id === 'ritual');
  const ground = KITS.find(k => k.id === 'ground');

  const buy = (kit) => {
    capture('ctaband_buy_clicked', { kit: kit.id });
    trackAddToCart(kit.id);
    navigate(`/buy?kit=${kit.id}`);
  };

  return (
    <>
      <style>{CSS}</style>
      <section className="home-ctaband" id="ritual-cta">
        <div className="home-ctaband-inner reveal">
          <h2 className="home-ctaband-title">Ten minutes a day.<br /><span>Everything changes.</span></h2>
          <p className="home-ctaband-value">
            <strong>£{kitWorth(ritual)} of product · you pay £{ritual.firstBoxPrice}.</strong><br />
            Tools last 6 to 12 months. First batch · only 250 kits made.
          </p>
          <div className="home-ctaband-buttons">
            <button type="button" className="home-ctaband-buy" onClick={() => buy(ritual)}>
              Buy {ritual.name} · £{ritual.firstBoxPrice}
            </button>
            <button type="button" className="home-ctaband-ground" onClick={() => buy(ground)}>
              Start with {ground.name} · £{ground.firstBoxPrice}
            </button>
          </div>
          <div className="home-ctaband-trust">🚚 Free UK delivery · ✓ 14-day returns · 🔒 Secured by Stripe</div>
        </div>
      </section>
    </>
  );
}
```

Note: the old `ritual_cta_clicked` capture goes away with the old link — the new event is
`ctaband_buy_clicked` with a `kit` property (deliberate; record it in the report).

- [ ] **Step 3: Hero value anchor**

In `web/src/components/Hero.jsx`, add to the imports (KITS/kitWorth are not yet imported there):

```js
import { KITS, kitWorth } from '../data/kits.js';
```

Directly after the `{offerActive() && ( ... )}` chip block (closes with `)}` around line 155), insert:

```jsx
            <div
              style={{
                marginTop: 10,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.8px',
                color: 'rgba(240,236,226,0.62)',
              }}
            >
              £{kitWorth(KITS.find(k => k.id === 'ritual'))} of product · kits from £{Math.min(...KITS.filter(k => !k.comingSoon && !k.hidden).map(k => k.firstBoxPrice))}
            </div>
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/KitComparison.jsx src/components/HomeCTABand.jsx src/components/Hero.jsx
git commit -m "feat(home): kits urgency + trust row, CTA band with direct buy buttons, hero value anchor"
```

---

### Task 3: /kit/ redirect routes

**Files:**
- Modify: `web/src/App.jsx`

**Interfaces:**
- Consumes: existing `NotFoundPage` import in App.jsx; `Navigate`, `useParams` from react-router-dom (extend the existing react-router-dom import at line 1).
- Produces: `/kit/ground` → `/buy?kit=ground`, `/kit/ritual` → `/buy?kit=ritual`, `/kit/<anything-else>` → NotFoundPage.

- [ ] **Step 1: Extend the router import and add the redirect component**

Change line 1 of `web/src/App.jsx`:

```js
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
```

Add above the `App` component (near `RouteFallback`, ~line 33):

```jsx
// Old kit URLs (/kit/ground, /kit/ritual) still live in past ad destinations and
// bio links; they hit the * catch-all and soft-404. Redirect them to /buy.
function KitRedirect() {
  const { kitId } = useParams();
  return ['ground', 'ritual'].includes(kitId)
    ? <Navigate to={`/buy?kit=${kitId}`} replace />
    : <NotFoundPage />;
}
```

- [ ] **Step 2: Add the route**

Directly above the catch-all `<Route path="*" element={<NotFoundPage />} />`:

```jsx
          <Route path="/kit/:kitId" element={<KitRedirect />} />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "fix(routing): redirect legacy /kit/ground and /kit/ritual to /buy"
```

---

### Task 4: Verification + deploy dev (controller)

- [ ] **Step 1: Full pass** — `npm run test:unit && npm run lint && npm run build` (expect 97/100 tests — 3 pre-existing dispatch.test.js failures — no new lint errors, build green).
- [ ] **Step 2: Playwright smoke on localhost (mobile viewport):** sticky bar absent at top, present after scrolling past hero, absent while #kits visible, present again below; tap "Get Your Kit" scrolls to kits. Kits footnote + trust row render. CTA band shows both buttons and navigates to /buy?kit=ritual / /buy?kit=ground. Hero shows "£133 of product · kits from £65". `/kit/ground` lands on /buy with GROUND selected; `/kit/foo` shows NotFound. Desktop (1280px): sticky bar never displays.
- [ ] **Step 3: Push dev**, Amplify build, hand to Harsha for sign-off before master.
