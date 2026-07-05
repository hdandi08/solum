# Ritual Gallery Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `RitualInAction` desktop player/rail with a single center-active gallery (coverflow) used on both desktop and mobile, and add a `ritual_multi` QualifiedVisit trigger.

**Architecture:** One responsive horizontal scroll-snap carousel. The card nearest the carousel's horizontal centre is "active" — it plays; others pause and dim. Center detection is scroll-position based (`offsetLeft`, transform-independent). The first auto-centred card on load is passive (no intent). Deliberate centring fires `ritual_selected` + `markRitualEngaged`. Engaging 2 distinct steps fires QualifiedVisit `ritual_multi`.

**Tech Stack:** React (hooks), Vite, Vitest, inline `<style>` CSS (existing component pattern), PostHog/Meta/TikTok via `analytics.js`.

## Global Constraints

- Never use the word "soap" anywhere (copy, alt text, labels).
- Fonts: Bebas Neue (display, uppercase), Barlow Condensed (body/labels). Colours: SOLUM Black `#08090B`, Steel Blue `#2E6DA4` / `#4A8FC7` (daily accent), gold `#c8a96e` (weekly accent), Bone `#F0ECE2`.
- Min font sizes: body ≥13px, labels ≥11px.
- Videos: `preload="none"`; only the centred video plays; others paused. Respect `prefers-reduced-motion` (no autoplay, no motion).
- QualifiedVisit `ritual_multi` threshold = **2** distinct ritual slugs. First auto-centred card is **passive** (not counted).
- Preserve existing events verbatim: `ritual_selected {product, source:'ritual_in_action'}`, `ritual_video_progress {product, percent, source:'ritual_in_action'}` at 25/50/75/100, `ritual_cta_clicked {source:'ritual_in_action'}`, and `markRitualProgress(pct)`.
- Work on `dev` branch. Log the change in `docs/manual-changes-log.md`. Get sign-off before merging to `master` (per project workflow).
- Frontend only — no migrations or edge functions in this plan.

---

### Task 1: Add `ritual_multi` rule to the QualifiedVisit evaluator

**Files:**
- Modify: `web/src/lib/qualifiedVisit.js`
- Test: `web/src/lib/qualifiedVisit.test.js`

**Interfaces:**
- Produces: `evaluateQualified({ productDetailViewed, ritualVideoPct, unboxingVideoPct, scrollPct, dwellMs, ritualVideosEngaged })` → returns a reason string or `null`. New reason `'ritual_multi'` when `ritualVideosEngaged >= 2`.

- [ ] **Step 1: Write the failing tests**

Add to `web/src/lib/qualifiedVisit.test.js`:

```js
describe('ritual_multi', () => {
  it('qualifies when 2 distinct ritual videos are engaged', () => {
    expect(evaluateQualified({ ritualVideosEngaged: 2 })).toBe('ritual_multi');
  });
  it('does not qualify on a single engaged video (via multi)', () => {
    expect(evaluateQualified({ ritualVideosEngaged: 1 })).toBeNull();
  });
  it('defaults ritualVideosEngaged to 0 when absent', () => {
    expect(evaluateQualified({})).toBeNull();
  });
  it('still prefers the immediate product_detail reason', () => {
    expect(evaluateQualified({ productDetailViewed: true, ritualVideosEngaged: 5 })).toBe('product_detail');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/qualifiedVisit.test.js`
Expected: FAIL — `ritual_multi` cases return `null` (rule not present yet).

- [ ] **Step 3: Add the rule**

In `web/src/lib/qualifiedVisit.js`, add the `ritualVideosEngaged` param (default 0) and the rule. Place it after `unboxing_50` and before `scroll_dwell`:

