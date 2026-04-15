# SOLUM Website Content Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `FullSite.jsx` into modular React components with correct kit names (GROUND · RITUAL · SOVEREIGN), 10-product lineup, updated pricing, corrected rituals, and messaging that follows the approved framework.

**Architecture:** Extract every section of FullSite.jsx into a focused component file under `web/src/components/`. Data constants (products, kits, ritual steps) live in `web/src/data/` and are imported by the components that need them. FullSite.jsx becomes a thin orchestrator that imports and sequences the components. Each component owns its scoped CSS in a string literal, injected via `<style>{CSS}</style>` at render — matching the existing pattern.

**Tech Stack:** React 19, Vite 8. No test framework. Verification is `npm run build` (must exit 0) after each task.

**Working directory for all commands:** `web/`

---

## File Map

| File | Action |
|---|---|
| `web/src/data/products.js` | Create — 10-product constant |
| `web/src/data/kits.js` | Create — 3-kit constant |
| `web/src/data/rituals.js` | Create — daily + weekly steps |
| `web/src/components/Nav.jsx` | Create |
| `web/src/components/Hero.jsx` | Create — messaging framework H1 |
| `web/src/components/Marquee.jsx` | Create |
| `web/src/components/TruthSection.jsx` | Create |
| `web/src/components/KitComparison.jsx` | Create — NEW |
| `web/src/components/ProductLineup.jsx` | Create — 10 products |
| `web/src/components/RitualSection.jsx` | Create — two-tab daily/weekly |
| `web/src/components/SubscriptionSection.jsx` | Create — NEW |
| `web/src/components/ProvenanceSection.jsx` | Create |
| `web/src/components/SocialProof.jsx` | Create |
| `web/src/components/FAQ.jsx` | Create — updated pricing |
| `web/src/components/CTASection.jsx` | Create |
| `web/src/components/SolumFooter.jsx` | Create |
| `web/src/pages/FullSite.jsx` | Rewrite — thin orchestrator |
| `CLAUDE.md` | Update product lineup |

---

## CSS Token Reference

All components use these CSS variables (defined in `web/src/styles/global.css`, imported globally via `web/src/App.jsx`):

```
--black: #08090b   --char: #0c0e12    --dark: #10131a    --mid: #181c24
--blue: #2e6da4    --blit: #4a8fc7    --bdim: #1a4a78    --bone: #f0ece2
--stone: #a8b4bc   --mist: rgba(240,236,226,0.85)
--line: rgba(240,236,226,0.055)       --lineb: rgba(46,109,164,0.18)
```

Fonts loaded globally in `web/index.html`: `Bebas Neue` (headings), `Barlow Condensed` (body).

**Legibility rules (non-negotiable):**
- Body copy: min 15px, `font-weight:300`, `color: var(--mist)` or `var(--stone)`
- Key copy (descriptions, card body): min 14px on dark backgrounds
- Headlines: Bebas Neue, `clamp(36px, 4vw, 64px)` minimum
- Section tags/eyebrows: 11px, `letter-spacing:5px`, `text-transform:uppercase`, `color: var(--blue)`
- Line height: `1.7` for body, `1.0–1.1` for headlines
- Never use opacity to fix readability — use the correct colour token

---

## Task 1: Data Constants

**Files:**
- Create: `web/src/data/products.js`
- Create: `web/src/data/kits.js`
- Create: `web/src/data/rituals.js`

- [ ] **Step 1: Create `web/src/data/products.js`**

```js
export const PRODUCTS = [
  { num: '01', name: 'Body Wash', fullName: 'Amino Acid Body Wash 250ml', origin: '🇬🇧 United Kingdom', tag: 'Body · Daily', desc: 'Amino acid surfactants. Zero sulphates. Cleans without stripping the skin barrier.', comingSoon: false },
  { num: '02', name: 'Italy Towel Mitt', fullName: 'Italy Towel Mitt', origin: '🇰🇷 Korean Tradition', tag: 'Body · Weekly', desc: 'The Korean bathhouse standard. Removes dead skin buildup that body wash alone cannot reach. Weekend use only.', comingSoon: false },
  { num: '03', name: 'Back Scrub Cloth', fullName: 'Back Scrub Cloth 70cm', origin: '🇰🇷 Korean Tradition', tag: 'Back · Daily', desc: '70cm. Handles at both ends. Your back has never been properly cleaned. This fixes that.', comingSoon: false },
  { num: '04', name: 'Scalp Massager', fullName: 'Silicone Scalp Massager', origin: '🇰🇷 South Korea', tag: 'Scalp · Daily', desc: 'Used during wash. Stimulates blood flow to follicles. Distributes product evenly. 60 seconds.', comingSoon: false },
  { num: '05', name: 'Atlas Clay Mask', fullName: 'Atlas Clay Mask 200g', origin: '🇲🇦 Morocco', tag: 'Body · Weekly', desc: 'Atlas mountain clay. Draws out body impurities. Applied head to toe. Leave 8–10 minutes.', comingSoon: false },
  { num: '06', name: 'Argan Body Oil', fullName: 'Organic Argan Body Oil 50ml', origin: '🇲🇦 Morocco', tag: 'Body · Weekly', desc: 'Cold-pressed. Certified organic. Applied to damp skin after weekly exfoliation. Absorption peaks on freshly exfoliated skin.', comingSoon: false },
  { num: '07', name: 'Body Lotion', fullName: 'Fast-Absorb Body Lotion 400ml', origin: '🇬🇧 United Kingdom', tag: 'Body · Daily · 3 Min Rule', desc: '400ml. Applied to the full body within 3 minutes of towelling. This window is when skin absorbs moisture most efficiently.', comingSoon: false },
  { num: '08', name: 'Bamboo Cloth', fullName: 'Bamboo Cloth', origin: 'Bamboo Fibre', tag: 'Sensitive Areas · Daily', desc: 'Ultra-soft bamboo fibre. For sensitive areas. Nothing left uncleaned.', comingSoon: false },
  { num: '09', name: 'Turkish Kese Mitt', fullName: 'Artisan Turkish Kese Mitt', origin: '🇹🇷 Turkey', tag: 'Body · Weekly', desc: 'Hand-woven by artisans in Istanbul. Replaces the Italy Towel Mitt in SOVEREIGN. Coming soon.', comingSoon: true },
  { num: '10', name: 'Beidi Black Soap', fullName: 'Beidi Black Soap', origin: '🇹🇷 Turkey', tag: 'Body · Weekly', desc: 'Traditional hammam black soap. Coming soon.', comingSoon: true },
];
```

- [ ] **Step 2: Create `web/src/data/kits.js`**

```js
// SOVEREIGN contains 9 products: replaces 02 (Italy Towel Mitt) with 09 (Turkish Kese Mitt). Does not include 02.
export const KITS = [
  {
    id: 'ground',
    name: 'GROUND',
    firstBoxPrice: 55,
    monthlyPrice: 38,
    productNums: ['01','02','03','04','05','07','08'],
    tagline: 'Everything to start the ritual.',
    popular: false,
    comingSoon: false,
  },
  {
    id: 'ritual',
    name: 'RITUAL',
    firstBoxPrice: 85,
    monthlyPrice: 48,
    productNums: ['01','02','03','04','05','06','07','08'],
    tagline: 'The complete system. The one to be on.',
    popular: true,
    comingSoon: false,
  },
  {
    id: 'sovereign',
    name: 'SOVEREIGN',
    firstBoxPrice: 130,
    monthlyPrice: 58,
    // 02 replaced by 09 — Italy Towel Mitt → Turkish Kese Mitt
    productNums: ['01','03','04','05','06','07','08','09','10'],
    replacedProducts: { '02': '09' },
    tagline: 'The artisan upgrade. Hand-woven. Limited.',
    popular: false,
    comingSoon: true,
  },
];
```

- [ ] **Step 3: Create `web/src/data/rituals.js`**

```js
// Italy Towel Mitt (02) is WEEKLY ONLY. Viscose rayon is too aggressive for daily use.
export const DAILY_STEPS = [
  { num: '04', name: 'Scalp Massager', time: '2–3 MIN', zone: 'SCALP', desc: 'Small firm circles, hairline to back. 2–3 minutes.' },
  { num: '01', name: 'Body Wash', time: '1 MIN', zone: 'FULL BODY', desc: 'Amino acid formula. No sulphates. Cleans without stripping.' },
  { num: '03', name: 'Back Scrub Cloth', time: '1 MIN', zone: 'BACK', desc: 'Both handles, drape over shoulder, saw back and forth. The only way to reach your back.' },
  { num: '08', name: 'Bamboo Cloth', time: '30 SEC', zone: 'SENSITIVE AREAS', desc: 'For sensitive areas. Nothing left uncleaned.' },
  { num: '07', name: 'Body Lotion', time: '1 MIN', zone: 'FULL BODY', desc: 'Within 3 minutes of towelling. Skin absorbs 70% more moisture.' },
];

export const WEEKLY_STEPS = [
  { num: '04', name: 'Deep Scalp Massage', time: '5 MIN', zone: 'SCALP', desc: '5 minutes. More pressure than daily. Stimulates follicles.' },
  { num: '05', name: 'Atlas Clay Mask', time: '8–10 MIN', zone: 'HEAD TO TOE', desc: 'Apply head to toe on damp skin. Leave 8–10 minutes. Draws out what body wash cannot reach.' },
  { num: '02', name: 'Italy Towel Mitt', time: '3 MIN', zone: 'FULL BODY', desc: 'Weekend use only — viscose rayon is too aggressive for daily use. Firm slow strokes. Dead skin rolls off.' },
  { num: '08', name: 'Bamboo Cloth', time: '30 SEC', zone: 'SENSITIVE AREAS', desc: 'For sensitive areas.' },
  { num: '06', name: 'Argan Body Oil', time: '2 MIN', zone: 'FULL BODY', desc: 'Stay damp. 10–15 drops pressed in. No lotion needed today.' },
];
```

- [ ] **Step 4: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0, no errors (data files aren't imported anywhere yet — that's fine).

- [ ] **Step 5: Commit**

```bash
git add web/src/data/
git commit -m "feat: add data constants — products, kits, rituals"
```

---

## Task 2: Nav Component

**Files:**
- Create: `web/src/components/Nav.jsx`

- [ ] **Step 1: Create `web/src/components/Nav.jsx`**

```jsx
import { useState, useEffect } from 'react';

const CSS = `
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px;background:rgba(8,9,11,0.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--lineb);}
.nav-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:0.18em;color:var(--bone);text-decoration:none;}
.nav-links{display:flex;gap:36px;list-style:none;margin:0;padding:0;}
.nav-links a{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);text-decoration:none;transition:color .2s;}
.nav-links a:hover,.nav-links a.active-link{color:var(--bone);}
.nav-cta{font-size:11px;letter-spacing:4px;text-transform:uppercase;background:var(--blue);color:var(--bone);padding:10px 24px;text-decoration:none;transition:background .2s;}
.nav-cta:hover{background:var(--blit);}
@media(max-width:768px){.nav-links{display:none;}.nav{padding:0 24px;}}
`;

const NAV_LINKS = [
  ['#truth', 'Why SOLUM'],
  ['#kits', 'Kits'],
  ['#products', 'Products'],
  ['#ritual', 'The Ritual'],
  ['#subscription', 'Subscription'],
];

export default function Nav() {
  const [activeNav, setActiveNav] = useState('');

  useEffect(() => {
    const handler = () => {
      let cur = '';
      document.querySelectorAll('section[id]').forEach(s => {
        if (window.scrollY >= s.offsetTop - 100) cur = s.id;
      });
      setActiveNav(cur);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <nav>
        <a href="#home" className="nav-logo">SOLUM</a>
        <ul className="nav-links">
          {NAV_LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className={activeNav === href.slice(1) ? 'active-link' : ''}>{label}</a>
            </li>
          ))}
        </ul>
        <a href="#kits" className="nav-cta">Choose Your Kit</a>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Nav.jsx
git commit -m "feat: add Nav component"
```

---

## Task 3: Hero Component

**Files:**
- Create: `web/src/components/Hero.jsx`

The H1 and eyebrow copy are locked from the approved messaging framework. Use exactly as specified.

- [ ] **Step 1: Create `web/src/components/Hero.jsx`**