```js
export function evaluateQualified({ productDetailViewed = false, ritualVideoPct = 0, unboxingVideoPct = 0, scrollPct = 0, dwellMs = 0, ritualVideosEngaged = 0 } = {}) {
  if (productDetailViewed) return 'product_detail';
  if (ritualVideoPct >= 50) return 'ritual_50';
  if (unboxingVideoPct >= 50) return 'unboxing_50';
  if (ritualVideosEngaged >= 2) return 'ritual_multi';
  if (scrollPct >= 50 && dwellMs >= 60000) return 'scroll_dwell';
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/qualifiedVisit.test.js`
Expected: PASS (all cases, existing + new).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/qualifiedVisit.js web/src/lib/qualifiedVisit.test.js
git commit -m "feat(qv): add ritual_multi trigger (2+ distinct ritual steps)"
```

---

### Task 2: Add `markRitualEngaged` to the tracker

**Files:**
- Modify: `web/src/lib/qualifiedVisitTracker.js`

**Interfaces:**
- Consumes: `evaluateQualified` with new `ritualVideosEngaged` field.
- Produces: `export function markRitualEngaged(slug)` — records a distinct engaged ritual slug and re-evaluates.

- [ ] **Step 1: Add state, wire it into evaluate(), export the marker**

In `web/src/lib/qualifiedVisitTracker.js`:

1. Add `ritualSlugs` to the module `state` object:

```js
const state = { productDetailViewed: false, ritualVideoPct: 0, unboxingVideoPct: 0, scrollPct: 0, ritualSlugs: new Set(), startTs: Date.now() };
```

2. Pass its size into the evaluator inside `evaluate()`:

```js
function evaluate() {
  if (alreadyFired()) return;
  const reason = evaluateQualified({ ...state, ritualVideosEngaged: state.ritualSlugs.size, dwellMs: Date.now() - state.startTs });
  if (reason) fire(reason);
}
```

3. Add the exported marker next to the other `mark*` functions:

```js
export function markRitualEngaged(slug) { state.ritualSlugs.add(slug); evaluate(); }
```

- [ ] **Step 2: Run the QV unit tests (regression)**

Run: `cd web && npx vitest run src/lib/qualifiedVisit.test.js`
Expected: PASS (tracker change must not break evaluator tests).

- [ ] **Step 3: Verify the build compiles**

Run: `cd web && npx vite build`
Expected: build succeeds (no import/reference errors).

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/qualifiedVisitTracker.js
git commit -m "feat(qv): track distinct engaged ritual slugs, feed ritual_multi"
```

---

### Task 3: Rebuild `RitualInAction` as a unified center-active gallery

**Files:**
- Modify (full rewrite): `web/src/components/RitualInAction.jsx`

**Interfaces:**
- Consumes: `markRitualEngaged(slug)` (Task 2), `markRitualProgress(pct)`, `capture`, `videoFor(slug)`, `PRODUCTS`.
- Produces: default-exported `RitualInAction` React component (same import site in `FullSite.jsx` — no change there).

- [ ] **Step 1: Replace the component file with the unified gallery**

Overwrite `web/src/components/RitualInAction.jsx` with:

```jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { capture } from '../lib/analytics.js';
import { markRitualProgress, markRitualEngaged } from '../lib/qualifiedVisitTracker.js';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Composition mirrors the canonical ritual in ritualVideo.js (RITUALS).
// Daily: 04, 01, 03, 08, 07.  Weekly: 05, 02, 06.
const STEPS = [
  { num: '04', slug: '04-scalp-massager',   name: 'Scalp Massager',   freq: 'daily',  action: 'Firm circles, hairline to crown.' },
  { num: '01', slug: '01-body-wash',        name: 'Body Wash',        freq: 'daily',  action: 'Lather chest-down. Cleans, never strips.' },
  { num: '03', slug: '03-back-scrub-cloth', name: 'Back Scrub Cloth', freq: 'daily',  action: 'Drape, saw shoulder to lower back.' },
  { num: '08', slug: '08-cleansing-cloth',  name: 'Cleansing Cloth',  freq: 'daily',  action: 'Gentle daily cleanse, where it matters.' },
  { num: '07', slug: '07-body-lotion',      name: 'Body Lotion',      freq: 'daily',  action: 'Within 3 min of towelling. Skin absorbs 70% more.' },
  { num: '05', slug: '05-atlas-clay',       name: 'Atlas Clay Mask',  freq: 'weekly', action: 'Head to toe. Draws out the deep stuff.' },
  { num: '02', slug: '02-italy-towel-mitt', name: 'Italy Towel Mitt', freq: 'weekly', action: 'Long strokes. Dead skin lifts off.' },
  { num: '06', slug: '06-argan-oil',        name: 'Argan Body Oil',   freq: 'weekly', action: 'Press into damp skin. Fully fed.' },
];

function posterFor(num) {
  const prod = PRODUCTS.find(p => p.num === num);
  return prod?.media?.gallery?.[0] || prod?.media?.still || '';
}

const CSS = `
.ria-section{background:var(--black);border-top:1px solid var(--line);padding:80px 0;overflow:hidden;}
.ria-head-wrap{max-width:760px;margin:0 auto 34px;padding:0 24px;}
.ria-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.ria-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.ria-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto;max-width:480px;line-height:1.6;}

.ria-gallery{position:relative;}
.ria-carousel{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:6px 11vw 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.ria-carousel::-webkit-scrollbar{display:none;}
.ria-card{flex:0 0 78vw;max-width:340px;scroll-snap-align:center;cursor:pointer;
  background:none;border:none;padding:0;text-align:left;color:inherit;}
.ria-card-media{position:relative;width:100%;height:62vh;max-height:560px;overflow:hidden;background:#000;
  border:1px solid var(--line);transition:border-color .3s;}
.ria-card.active .ria-card-media{border-color:rgba(46,109,164,0.5);}
.ria-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ria-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,11,0.88),rgba(8,9,11,0.1) 52%,rgba(8,9,11,0) 72%);pointer-events:none;}
.ria-card-cue{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;
  background:rgba(46,109,164,0.6);border:1.5px solid var(--bone);display:flex;align-items:center;justify-content:center;color:var(--bone);pointer-events:none;}
.ria-stage-overlay{position:absolute;left:0;right:0;bottom:0;padding:16px;display:flex;flex-direction:column;gap:6px;pointer-events:none;}
.ria-badges{display:flex;align-items:center;gap:6px;}
.ria-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.08em;color:var(--bone);background:rgba(8,9,11,0.55);border:1px solid rgba(240,236,226,0.3);padding:2px 7px;}
.ria-freq{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:2px 7px;border:1px solid;}
.ria-freq.daily{color:var(--blit);border-color:rgba(46,109,164,0.45);background:rgba(46,109,164,0.12);}
.ria-freq.weekly{color:#c8a96e;border-color:rgba(200,169,110,0.45);background:rgba(200,169,110,0.12);}
.ria-stage-name{font-family:'Bebas Neue',sans-serif;font-size:23px;letter-spacing:.04em;color:var(--bone);line-height:1.05;}
.ria-stage-action{font-size:14px;font-weight:300;color:var(--mist);line-height:1.45;}

.ria-arrow{display:none;}

.ria-dots{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:20px;padding:0 24px;flex-wrap:wrap;}
.ria-dot{width:7px;height:7px;border-radius:50%;background:rgba(240,236,226,0.22);border:none;padding:0;cursor:pointer;transition:background .25s,width .25s;}
.ria-dot.active{background:var(--blit);width:20px;border-radius:4px;}

.ria-more{display:flex;justify-content:center;margin-top:26px;}
.ria-more a{display:inline-flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-decoration:none;padding:12px 28px;border:1px solid rgba(240,236,226,0.25);transition:border-color .2s;}
.ria-more a:hover{border-color:var(--bone);}

/* Desktop: coverflow — cap the media height so video + dots fit one screen,
   dim/shrink off-centre cards, show arrows. */
@media(min-width:769px){
  .ria-section{padding:72px 0;}
  .ria-carousel{gap:22px;padding:6px calc(50% - 150px) 10px;}
  .ria-card{flex-basis:auto;max-width:none;}
  .ria-card-media{height:clamp(320px,50vh,460px);width:auto;aspect-ratio:9/16;
    transition:border-color .3s,transform .35s ease,opacity .35s ease;transform:scale(.82);opacity:.5;}
  .ria-card.active .ria-card-media{transform:scale(1);opacity:1;}
  .ria-arrow{display:flex;align-items:center;justify-content:center;position:absolute;top:calc(50% - 8px);
    transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:rgba(18,21,28,0.85);
    border:1px solid var(--line);color:var(--bone);cursor:pointer;z-index:2;transition:background .2s;}
  .ria-arrow:hover{background:var(--char);}
  .ria-arrow.prev{left:16px;} .ria-arrow.next{right:16px;}
}
@media(max-width:768px){ .ria-section{padding:60px 0;} }
`;

const PLAY = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
);
const chevron = (dir) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

export default function RitualInAction() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [userSelected, setUserSelected] = useState(false);

  const carouselRef = useRef(null);
  const cardRefs = useRef([]);
  const vidRefs = useRef([]);
  const firstSettle = useRef(true);
  const progressFired = useRef(new Set());
  const rafId = useRef(0);

  // Activate a card: play its video, pause the rest. First settle is passive (no intent);
  // any later centring counts as a deliberate selection.
  const applyActive = useCallback((i) => {
    setActiveIdx(i);
    progressFired.current = new Set();
    vidRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === i && !REDUCE_MOTION) { v.play().catch(() => {}); } else { v.pause(); }
    });
    if (firstSettle.current) { firstSettle.current = false; return; }
    setUserSelected(true);
    capture('ritual_selected', { product: STEPS[i].slug, source: 'ritual_in_action' });
    markRitualEngaged(STEPS[i].slug);
  }, []);

  // The card whose centre is nearest the carousel centre is active.
  useEffect(() => {
    const car = carouselRef.current;
    if (!car) return;
    let current = -1;
    const measure = () => {
      const cx = car.scrollLeft + car.clientWidth / 2;
      let best = 0, bd = Infinity;
      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - cx);
        if (d < bd) { bd = d; best = idx; }
      });
      if (best !== current) { current = best; applyActive(best); }
    };
    const onScroll = () => { cancelAnimationFrame(rafId.current); rafId.current = requestAnimationFrame(measure); };
    measure(); // initial, passive
    car.addEventListener('scroll', onScroll, { passive: true });
    return () => { car.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId.current); };
  }, [applyActive]);

  const goTo = (i) => {
    const idx = Math.max(0, Math.min(STEPS.length - 1, i));
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Fires for the active, user-selected video only. Autoplay-first never counts as intent.
  function fireProgress(e, idx, slug) {
    if (!userSelected || idx !== activeIdx) return;
    const v = e.currentTarget;
    if (!v.duration) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('ritual_video_progress', { product: slug, percent: m, source: 'ritual_in_action' });
        markRitualProgress(m);
      }
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="ria-section" id="ritual">
        <div className="ria-head-wrap">
          <div className="ria-eyebrow reveal">The Ritual</div>
          <h2 className="ria-head reveal">Ritual in Action.</h2>
          <p className="ria-sub reveal">Every step, on real skin. Daily keeps you maintained. Weekly resets you.</p>
        </div>

        <div className="ria-gallery reveal">
          <button className="ria-arrow prev" aria-label="Previous step" onClick={() => goTo(activeIdx - 1)}>{chevron('prev')}</button>

          <div className="ria-carousel" ref={carouselRef} role="listbox" aria-label="Ritual steps">
            {STEPS.map((s, i) => {
              const f = videoFor(s.slug);
              const vid = !!f && !REDUCE_MOTION;
              const pos = (f && f.poster) || posterFor(s.num);
              return (
                <div
                  className={`ria-card${i === activeIdx ? ' active' : ''}`}
                  key={s.slug}
                  data-idx={i}
                  role="option"
                  aria-selected={i === activeIdx}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  onClick={() => goTo(i)}
                >
                  <div className="ria-card-media">
                    {vid ? (
                      <video
                        ref={(el) => { vidRefs.current[i] = el; }}
                        className="ria-media"
                        poster={pos}
                        muted
                        loop
                        playsInline
                        preload="none"
                        onTimeUpdate={(e) => fireProgress(e, i, s.slug)}
                      >
                        <source src={f.webm} type="video/webm" />
                        <source src={f.mp4} type="video/mp4" />
                      </video>
                    ) : (
                      <img className="ria-media" src={pos} alt={`${s.name} in use`} loading="lazy" />
                    )}
                    <div className="ria-scrim" />
                    {vid && i !== activeIdx && <span className="ria-card-cue">{PLAY}</span>}
                    <div className="ria-stage-overlay">
                      <div className="ria-badges">
                        <span className="ria-num">{s.num}</span>
                        <span className={`ria-freq ${s.freq}`}>{s.freq}</span>
                      </div>
                      <span className="ria-stage-name">{s.name}</span>
                      <span className="ria-stage-action">{s.action}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="ria-arrow next" aria-label="Next step" onClick={() => goTo(activeIdx + 1)}>{chevron('next')}</button>
        </div>

        <div className="ria-dots" role="tablist" aria-label="Ritual steps">
          {STEPS.map((s, i) => (
            <button
              key={s.slug}
              className={`ria-dot${i === activeIdx ? ' active' : ''}`}
              aria-label={`Go to ${s.name}`}
              aria-selected={i === activeIdx}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="ria-more reveal">
          <a href="/ritual" onClick={() => capture('ritual_cta_clicked', { source: 'ritual_in_action' })}>
            See the full ritual {ARROW}
          </a>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd web && npx vite build`
Expected: build succeeds, no unresolved imports (`markRitualEngaged` resolves from Task 2).

- [ ] **Step 3: Commit**

```bash
git add web/src/components/RitualInAction.jsx
git commit -m "feat(ritual): unified center-active gallery for desktop + mobile"
```

---

### Task 4: Verify in the running app (desktop, mobile, reduced-motion, QV)

**Files:**
- Test (throwaway, delete after): a Playwright check script, run against the dev server.

- [ ] **Step 1: Start the dev server**

Run: `cd web && npm run dev` (port 5173). Leave running.
(If prompted about test stock, follow project convention.)

- [ ] **Step 2: Desktop coverflow check (Playwright, iPhone-less, 1280×800)**

Create `web/ria-check.cjs`:

```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://localhost:5173/', { waitUntil: 'load' });
  await p.locator('#ritual').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  // click the 2nd card -> it should become active (centered)
  const cards = p.locator('.ria-card');
  await cards.nth(1).click();
  await p.waitForTimeout(700);
  const active = await p.locator('.ria-card.active').getAttribute('data-idx');
  console.log('active after clicking card 1:', active, '(expect 1)');
  // page must not scroll sideways
  const bad = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('horizontal overflow px:', bad, '(expect 0)');
  await b.close();
})();
```

Run: `cd web && node ria-check.cjs`
Expected: `active after clicking card 1: 1` and `horizontal overflow px: 0`.

- [ ] **Step 3: Manual mobile + reduced-motion check**

- In browser devtools, emulate a phone (e.g. iPhone 12): the carousel shows ~one card wide, swipe changes the centred card, the centred card plays, others pause. Confirm it matches the pre-redesign mobile feel (no layout break, no sideways page scroll).
- Toggle "Emulate prefers-reduced-motion: reduce": no video autoplays (posters shown), no motion.

- [ ] **Step 4: QV `ritual_multi` check (PostHog, dev host)**

- On the running dev site, deliberately centre **2 different** ritual steps (swipe/click/arrow).
- Confirm a `QualifiedVisit` event with `reason: 'ritual_multi'` is captured. Either watch the browser Network tab for the PostHog `/capture` call, or run the watcher against the dev host:

Run (with a personal key): `PH=phx_… python3 scripts/posthog/watch_events.py 20 amplifyapp` (dev) or check localhost via PostHog debug.
Expected: one `QualifiedVisit` fired; centring only the FIRST (page-load) card does NOT fire it.

- [ ] **Step 5: Clean up and log**

```bash
rm web/ria-check.cjs
```

Add a line to `docs/manual-changes-log.md` under today's date: "Rebuilt RitualInAction as unified center-active gallery (desktop+mobile); added QualifiedVisit `ritual_multi` trigger (2+ steps)."

```bash
git add docs/manual-changes-log.md
git commit -m "docs: log ritual gallery redesign + ritual_multi"
```

- [ ] **Step 6: Stop the dev server** (Ctrl-C) once verification passes.

---

## Self-Review

**Spec coverage:**
- Center-active gallery (coverflow), daily→weekly order, VH-capped, arrows/drag/click-to-center → Task 3 (CSS + `goTo` + arrows + `scroll-snap`).
- Unify desktop+mobile into one component → Task 3 (single carousel, responsive media query).
- `ritual_multi` trigger, threshold 2, first passive → Tasks 1, 2, 3 (`firstSettle` guard).
- Preserve `ritual_selected`, `ritual_video_progress` + `markRitualProgress`, `ritual_cta_clicked`, `preload="none"`, reduced-motion → Task 3.
- Real posters/films → Task 3 (`posterFor`, `videoFor`).
- Verify mobile no-regression, reduced-motion, QV firing → Task 4.

**Placeholder scan:** none — full code in every code step.

**Type consistency:** `markRitualEngaged(slug)` defined in Task 2, consumed in Task 3. `ritualVideosEngaged` field defined in Task 1, populated in Task 2. `evaluateQualified` signature consistent across tasks.

**Known visual-tuning note:** the desktop coverflow scale (`scale(.82)`), media height clamp, and side padding (`calc(50% - 150px)`) are starting values — Task 4 Step 2/3 confirms fit; nudge these if the neighbours peek too much/little or the video+dots don't fit one screen. This is expected tuning for a visual component, not a placeholder.