```jsx
const CSS = `
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 48px 80px;position:relative;overflow:hidden;background:var(--black);}
.hero::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:80px 80px;animation:gridFade 3s ease forwards;}
@keyframes gridFade{from{opacity:0;}to{opacity:1;}}
.hero-ghost{position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);font-family:'Bebas Neue',sans-serif;font-size:clamp(180px,22vw,340px);letter-spacing:-0.04em;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.07);pointer-events:none;user-select:none;white-space:nowrap;animation:ghostIn 2s cubic-bezier(.16,1,.3,1) .3s both;}
@keyframes ghostIn{from{opacity:0;transform:translate(-50%,-48%) scale(.96);}to{opacity:1;transform:translate(-50%,-52%) scale(1);}}
.hero-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(46,109,164,0.06) 0%,transparent 70%);pointer-events:none;}
.hero-content{position:relative;z-index:1;max-width:860px;}
.hero-eyebrow{font-size:13px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);margin-bottom:24px;display:flex;align-items:center;gap:12px;animation:fadeUp .8s ease .6s both;}
.hero-eyebrow::before{content:'';width:32px;height:1px;background:var(--blue);}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(72px,9vw,136px);line-height:.92;letter-spacing:0.03em;color:var(--bone);margin-bottom:32px;animation:fadeUp .8s ease .75s both;}
.hero-title em{font-style:normal;color:var(--blue);}
.hero-line{width:100%;height:1px;background:linear-gradient(to right,var(--blue) 0%,transparent 60%);margin-bottom:28px;animation:lineIn 1s ease 1s both;transform-origin:left;}
@keyframes lineIn{from{transform:scaleX(0);opacity:0;}to{transform:scaleX(1);opacity:1;}}
.hero-body{font-size:17px;font-weight:300;letter-spacing:.3px;color:var(--mist);max-width:520px;line-height:1.7;margin-bottom:20px;animation:fadeUp .8s ease .9s both;}
.hero-scope{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--lineb);padding:9px 18px;margin-bottom:40px;animation:fadeUp .8s ease .95s both;}
.hero-scope-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.hero-scope-divider{width:1px;height:14px;background:var(--lineb);}
.hero-scope-note{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.hero-actions{display:flex;gap:16px;align-items:center;animation:fadeUp .8s ease 1.05s both;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--blue);color:var(--bone);padding:16px 40px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;}
.btn-primary:hover{background:var(--blit);transform:translateY(-1px);}
.btn-ghost{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;}
.btn-ghost:hover{color:var(--bone);border-color:var(--blue);}
.scroll-cue{position:absolute;bottom:32px;right:48px;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);animation:fadeUp .8s ease 1.4s both;}
.scroll-line{width:1px;height:48px;background:linear-gradient(to bottom,var(--blue),transparent);animation:scrollPulse 2s ease-in-out 2s infinite;}
@keyframes scrollPulse{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@media(max-width:768px){.hero{padding:0 24px 60px;}.hero-title{font-size:clamp(56px,14vw,96px);}}
`;

export default function Hero() {
  return (
    <>
      <style>{CSS}</style>
      <section className="hero" id="home">
        <div className="hero-ghost">SOLUM</div>
        <div className="hero-glow" />
        <div className="hero-content">
          {/* Approved eyebrow — locked from messaging framework */}
          <div className="hero-eyebrow">Men shower. Men don't actually clean.</div>
          {/* Approved H1 — locked from messaging framework */}
          <h1 className="hero-title">
            You Shower<br />Every Day.<br /><em>Your Body Is</em><br /><em>Still Dirty.</em>
          </h1>
          <div className="hero-line" />
          <p className="hero-body">
            Not your fault. Nobody ever built men a system worth following.
            SOLUM fixes that. 10 minutes. 8 products. Two rituals. Head to toe.
          </p>
          <div className="hero-scope">
            <span className="hero-scope-label">Body Care</span>
            <span className="hero-scope-divider" />
            <span className="hero-scope-note">Not Face. Not Hair. Your Body — Head to Toe.</span>
          </div>
          <div className="hero-actions">
            <a href="#kits" className="btn-primary">Choose Your Kit</a>
            <a href="#truth" className="btn-ghost">Why It Matters</a>
          </div>
        </div>
        <div className="scroll-cue"><div className="scroll-line" />Scroll</div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Hero.jsx
git commit -m "feat: add Hero component — messaging framework H1"
```

---

## Task 4: Marquee + TruthSection Components

**Files:**
- Create: `web/src/components/Marquee.jsx`
- Create: `web/src/components/TruthSection.jsx`

- [ ] **Step 1: Create `web/src/components/Marquee.jsx`**

```jsx
const CSS = `
.marquee-wrap{overflow:hidden;border-top:1px solid var(--lineb);border-bottom:1px solid var(--lineb);background:var(--char);padding:14px 0;}
.marquee-track{display:flex;gap:0;white-space:nowrap;animation:marquee 28s linear infinite;}
@keyframes marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.marquee-item{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:0.18em;color:var(--stone);padding:0 36px;display:flex;align-items:center;gap:36px;}
.marquee-dot{width:4px;height:4px;border-radius:50%;background:var(--blue);flex-shrink:0;display:inline-block;}
`;

const ITEMS = [
  'The Ritual Men Were Never Taught',
  'Ground · Ritual · Sovereign',
  '10 Minutes Daily · 18 Minutes Weekly',
  '8 Products Live · 10 Coming',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
  'UK · Korea · Morocco',
  'Formulated for Men. Built to Last.',
];

// Duplicate for seamless loop
const ALL = [...ITEMS, ...ITEMS];

export default function Marquee() {
  return (
    <>
      <style>{CSS}</style>
      <div className="marquee-wrap">
        <div className="marquee-track">
          {ALL.map((item, i) => (
            <span key={i} className="marquee-item">
              {item}<span className="marquee-dot" />
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `web/src/components/TruthSection.jsx`**

```jsx
const CSS = `
.truth-section{background:var(--char);border-top:1px solid var(--line);padding:100px 48px;}
.truth-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.truth-stats{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.truth-stat{background:var(--black);padding:32px 36px;display:grid;grid-template-columns:80px 1fr;gap:24px;align-items:center;transition:background .25s;}
.truth-stat:hover{background:var(--mid);}
.ts-num{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--blue);line-height:1;letter-spacing:-1px;}
.ts-body{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.ts-body strong{color:var(--bone);font-weight:600;}
.sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.truth-quote{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:0.04em;color:var(--bone);line-height:1.05;margin-bottom:32px;}
.truth-quote em{font-style:normal;color:var(--blue);}
.truth-body{font-size:17px;font-weight:300;color:var(--mist);line-height:1.75;max-width:480px;margin-bottom:32px;}
.truth-note{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);border-left:2px solid var(--blue);padding-left:16px;line-height:1.7;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
.reveal-left.visible{opacity:1;transform:translateX(0);}
@media(max-width:768px){.truth-inner{grid-template-columns:1fr;gap:48px;}.truth-section{padding:60px 24px;}}
`;

const STATS = [
  ['58%', 'of UK men use zero body care products.', "Not because they don't care — because nothing was built for them."],
  ['0', 'Times the average man has cleaned his back properly.', 'The back scrub cloth exists because this area is almost universally neglected.'],
  ['3', 'Minute window after showering', 'when your skin absorbs moisture most efficiently. Most men miss it every single day.'],
  ['66', 'Days for a habit to become automatic.', 'SOLUM is designed around this number. The system is built to get you there.'],
];

export default function TruthSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="truth-section" id="truth">
        <div className="truth-inner">
          <div className="truth-text reveal-left">
            <div className="sec-tag">The Reality</div>
            <div className="truth-quote">Nobody<br />Taught<br />You <em>This.</em></div>
            <p className="truth-body">
              You were taught to shower. You weren't taught what to do in there.
              Most men use one product on their entire body and consider it done.
              The result: years of dead skin buildup, persistent dryness, back breakouts
              nobody talks about, and body odour that worsens because of accumulated dead
              cells — not just sweat.
              <br /><br />
              This isn't a grooming luxury. It's basic maintenance that was never explained.
              SOLUM is the system that should have existed twenty years ago.
            </p>
            <div className="truth-note">
              SOLUM is body care only. It does not replace your face routine, shampoo,
              or deodorant. It addresses everything else — the 90% of your skin most
              products ignore entirely.
            </div>
          </div>
          <div className="truth-stats reveal">
            {STATS.map(([num, bold, rest]) => (
              <div key={num} className="truth-stat">
                <div className="ts-num">{num}</div>
                <div className="ts-body"><strong>{bold}</strong> {rest}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Marquee.jsx web/src/components/TruthSection.jsx
git commit -m "feat: add Marquee and TruthSection components"
```

---

## Task 5: KitComparison Component (NEW)

**Files:**
- Create: `web/src/components/KitComparison.jsx`

This is the most important new section. Three-column cards. RITUAL is featured (steel blue border). SOVEREIGN is dimmed + Coming Soon. Below all cards: subscription clarification line.

- [ ] **Step 1: Create `web/src/components/KitComparison.jsx`**

```jsx
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

const CSS = `
.kits-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.kits-inner{max-width:1400px;margin:0 auto;}
.kits-header{margin-bottom:64px;}
.kits-header .sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.kits-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.kits-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.kits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.kit-card{background:var(--char);padding:40px 32px;display:flex;flex-direction:column;position:relative;}
.kit-card.featured{background:var(--mid);border:1px solid var(--blue);outline:1px solid rgba(46,109,164,0.3);margin:-1px;}
.kit-card.coming{opacity:1;}
.kit-card.coming .kit-products,.kit-card.coming .kit-prices{opacity:0.5;}
.kit-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;padding:4px 10px;margin-bottom:16px;font-weight:700;}
.kit-badge.popular{background:var(--blue);color:var(--bone);}
.kit-badge.soon{background:var(--char);color:var(--stone);border:1px solid var(--lineb);}
.kit-name{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:8px;}
.kit-tagline{font-size:15px;color:var(--stone);font-weight:300;line-height:1.5;margin-bottom:32px;}
.kit-prices{margin-bottom:32px;}
.kit-price-first{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;}
.kit-price-first-amount{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.kit-price-first-label{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.kit-price-sub{font-size:15px;color:var(--mist);font-weight:300;}
.kit-price-sub span{color:var(--blit);font-weight:500;}
.kit-divider{width:100%;height:1px;background:var(--line);margin-bottom:24px;}
.kit-products{display:flex;flex-direction:column;gap:8px;margin-bottom:32px;flex:1;}
.kit-product{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--mist);font-weight:300;}
.kit-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:24px;}
.kit-product-replacement{font-size:12px;color:var(--stone);font-style:italic;margin-top:2px;}
.kit-cta{display:block;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;text-align:center;padding:16px 24px;text-decoration:none;transition:background .2s,transform .15s;margin-top:auto;}
.kit-cta.active{background:var(--blue);color:var(--bone);}
.kit-cta.active:hover{background:var(--blit);transform:translateY(-1px);}
.kit-cta.inactive{background:var(--char);color:var(--stone);border:1px solid var(--lineb);cursor:default;}
.kits-footnote{text-align:center;margin-top:32px;font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.kits-grid{grid-template-columns:1fr;}.kits-section{padding:60px 24px;}.kit-card.featured{margin:0;}}
`;

export default function KitComparison() {
  return (
    <>
      <style>{CSS}</style>
      <section className="kits-section" id="kits">
        <div className="kits-inner">
          <div className="kits-header reveal">
            <div className="sec-tag">Choose Your Kit</div>
            <h2>Three Tiers.<br />One System.</h2>
            <p>Every kit runs the same two rituals. The difference is which products are included and how deep you go.</p>
          </div>
          <div className="kits-grid reveal">
            {KITS.map(kit => {
              const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
              const isSovereign = kit.id === 'sovereign';

              return (
                <div
                  key={kit.id}
                  className={`kit-card${kit.popular ? ' featured' : ''}${kit.comingSoon ? ' coming' : ''}`}
                >
                  {kit.popular && <span className="kit-badge popular">Most Popular</span>}
                  {kit.comingSoon && <span className="kit-badge soon">Coming Soon</span>}

                  <div className="kit-name">{kit.name}</div>
                  <div className="kit-tagline">{kit.tagline}</div>

                  <div className="kit-prices">
                    <div className="kit-price-first">
                      <span className="kit-price-first-amount">£{kit.firstBoxPrice}</span>
                      <span className="kit-price-first-label">first box</span>
                    </div>
                    <div className="kit-price-sub">
                      then <span>£{kit.monthlyPrice}/mo</span>
                      {kit.comingSoon ? ' when available' : ' · cancel any time'}
                    </div>
                  </div>

                  <div className="kit-divider" />

                  <div className="kit-products">
                    {isSovereign ? (
                      <>
                        {products.map(p => (
                          <div key={p.num} className="kit-product">
                            <span className="kit-product-num">{p.num}</span>
                            <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
                          </div>
                        ))}
                        <div className="kit-product" style={{flexDirection:'column',alignItems:'flex-start',gap:'2px',marginTop:'8px'}}>
                          <div className="kit-product-replacement">* Turkish Kese Mitt replaces Italy Towel Mitt</div>
                          <div className="kit-product-replacement">* Beidi Black Soap — both coming soon</div>
                        </div>
                      </>
                    ) : (
                      products.map(p => (
                        <div key={p.num} className="kit-product">
                          <span className="kit-product-num">{p.num}</span>
                          <span>{p.name}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {kit.comingSoon ? (
                    <span className="kit-cta inactive">Coming Soon</span>
                  ) : (
                    <a href="#" className="kit-cta active">Start with {kit.name}</a>
                  )}
                </div>
              );
            })}
          </div>
          <p className="kits-footnote">
            First box is a one-time purchase. Subscription starts with your second delivery. Cancel any time.
          </p>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/KitComparison.jsx
git commit -m "feat: add KitComparison component — GROUND/RITUAL/SOVEREIGN cards"
```

---

## Task 6: ProductLineup Component

**Files:**
- Create: `web/src/components/ProductLineup.jsx`

10 products. Products 09+10 have coming-soon treatment. SVG product illustrations carried over from current FullSite.jsx.

- [ ] **Step 1: Create `web/src/components/ProductLineup.jsx`**

The product card SVGs are inline — copy them from the current `web/src/pages/FullSite.jsx` lines 382–397. Each product is already in the PRODUCTS constant. Map over PRODUCTS and render a card for each. Coming-soon products (09, 10) use `opacity: 0.45` on the visual area and show a "SOON" badge.

```jsx
import { PRODUCTS } from '../data/products.js';

const CSS = `
.products-section{background:var(--black);padding:80px 48px;border-top:1px solid var(--line);}
.products-header{max-width:1400px;margin:0 auto 64px;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.products-header .sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.products-header .sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:0;}
.products-header .sec-body{font-size:16px;color:var(--mist);font-weight:300;line-height:1.7;}
.products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);max-width:1400px;margin:0 auto;}
.product-card{background:var(--char);padding:32px 24px;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:background .25s;}
.product-card:hover{background:var(--mid);}
.product-card.coming-soon .prod-visual{opacity:0.45;}
.prod-num{font-family:'Bebas Neue',sans-serif;font-size:56px;letter-spacing:-2px;color:rgba(46,109,164,0.1);line-height:1;margin-bottom:12px;}
.prod-origin{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);margin-bottom:8px;font-weight:600;}
.prod-name{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.35;margin-bottom:16px;}
.prod-visual{width:100%;aspect-ratio:3/4;border:1px solid var(--line);background:var(--dark);display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;overflow:hidden;transition:border-color .25s;}
.prod-visual::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(46,109,164,0.07),transparent 65%);}
.prod-visual svg{width:65%;height:65%;opacity:.75;position:relative;z-index:1;}
.prod-soon-badge{position:absolute;top:12px;left:12px;font-size:9px;letter-spacing:3px;text-transform:uppercase;background:var(--blue);color:var(--bone);padding:3px 8px;font-weight:700;z-index:2;}
.prod-body-tag{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;}
.pbt-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);flex-shrink:0;}
.pbt-text{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.prod-desc{font-size:14px;color:var(--stone);line-height:1.6;font-weight:300;margin-top:auto;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.products-grid{grid-template-columns:repeat(2,1fr);}.products-header{grid-template-columns:1fr;gap:24px;}.products-section{padding:60px 24px;}}
`;

// SVG illustrations — keyed by product number
const SVGS = {
  '01': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="50" width="44" height="90" rx="6" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="38" y="30" width="24" height="22" rx="4" stroke="#4a8fc7" strokeWidth="1.2"/><rect x="46" y="18" width="8" height="14" rx="2" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="54" y1="22" x2="70" y2="22" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="70" cy="22" r="4" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="36" y1="80" x2="64" y2="80" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="36" y1="90" x2="58" y2="90" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><rect x="34" y="100" width="32" height="2" rx="1" fill="#2e6da4" opacity="0.4"/><text x="50" y="120" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.6" letterSpacing="1">250ml</text></svg>,
  '02': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25,90 Q22,60 30,40 Q38,20 50,22 Q62,20 70,40 Q78,60 75,90 Q72,120 50,130 Q28,120 25,90Z" stroke="#4a8fc7" strokeWidth="1.5"/><line x1="35" y1="50" x2="65" y2="50" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="33" y1="62" x2="67" y2="62" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="32" y1="74" x2="68" y2="74" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="32" y1="86" x2="68" y2="86" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><line x1="33" y1="98" x2="67" y2="98" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><text x="50" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ITALY TOWEL</text></svg>,
  '03': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="42" y="15" width="16" height="20" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><rect x="42" y="125" width="16" height="20" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><rect x="35" y="33" width="30" height="94" rx="2" stroke="#4a8fc7" strokeWidth="1.5"/><line x1="35" y1="46" x2="65" y2="46" stroke="#2e6da4" strokeWidth="0.7" opacity="0.5"/><line x1="35" y1="57" x2="65" y2="57" stroke="#2e6da4" strokeWidth="0.7" opacity="0.5"/><line x1="35" y1="68" x2="65" y2="68" stroke="#2e6da4" strokeWidth="0.7" opacity="0.5"/><line x1="35" y1="79" x2="65" y2="79" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><line x1="35" y1="90" x2="65" y2="90" stroke="#2e6da4" strokeWidth="0.7" opacity="0.3"/><text x="50" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">70CM REACH</text></svg>,
  '04': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="65" r="32" stroke="#4a8fc7" strokeWidth="1.5"/><circle cx="50" cy="65" r="22" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><circle cx="50" cy="43" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="64" cy="50" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="68" cy="65" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="64" cy="80" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="50" cy="87" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="36" cy="80" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="32" cy="65" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="36" cy="50" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><rect x="44" y="97" width="12" height="34" rx="6" stroke="#4a8fc7" strokeWidth="1.3"/></svg>,
  '05': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="55" width="60" height="72" rx="4" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="18" y="42" width="64" height="16" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><line x1="28" y1="78" x2="72" y2="78" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><line x1="28" y1="91" x2="72" y2="91" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><line x1="28" y1="104" x2="72" y2="104" stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/><text x="50" y="73" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">ATLAS CLAY</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">MOROCCO</text></svg>,
  '06': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="60" width="36" height="78" rx="5" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="40" y="40" width="20" height="22" rx="3" stroke="#4a8fc7" strokeWidth="1.2"/><ellipse cx="50" cy="36" rx="10" ry="6" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="50" y1="18" x2="50" y2="30" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="50" cy="16" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><text x="50" y="80" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ARGAN</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">COLD PRESSED</text></svg>,
  '07': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M34,145 L30,60 Q30,50 50,48 Q70,50 70,60 L66,145 Z" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="38" y="36" width="24" height="14" rx="4" stroke="#4a8fc7" strokeWidth="1.3"/><line x1="32" y1="85" x2="68" y2="85" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><text x="50" y="94" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">400ml</text><text x="50" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">BODY ONLY</text></svg>,
  '08': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="38" width="56" height="84" rx="8" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="30" y="46" width="40" height="68" rx="5" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><line x1="30" y1="58" x2="70" y2="58" stroke="#2e6da4" strokeWidth="0.6" opacity="0.45"/><line x1="30" y1="70" x2="70" y2="70" stroke="#2e6da4" strokeWidth="0.6" opacity="0.4"/><line x1="30" y1="82" x2="70" y2="82" stroke="#2e6da4" strokeWidth="0.6" opacity="0.35"/><line x1="30" y1="94" x2="70" y2="94" stroke="#2e6da4" strokeWidth="0.6" opacity="0.3"/><text x="50" y="30" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">BAMBOO</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ULTRA SOFT</text></svg>,
  '09': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25,90 Q22,60 30,40 Q38,20 50,22 Q62,20 70,40 Q78,60 75,90 Q72,120 50,130 Q28,120 25,90Z" stroke="#4a8fc7" strokeWidth="1.5" strokeDasharray="4 2"/><text x="50" y="85" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.5" letterSpacing="1">ARTISAN</text><text x="50" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.5" letterSpacing="1">TURKEY</text></svg>,
  '10': <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="48" width="44" height="64" rx="4" stroke="#4a8fc7" strokeWidth="1.5" strokeDasharray="4 2"/><text x="50" y="85" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.5" letterSpacing="1">BLACK SOAP</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.5" letterSpacing="1">TURKEY</text></svg>,
};

export default function ProductLineup() {
  return (
    <>
      <style>{CSS}</style>
      <section className="products-section" id="products">
        <div className="products-header reveal">
          <div>
            <div className="sec-tag">The Products</div>
            <h2 className="sec-title">Ten Products.<br />One Body System.</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <p className="sec-body">
              Each product is numbered 01–10 and used in sequence. All ten address the body — not the face.
              Sourced from the country that does each tradition best. Products 09 and 10 are coming soon.
            </p>
          </div>
        </div>
        <div className="products-grid reveal">
          {PRODUCTS.map(p => (
            <div key={p.num} className={`product-card${p.comingSoon ? ' coming-soon' : ''}`}>
              <div className="prod-num">{p.num}</div>
              <div className="prod-origin">{p.origin}</div>
              <div className="prod-name">{p.name}</div>
              <div className="prod-visual">
                {p.comingSoon && <div className="prod-soon-badge">Soon</div>}
                {SVGS[p.num]}
              </div>
              <div className="prod-body-tag">
                <div className="pbt-dot" />
                <span className="pbt-text">{p.tag}</span>
              </div>
              <div className="prod-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ProductLineup.jsx
git commit -m "feat: add ProductLineup component — 10 products with coming-soon treatment"
```

---

## Task 7: RitualSection Component

**Files:**
- Create: `web/src/components/RitualSection.jsx`

Two-tab layout: Daily (10 min) and Weekly (18 min). Italy Towel Mitt only appears in the Weekly tab with the weekend-only note. Interactive step list with visual canvas on the right.

- [ ] **Step 1: Create `web/src/components/RitualSection.jsx`**

```jsx
import { useState, useEffect, useRef } from 'react';
import { DAILY_STEPS, WEEKLY_STEPS } from '../data/rituals.js';

const CSS = `
.ritual-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.ritual-inner{max-width:1400px;margin:0 auto;}
.ritual-tabs{display:flex;gap:0;margin-bottom:48px;border-bottom:1px solid var(--lineb);}
.ritual-tab{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);padding:12px 24px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .2s,border-color .2s;background:none;border-top:none;border-left:none;border-right:none;}
.ritual-tab:hover{color:var(--bone);}
.ritual-tab.active{color:var(--bone);border-bottom-color:var(--blue);}
.ritual-content{display:grid;grid-template-columns:400px 1fr;gap:80px;}
.ritual-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:12px;}
.ritual-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,56px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:12px;}
.ritual-subtitle{font-size:15px;color:var(--stone);font-weight:300;margin-bottom:32px;line-height:1.6;}
.ritual-steps{display:flex;flex-direction:column;gap:0;}
.ritual-step{display:grid;grid-template-columns:52px 1fr;gap:20px;padding:20px 0;border-bottom:1px solid var(--line);opacity:.5;transition:opacity .3s;cursor:pointer;}
.ritual-step.active{opacity:1;}
.ritual-step:hover{opacity:1;}
.step-num{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.05em;color:var(--blue);line-height:1;padding-top:2px;}
.step-info{display:flex;flex-direction:column;gap:4px;}
.step-title{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.step-time{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.step-desc{font-size:14px;color:var(--mist);font-weight:300;line-height:1.55;margin-top:4px;}
.step-warning{font-size:12px;color:#c9a044;letter-spacing:1px;margin-top:4px;font-style:italic;}
.ritual-visual{position:relative;display:flex;align-items:center;justify-content:center;}
.ritual-canvas{width:100%;aspect-ratio:1;background:var(--dark);border:1px solid var(--lineb);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.ritual-canvas::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(46,109,164,0.1),transparent 60%);}
.ritual-big-num{font-family:'Bebas Neue',sans-serif;font-size:220px;line-height:1;letter-spacing:-6px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.12);user-select:none;pointer-events:none;position:absolute;}
.ritual-step-name{position:absolute;bottom:32px;left:0;right:0;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;color:rgba(240,236,226,.7);}
.ritual-timer{position:absolute;top:24px;right:28px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);}
.ritual-zone{position:absolute;top:24px;left:28px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
.reveal-left.visible{opacity:1;transform:translateX(0);}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.ritual-content{grid-template-columns:1fr;}.ritual-visual{display:none;}.ritual-section{padding:60px 24px;}}
`;

export default function RitualSection() {
  const [activeTab, setActiveTab] = useState('daily');
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef(null);

  const steps = activeTab === 'daily' ? DAILY_STEPS : WEEKLY_STEPS;

  useEffect(() => {
    setActiveStep(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % steps.length);
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, [activeTab]); // steps is fully determined by activeTab — no extra dep needed

  const handleStepClick = (i) => {
    clearInterval(timerRef.current);
    setActiveStep(i);
    timerRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % steps.length);
    }, 3200);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveStep(0);
  };

  const step = steps[activeStep];

  return (
    <>
      <style>{CSS}</style>
      <section className="ritual-section" id="ritual">
        <div className="ritual-inner">
          <div className="ritual-tabs">
            <button
              className={`ritual-tab${activeTab === 'daily' ? ' active' : ''}`}
              onClick={() => handleTabChange('daily')}
            >
              Daily · 10 Min
            </button>
            <button
              className={`ritual-tab${activeTab === 'weekly' ? ' active' : ''}`}
              onClick={() => handleTabChange('weekly')}
            >
              Weekly · 18 Min
            </button>
          </div>

          <div className="ritual-content">
            <div className="reveal-left">
              <div className="ritual-eyebrow">The Ritual</div>
              {activeTab === 'daily' ? (
                <>
                  <div className="ritual-title">10 Minutes.<br />Every Shower.</div>
                  <p className="ritual-subtitle">All five steps happen in the shower you're already taking. Follow the numbers.</p>
                </>
              ) : (
                <>
                  <div className="ritual-title">18 Minutes.<br />Every Week.</div>
                  <p className="ritual-subtitle">Replace your daily ritual once a week. Goes deeper. Covers everything the daily doesn't.</p>
                </>
              )}
              <div className="ritual-steps">
                {steps.map((s, i) => (
                  <div
                    key={i}
                    className={`ritual-step${activeStep === i ? ' active' : ''}`}
                    onClick={() => handleStepClick(i)}
                  >
                    <div className="step-num">{s.num}</div>
                    <div className="step-info">
                      <div className="step-title">{s.name}</div>
                      <div className="step-time">{s.time} · {s.zone}</div>
                      <div className="step-desc">{s.desc}</div>
                      {s.num === '02' && (
                        <div className="step-warning">Weekend use only — viscose rayon is too aggressive for daily use.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ritual-visual reveal">
              <div className="ritual-canvas">
                <div className="ritual-big-num">{step.num}</div>
                <div className="ritual-zone">{step.zone}</div>
                <div className="ritual-step-name">{step.name}</div>
                <div className="ritual-timer">{step.time}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/RitualSection.jsx
git commit -m "feat: add RitualSection — two-tab daily/weekly with correct steps"
```

---

## Task 8: SubscriptionSection Component (NEW)

**Files:**
- Create: `web/src/components/SubscriptionSection.jsx`

Replaces the old pricing section. Shows what ships and when, with three-tier pricing.

- [ ] **Step 1: Create `web/src/components/SubscriptionSection.jsx`**

```jsx
const CSS = `
.sub-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.sub-inner{max-width:1400px;margin:0 auto;}
.sub-header{margin-bottom:64px;}
.sub-header .sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.sub-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.sub-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.cadence-list{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.cadence-item{background:var(--char);padding:32px 36px;}
.cadence-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:8px;}
.cadence-products{font-size:16px;color:var(--bone);font-weight:500;margin-bottom:8px;line-height:1.4;}
.cadence-products .ritual-plus{font-size:12px;color:var(--stone);font-weight:300;}
.cadence-copy{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.pricing-panel{display:flex;flex-direction:column;gap:0;}
.pricing-panel-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.06em;color:var(--bone);margin-bottom:24px;}
.price-rows{display:flex;flex-direction:column;gap:1px;background:var(--line);margin-bottom:32px;}
.price-row-item{background:var(--char);padding:24px 28px;display:flex;justify-content:space-between;align-items:center;}
.price-row-item.coming .price-row-kit,.price-row-item.coming .price-row-amount{opacity:0.5;}
.price-row-kit{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.price-row-amount{font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--bone);letter-spacing:-.5px;}
.price-row-note{font-size:12px;color:var(--stone);font-weight:300;margin-top:2px;text-align:right;}
.sub-footnote{font-size:15px;color:var(--stone);font-weight:300;line-height:1.7;border-left:2px solid var(--blue);padding-left:20px;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.sub-grid{grid-template-columns:1fr;gap:48px;}.sub-section{padding:60px 24px;}}
`;

const CADENCE = [
  {
    label: 'Every Month',
    products: 'Body Wash · Body Lotion · Bamboo Cloth',
    copy: 'The daily essentials. Always there when you need them.',
  },
  {
    label: 'Every 3 Months',
    products: 'Italy Towel Mitt · Back Scrub Cloth · Atlas Clay',
    note: '+ Argan Oil (RITUAL and SOVEREIGN)',
    copy: 'The tools and weekly ritual products. Refreshed before they degrade.',
  },
  {
    label: 'Every 6 Months',
    products: 'Scalp Massager',
    copy: 'Silicone nubs wear down. A fresh one ships automatically.',
  },
];

const PRICES = [
  { name: 'GROUND', amount: '£38/mo', comingSoon: false },
  { name: 'RITUAL', amount: '£48/mo', comingSoon: false },
  { name: 'SOVEREIGN', amount: '£58/mo', comingSoon: true },
];

export default function SubscriptionSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="sub-section" id="subscription">
        <div className="sub-inner">
          <div className="sub-header reveal">
            <div className="sec-tag">The Subscription</div>
            <h2>Your System<br />On Autopilot.</h2>
            <p>
              Pay once for your kit. After that, only what runs out arrives at your door.
              Flat monthly price — regardless of which box ships that month.
            </p>
          </div>
          <div className="sub-grid">
            <div className="cadence-list reveal">
              {CADENCE.map(c => (
                <div key={c.label} className="cadence-item">
                  <div className="cadence-label">{c.label}</div>
                  <div className="cadence-products">
                    {c.products}
                    {c.note && <span className="ritual-plus"> · {c.note}</span>}
                  </div>
                  <div className="cadence-copy">{c.copy}</div>
                </div>
              ))}
            </div>
            <div className="pricing-panel reveal">
              <div className="pricing-panel-title">Monthly Price</div>
              <div className="price-rows">
                {PRICES.map(p => (
                  <div key={p.name} className={`price-row-item${p.comingSoon ? ' coming' : ''}`}>
                    <div>
                      <div className="price-row-kit">{p.name}</div>
                      {p.comingSoon && <div className="price-row-note">Coming soon</div>}
                    </div>
                    <div className="price-row-amount">{p.amount}</div>
                  </div>
                ))}
              </div>
              <div className="sub-footnote">
                First box is a one-time purchase. Subscription starts with your second delivery.
                Cancel any time — no penalty, no phone calls.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/SubscriptionSection.jsx
git commit -m "feat: add SubscriptionSection — cadence explainer + three-tier pricing"
```

---

## Task 9: Remaining Components (ProvenanceSection, SocialProof, FAQ, CTASection, SolumFooter)

**Files:**
- Create: `web/src/components/ProvenanceSection.jsx`
- Create: `web/src/components/SocialProof.jsx`
- Create: `web/src/components/FAQ.jsx`
- Create: `web/src/components/CTASection.jsx`
- Create: `web/src/components/SolumFooter.jsx`

- [ ] **Step 1: Create `web/src/components/ProvenanceSection.jsx`**

Origins: UK · Korea · Morocco only. No Turkey tile (Product 09 coming soon). Carry over CSS and markup from current FullSite.jsx `origins` section, removing the Turkey tile.

```jsx
const CSS = `
.origins{background:var(--black);border-top:1px solid var(--line);padding:80px 48px;}
.origins-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.origins-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);}
.origin-tile{background:var(--char);padding:28px 22px;display:flex;flex-direction:column;gap:8px;transition:background .25s;position:relative;overflow:hidden;}
.origin-tile::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--blue);transform:scaleX(0);transform-origin:left;transition:transform .3s ease;}
.origin-tile:hover{background:var(--mid);}
.origin-tile:hover::after{transform:scaleX(1);}
.origin-flag{font-size:20px;margin-bottom:2px;}
.origin-country{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.origin-product{font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.3;}
.origin-why{font-size:14px;color:var(--stone);line-height:1.5;font-weight:300;margin-top:4px;}
.sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:24px;}
.sec-body{font-size:16px;color:var(--mist);font-weight:300;line-height:1.7;max-width:480px;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
.reveal-left.visible{opacity:1;transform:translateX(0);}
@media(max-width:768px){.origins-inner{grid-template-columns:1fr;gap:40px;}.origins-grid{grid-template-columns:1fr;}.origins{padding:60px 24px;}}
`;

const ORIGINS = [
  {
    flag: '🇬🇧',
    country: 'United Kingdom',
    product: 'Body Wash · Body Lotion',
    why: 'Cosmetics manufactured to UK Responsible Person standard. Amino acid surfactants formulated by Cosmiko.',
  },
  {
    flag: '🇰🇷',
    country: 'Korean Tradition',
    product: 'Italy Towel · Back Scrub · Scalp Massager',
    why: 'Korean bathhouse (jjimjilbang) culture developed exfoliation techniques refined over 60 years. The viscose mitt and back cloth are direct descendants.',
  },
  {
    flag: '🇲🇦',
    country: 'Morocco',
    product: 'Atlas Clay · Argan Body Oil',
    why: 'Moroccan hammam clay and argan oil sourced directly. Atlas mountains rhassoul clay has been used for deep cleansing for over 1,000 years.',
  },
];

export default function ProvenanceSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="origins" id="origins">
        <div className="origins-inner">
          <div className="reveal-left">
            <div className="sec-tag">Where It Comes From</div>
            <h2 className="sec-title">Sourced From<br />Where It Works.</h2>
            <p className="sec-body">
              Each tradition is proof of why the product works — not where it ships from.
              Korean bathhouse exfoliation. Moroccan hammam clay. British pharmaceutical-grade formulation.
            </p>
          </div>
          <div className="origins-grid reveal">
            {ORIGINS.map(o => (
              <div key={o.country} className="origin-tile">
                <div className="origin-flag">{o.flag}</div>
                <div className="origin-country">{o.country}</div>
                <div className="origin-product">{o.product}</div>
                <div className="origin-why">{o.why}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Create `web/src/components/SocialProof.jsx`**

Carry proof cards from current FullSite.jsx. No content changes — extract as-is.

```jsx
const CSS = `
.proof-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.proof-inner{max-width:1400px;margin:0 auto;}
.proof-header{margin-bottom:64px;}
.proof-header .sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.proof-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.proof-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);}
.proof-card{background:var(--black);padding:40px 32px;display:flex;flex-direction:column;gap:16px;}
.proof-stars{color:var(--blue);font-size:16px;letter-spacing:2px;}
.proof-quote{font-size:16px;font-weight:300;color:var(--mist);line-height:1.7;font-style:italic;}
.proof-author{display:flex;flex-direction:column;gap:3px;margin-top:auto;padding-top:16px;border-top:1px solid var(--line);}
.proof-name{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.proof-info{font-size:13px;color:var(--stone);letter-spacing:1px;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.proof-grid{grid-template-columns:1fr;}.proof-section{padding:60px 24px;}}
`;

const REVIEWS = [
  {
    quote: "Week one. Back. I'd never properly cleaned it once in my life. The difference after one session was embarrassing.",
    name: 'James T.',
    info: 'RITUAL subscriber · Month 4',
  },
  {
    quote: "I used to think body lotion was for women. Turns out I was just not doing basic maintenance. The 3-minute rule changed everything.",
    name: 'Marcus R.',
    info: 'GROUND subscriber · Month 2',
  },
  {
    quote: "The ritual card is brilliant. It tells you exactly what to do and for how long. There's nothing to figure out.",
    name: 'Daniel K.',
    info: 'RITUAL subscriber · Month 6',
  },
];

export default function SocialProof() {
  return (
    <>
      <style>{CSS}</style>
      <section className="proof-section">
        <div className="proof-inner">
          <div className="proof-header reveal">
            <div className="sec-tag">Here's What Actually Happens When You Do It Right</div>
            <h2>The Results<br />Speak Plainly.</h2>
          </div>
          <div className="proof-grid reveal">
            {REVIEWS.map(r => (
              <div key={r.name} className="proof-card">
                <div className="proof-stars">★★★★★</div>
                <p className="proof-quote">"{r.quote}"</p>
                <div className="proof-author">
                  <div className="proof-name">{r.name}</div>
                  <div className="proof-info">{r.info}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Create `web/src/components/FAQ.jsx`**

Updated with new kit names and pricing. Accordion interaction preserved.

```jsx
import { useState } from 'react';

const CSS = `
.faq-section{background:var(--black);padding:80px 48px;border-top:1px solid var(--line);}
.faq-inner{max-width:900px;margin:0 auto;}
.faq-header{margin-bottom:48px;}
.faq-header .sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.faq-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.faq-item{border-bottom:1px solid var(--line);}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:24px 0;cursor:pointer;font-size:16px;letter-spacing:1px;color:var(--bone);font-weight:500;background:none;border:none;width:100%;text-align:left;}
.faq-q:hover{color:var(--blit);}
.faq-toggle{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--blue);flex-shrink:0;margin-left:20px;transition:transform .25s;}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease,padding .35s;font-size:15px;color:var(--mist);font-weight:300;line-height:1.75;padding:0;}
.faq-item.open .faq-toggle{transform:rotate(45deg);}
.faq-item.open .faq-a{max-height:300px;padding-bottom:24px;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.faq-section{padding:60px 24px;}}
`;

const FAQS = [
  {
    q: 'Am I paying the full kit price every month?',
    a: 'No. The first box price (£55 for GROUND, £85 for RITUAL) is a one-time payment that includes physical tools lasting 6–12 months. After that, you pay £38 or £48/month for consumables only — body wash, lotion, bamboo cloth, and the tools that refresh on a quarterly or 6-monthly cycle. You never pay the setup price again.',
  },
  {
    q: 'What is the difference between GROUND and RITUAL?',
    a: 'GROUND has 7 products and covers the full daily and weekly ritual. RITUAL adds Argan Body Oil — a leave-on treatment applied after the weekly exfoliation that replaces your lotion on those days. If you want the complete system, RITUAL is the one.',
  },
  {
    q: 'What about SOVEREIGN?',
    a: 'SOVEREIGN replaces the Italy Towel Mitt with a hand-woven Turkish Kese Mitt from Istanbul, and adds Beidi Black Soap. It is the artisan tier — listed on site but not yet available to order. We will notify the early access list when it ships.',
  },
  {
    q: 'Is this for my face or my body?',
    a: 'Your body. Entirely. SOLUM is the first serious body care system for men — it does not replace your face routine, shampoo, or deodorant. It addresses skin from your neck down: exfoliation, back care, scalp health, and daily moisturisation. The 90% of your skin that most products ignore.',
  },
  {
    q: 'Why does it matter that I use the lotion within 3 minutes?',
    a: "Immediately after showering, your skin is warm and the outer layer is still hydrated. Moisture absorption is significantly higher during this window. Wait 15 minutes and you've largely missed it — the lotion sits on top rather than absorbing. The 3-minute rule is dermatology, not marketing.",
  },
  {
    q: 'Can I cancel or pause my subscription?',
    a: "Yes. Any time. One click. No penalty, no phone calls, no retention flows designed to confuse you. Skip a month if you're travelling. Pause indefinitely. We'd rather you come back when you're ready than resent us for charging you when you don't need it.",
  },
  {
    q: 'Does it work as a gift?',
    a: 'The RITUAL kit is ideal for gifting. Rigid matte black box, steel blue foil strip, ribbon pull, ritual card face-up. You can choose whether to include a subscription with it or let the recipient decide after they have tried it.',
  },
];

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggle = (i) => setOpenFaq(openFaq === i ? null : i);

  return (
    <>
      <style>{CSS}</style>
      <section className="faq-section">
        <div className="faq-inner">
          <div className="faq-header reveal">
            <div className="sec-tag">Questions</div>
            <h2>Common<br />Questions.</h2>
          </div>
          {FAQS.map((f, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
              <button className="faq-q" onClick={() => toggle(i)}>
                {f.q}
                <span className="faq-toggle">+</span>
              </button>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Create `web/src/components/CTASection.jsx`**

```jsx
const CSS = `
.cta-section{background:var(--char);border-top:1px solid var(--lineb);text-align:center;padding:140px 48px;position:relative;overflow:hidden;}
.cta-section::before{content:'SOLUM';pointer-events:none;user-select:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Bebas Neue',sans-serif;font-size:clamp(200px,28vw,380px);letter-spacing:-4px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.04);white-space:nowrap;}
.cta-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);margin-bottom:24px;position:relative;}
.cta-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,6vw,96px);letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:24px;position:relative;}
.cta-body{font-size:17px;color:var(--stone);font-weight:300;max-width:480px;margin:0 auto 16px;line-height:1.7;position:relative;}
.cta-offer{font-size:15px;color:var(--blue);font-weight:500;margin-bottom:48px;position:relative;letter-spacing:1px;}
.cta-btns{display:flex;justify-content:center;gap:16px;position:relative;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--blue);color:var(--bone);padding:16px 40px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;}
.btn-primary:hover{background:var(--blit);transform:translateY(-1px);}
.btn-ghost{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;}
.btn-ghost:hover{color:var(--bone);border-color:var(--blue);}
@media(max-width:768px){.cta-section{padding:80px 24px;}.cta-btns{flex-direction:column;align-items:center;}}
`;

export default function CTASection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="cta-section">
        <div className="cta-tag">Your Body. Done Right.</div>
        <h2 className="cta-title">Start Your<br />Ritual.</h2>
        <p className="cta-body">
          The system that should have existed twenty years ago. It exists now.
        </p>
        <div className="cta-offer">
          Sign up now → 20% off your first box at launch · GROUND from £44 · RITUAL from £68
        </div>
        <div className="cta-btns">
          <a href="#kits" className="btn-primary">Choose Your Kit</a>
          <a href="#truth" className="btn-ghost">Why It Matters</a>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 5: Create `web/src/components/SolumFooter.jsx`**

```jsx
const CSS = `
footer.solum-footer{background:var(--black);border-top:1px solid var(--line);padding:56px 48px 32px;}
.footer-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;}
.footer-logo{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.18em;color:var(--bone);margin-bottom:10px;display:block;}
.footer-tagline{font-size:13px;color:var(--stone);letter-spacing:2px;font-style:italic;margin-bottom:8px;}
.footer-scope{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.footer-col-title{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:20px;}
.footer-links{display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0;}
.footer-links a{font-size:14px;color:var(--stone);text-decoration:none;letter-spacing:.5px;transition:color .2s;}
.footer-links a:hover{color:var(--bone);}
.footer-bottom{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:24px;font-size:13px;color:var(--stone);letter-spacing:2px;}
@media(max-width:768px){.footer-inner{grid-template-columns:1fr 1fr;gap:32px;}.solum-footer{padding:40px 24px 24px;}.footer-bottom{flex-direction:column;gap:12px;text-align:center;}}
`;

export default function SolumFooter() {
  return (
    <>
      <style>{CSS}</style>
      <footer className="solum-footer">
        <div className="footer-inner">
          <div>
            <span className="footer-logo">SOLUM</span>
            <div className="footer-tagline">Your body. Done right.</div>
            <div className="footer-scope">Body Care · Men</div>
          </div>
          <div>
            <div className="footer-col-title">The System</div>
            <ul className="footer-links">
              <li><a href="#kits">Choose Your Kit</a></li>
              <li><a href="#products">The Products</a></li>
              <li><a href="#ritual">The Ritual</a></li>
              <li><a href="#subscription">Subscription</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">The Brand</div>
            <ul className="footer-links">
              <li><a href="#truth">Why SOLUM</a></li>
              <li><a href="#origins">Where It's From</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Contact</div>
            <ul className="footer-links">
              <li><a href="mailto:harsha@pricedab.com">harsha@pricedab.com</a></li>
              <li><a href="https://bysolum.co.uk">bysolum.co.uk</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SOLUM · bysolum.co.uk</span>
          <span>Body Care · Not Face. Not Hair.</span>
        </div>
      </footer>
    </>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/
git commit -m "feat: add ProvenanceSection, SocialProof, FAQ, CTASection, SolumFooter"
```

---

## Task 10: Rewrite FullSite.jsx as Orchestrator

**Files:**
- Modify: `web/src/pages/FullSite.jsx` (full rewrite)

- [ ] **Step 1: Rewrite `web/src/pages/FullSite.jsx`**

```jsx
import { useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Marquee from '../components/Marquee.jsx';
import TruthSection from '../components/TruthSection.jsx';
import KitComparison from '../components/KitComparison.jsx';
import ProductLineup from '../components/ProductLineup.jsx';
import RitualSection from '../components/RitualSection.jsx';
import SubscriptionSection from '../components/SubscriptionSection.jsx';
import ProvenanceSection from '../components/ProvenanceSection.jsx';
import SocialProof from '../components/SocialProof.jsx';
import FAQ from '../components/FAQ.jsx';
import CTASection from '../components/CTASection.jsx';
import SolumFooter from '../components/SolumFooter.jsx';

export default function FullSite() {
  // Scroll reveal — watches all .reveal and .reveal-left elements
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    // Observe after a tick to allow components to mount
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal,.reveal-left').forEach(el => obs.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, []);

  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <TruthSection />
      <KitComparison />
      <ProductLineup />
      <RitualSection />
      <SubscriptionSection />
      <ProvenanceSection />
      <SocialProof />
      <FAQ />
      <CTASection />
      <SolumFooter />
    </>
  );
}
```

- [ ] **Step 2: Run build and confirm success**

```bash
cd web && npm run build
```
Expected: exit 0, no TypeScript or import errors. If there are missing import errors, check that all component files were created in previous tasks.

- [ ] **Step 3: Run dev server and visually verify**

```bash
cd web && npm run dev
```

Open `http://localhost:5173/full` in a browser and verify:
- [ ] Hero H1 reads "You Shower Every Day. / Your Body Is Still Dirty."
- [ ] Eyebrow reads "Men shower. Men don't actually clean."
- [ ] Kit comparison section shows GROUND / RITUAL / SOVEREIGN cards
- [ ] SOVEREIGN card is dimmed with "Coming Soon" badge, no buy button
- [ ] RITUAL card has "Most Popular" badge + blue border
- [ ] Products section shows 10 products — 09 and 10 have "SOON" badge
- [ ] Ritual section has two tabs: Daily and Weekly
- [ ] Italy Towel Mitt does NOT appear in the Daily tab
- [ ] Italy Towel Mitt DOES appear in the Weekly tab with "Weekend use only" warning
- [ ] Subscription section shows three cadence rows + three pricing rows
- [ ] Provenance section shows UK · Korea · Morocco (no Turkey)
- [ ] FAQ uses GROUND/RITUAL/SOVEREIGN names and new pricing (£55/£85, £38/£48)
- [ ] CTA says "first box" not "first kit"
- [ ] No references to "Basic", "Full", "World Kit", "Daily Starter", "Full Ritual"
- [ ] All body text is legible (min 14px, sufficient contrast)
- [ ] Mobile (resize to 375px): all sections stack to single column

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/FullSite.jsx
git commit -m "feat: rewrite FullSite.jsx as thin orchestrator — modular components"
```

---

## Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the product lineup section in `CLAUDE.md`**

Find the `## 2. PRODUCT LINEUP — 8 PRODUCTS` section. Update the table header to "10 PRODUCTS" and add the two new rows:

```markdown
| 09  | Turkish Kese Mitt (artisan hand-woven)     | Turkey (artisan) | TBD        | TBD | TBD          |
| 10  | Beidi Black Soap                           | Turkey            | TBD        | TBD | TBD          |
```

Also update the note below the table to clarify:
- Product 08 = Bamboo Cloth (not Kese Mitt)
- Products 09 + 10 are coming soon, SOVEREIGN only

Update the `## 4. KIT SYSTEM & PRICING` section to reflect new kit names:
- "Daily Starter" → "GROUND" (£55 / £38mo)
- "Full Ritual ★" → "RITUAL ★" (£85 / £48mo)
- "World Kit" → "SOVEREIGN" (£130 / £58mo, Coming Soon)

- [ ] **Step 2: Verify build still passes**

```bash
cd web && npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — product 08 = Bamboo Cloth, add 09+10, new kit names"
```

---

## Final Verification

- [ ] `cd web && npm run build` — exits 0, no errors
- [ ] `cd web && npm run lint` — no blocking errors
- [ ] Visual check at `http://localhost:5173/full` — all 13 verification items above pass
- [ ] `ComingSoon.jsx` is unchanged — verify with `git diff HEAD web/src/pages/ComingSoon.jsx` (should show no changes)
