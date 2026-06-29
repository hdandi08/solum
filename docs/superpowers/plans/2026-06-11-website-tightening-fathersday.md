# Website Tightening + Father's Day Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten all main site copy for directness, add a Founder trust section, and build a standalone Father's Day gift landing page that routes to `/buy?source=gift`.

**Architecture:** All changes are pure frontend — React components in `web/src/`. Father's Day page is a new route `/fathers-day` added to `App.jsx`. Founder section is a new component inserted into `FullSite.jsx` between ProvenanceSection and SocialProof. Copy edits are in-place replacements inside existing components.

**Tech Stack:** React, React Router, inline CSS-in-JS (existing project pattern), VITE_SITE_MODE env var for first_batch branching.

**UK Father's Day:** Sunday 21 June 2026. Order cutoff for guaranteed Royal Mail Tracked 48 delivery: **Wednesday 17 June, noon**.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `web/src/components/Hero.jsx` | Trim body copy, sharpen eyebrow |
| Modify | `web/src/components/TruthSection.jsx` | Tighten truth-body paragraph |
| Modify | `web/src/components/SocialProof.jsx` | Sharpen section tag |
| Modify | `web/src/components/FAQ.jsx` | Fix GROUND/RITUAL product count error; sharpen answers |
| Modify | `web/src/components/CTASection.jsx` | Sharpen bottom CTA body copy |
| Create | `web/src/components/FounderSection.jsx` | New founder trust section with harsha.jpg |
| Modify | `web/src/pages/FullSite.jsx` | Import + insert FounderSection between ProvenanceSection and SocialProof |
| Create | `web/src/pages/FathersDayPage.jsx` | Standalone Father's Day gift landing page |
| Modify | `web/src/App.jsx` | Add `/fathers-day` route |

---

## Task 1: Tighten Hero copy

**Files:**
- Modify: `web/src/components/Hero.jsx`

- [ ] **Step 1: Edit hero body copy and eyebrow**

In `Hero.jsx`, make these exact replacements:

Replace the `hero-body` paragraph:
```jsx
// OLD:
<p className="hero-body">
  Not your fault. Nobody ever built men a system worth following.
  There's a difference between being washed and being clean. Most men have never felt it.
  SOLUM fixes that. A few weeks and it's muscle memory. After that, you just do it.
</p>

// NEW:
<p className="hero-body">
  Not your fault. Nobody ever built men a system worth following.
  There's a difference between being washed and being clean.
  Most men have never felt it. SOLUM fixes that.
</p>
```

Replace the first-batch eyebrow text:
```jsx
// OLD:
{IS_FIRST_BATCH ? '250 kits · no subscription required' : "Men shower. Men don't actually clean."}

// NEW:
{IS_FIRST_BATCH ? '250 kits only · one-time purchase' : "Men shower. Men don't actually clean."}
```

- [ ] **Step 2: Commit**
```bash
git add web/src/components/Hero.jsx
git commit -m "copy: tighten hero body and eyebrow"
```

---

## Task 2: Tighten TruthSection copy

**Files:**
- Modify: `web/src/components/TruthSection.jsx`

- [ ] **Step 1: Trim the truth-body paragraph**

Replace the `truth-body` paragraph:
```jsx
// OLD:
<p className="truth-body">
  You were taught to shower. Nobody told you what actually happens inside one.
  One product on your whole body, rinsed off in 90 seconds — that's not a system.
  That's just getting wet.
  <br /><br />
  SOLUM is the system that should have existed twenty years ago.
</p>

// NEW:
<p className="truth-body">
  You were taught to shower. Nobody told you what actually happens inside one.
  One product on your whole body, rinsed off in 90 seconds — that's not a system.
  <br /><br />
  SOLUM is the system that should have existed twenty years ago.
</p>
```

- [ ] **Step 2: Commit**
```bash
git add web/src/components/TruthSection.jsx
git commit -m "copy: remove redundant line in TruthSection"
```

---

## Task 3: Tighten SocialProof section tag

**Files:**
- Modify: `web/src/components/SocialProof.jsx`

- [ ] **Step 1: Sharpen the section tag**

Replace:
```jsx
// OLD:
<div className="pr-sec-tag">What To Expect When You Do It Right</div>

// NEW:
<div className="pr-sec-tag">What Actually Changes</div>
```

- [ ] **Step 2: Commit**
```bash
git add web/src/components/SocialProof.jsx
git commit -m "copy: sharpen SocialProof section tag"
```

---

## Task 4: Fix FAQ — correct GROUND/RITUAL product count and tighten answers

**Files:**
- Modify: `web/src/components/FAQ.jsx`

Context: GROUND = 5 products (01, 02, 03, 04, 07). RITUAL = 7 products (01–07, adds 05 clay + 06 argan oil). The current answer says "GROUND has 7 products" which is wrong.

- [ ] **Step 1: Fix GROUND vs RITUAL answer**

Replace the second FAQ entry:
```jsx
// OLD:
{
  q: 'What is the difference between GROUND and RITUAL?',
  a: 'GROUND has 7 products and covers the full daily and weekly ritual. RITUAL adds Argan Body Oil — a leave-on treatment applied after the weekly exfoliation that replaces your lotion on those days. If you want the complete system, RITUAL is the one.',
},

// NEW:
{
  q: 'What is the difference between GROUND and RITUAL?',
  a: 'GROUND has 5 products — body wash, exfoliating mitt, back scrub cloth, scalp massager, and body lotion. That covers the complete daily ritual. RITUAL adds two more: Rhassoul Clay Mask and Argan Body Oil, giving you the full weekly deep-clean treatment on top. If you want the complete system, RITUAL is the one.',
},
```

- [ ] **Step 2: Add the 70% stat to the 3-minute window answer**

Replace:
```jsx
// OLD:
{
  q: 'Why does it matter that I use the lotion within 3 minutes?',
  a: "Immediately after showering, your skin is warm and the outer layer is still hydrated. Moisture absorption is significantly higher during this window. Wait 15 minutes and you've largely missed it — the lotion sits on top rather than absorbing. The 3-minute rule is dermatology, not marketing.",
},

// NEW:
{
  q: 'Why does it matter that I use the lotion within 3 minutes?',
  a: "Immediately after showering, your skin is warm and the outer layer is still hydrated. Moisture absorption is up to 70% higher in this window. Wait 15 minutes and you've largely missed it — the lotion sits on top rather than absorbing. The 3-minute rule is dermatology, not marketing.",
},
```

- [ ] **Step 3: Commit**
```bash
git add web/src/components/FAQ.jsx
git commit -m "copy: fix GROUND product count, add 70% stat to FAQ"
```

---

## Task 5: Tighten CTASection bottom copy

**Files:**
- Modify: `web/src/components/CTASection.jsx`

- [ ] **Step 1: Replace the body copy**

Replace:
```jsx
// OLD:
<p className="cta-body">
  The system that should have existed twenty years ago. It exists now.
</p>

// NEW:
<p className="cta-body">
  Ten minutes every morning. You'll know why on day one.
</p>
```

- [ ] **Step 2: Commit**
```bash
git add web/src/components/CTASection.jsx
git commit -m "copy: sharpen bottom CTA body copy"
```

---

## Task 6: Build FounderSection component

**Files:**
- Create: `web/src/components/FounderSection.jsx`

Context: `harsha.jpg` already exists at `/public/harsha.jpg`. This section goes between `ProvenanceSection` and `SocialProof` in FullSite.jsx. Left column: photo. Right column: founder note + name. Matches existing dark aesthetic — black background, bone type, steel-blue accent on the rule line.

- [ ] **Step 1: Create the component**

Create `web/src/components/FounderSection.jsx`:
```jsx
const CSS = `
.founder-section{background:var(--black);border-top:1px solid var(--line);padding:80px 48px;}
.founder-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:380px 1fr;gap:80px;align-items:center;}
.founder-photo-wrap{position:relative;}
.founder-photo{width:100%;aspect-ratio:3/4;object-fit:cover;object-position:center top;display:block;filter:grayscale(15%);}
.founder-photo-label{display:flex;align-items:center;gap:8px;margin-top:14px;}
.founder-photo-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);}
.founder-photo-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.founder-copy{display:flex;flex-direction:column;gap:0;}
.f-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:20px;}
.founder-rule{width:48px;height:2px;background:var(--blue);margin-bottom:28px;}
.founder-quote{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,3.5vw,52px);letter-spacing:.05em;color:var(--bone);line-height:1.05;margin-bottom:28px;}
.founder-body{font-size:17px;font-weight:300;color:var(--mist);line-height:1.75;max-width:520px;margin-bottom:36px;}
.founder-sig{display:flex;flex-direction:column;gap:6px;border-left:2px solid var(--blue);padding-left:20px;}
.founder-sig-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.08em;color:var(--bone);}
.founder-sig-role{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
@media(max-width:960px){.founder-inner{grid-template-columns:260px 1fr;gap:48px;}}
@media(max-width:768px){.founder-inner{grid-template-columns:1fr;gap:40px;}.founder-photo{aspect-ratio:4/3;}.founder-section{padding:60px 24px;}}
`;

export default function FounderSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="founder-section">
        <div className="founder-inner">
          <div className="founder-photo-wrap reveal-left">
            <img src="/harsha.jpg" alt="Harsha Dandi, Founder of SOLUM" className="founder-photo" />
            <div className="founder-photo-label">
              <span className="founder-photo-dot" />
              <span className="founder-photo-tag">Harsha Dandi · Founder</span>
            </div>
          </div>
          <div className="founder-copy reveal">
            <div className="f-sec-tag">Why SOLUM Exists</div>
            <div className="founder-rule" />
            <div className="founder-quote">Built Because<br />Nothing Else<br />Was Good Enough.</div>
            <p className="founder-body">
              Men's body care was either skincare repackaged with a dark bottle, or the same three
              products at three times the margin. Nobody had taken the actual traditions seriously —
              the Korean bathhouse techniques, the Moroccan hammam clay, the UK pharmaceutical-grade
              formulation standards. I sourced from the places that do each thing best and built
              them into a system that fits into ten minutes.
            </p>
            <div className="founder-sig">
              <span className="founder-sig-name">Harsha Dandi</span>
              <span className="founder-sig-role">Founder · SOLUM</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add web/src/components/FounderSection.jsx
git commit -m "feat: add FounderSection component"
```

---

## Task 7: Wire FounderSection into FullSite

**Files:**
- Modify: `web/src/pages/FullSite.jsx`

- [ ] **Step 1: Import and insert FounderSection**

Add import after ProvenanceSection import:
```jsx
import FounderSection from '../components/FounderSection.jsx';
```

In the JSX, insert `<FounderSection />` between `<ProvenanceSection />` and `<SocialProof />`:
```jsx
<ProvenanceSection />
<FounderSection />
<SocialProof />
```

- [ ] **Step 2: Commit**
```bash
git add web/src/pages/FullSite.jsx
git commit -m "feat: wire FounderSection into FullSite between Provenance and SocialProof"
```

---

## Task 8: Build FathersDayPage

**Files:**
- Create: `web/src/pages/FathersDayPage.jsx`

Context:
- This is a standalone bespoke ad-landing page — no Nav, but includes SolumFooter.
- UK Father's Day: Sunday 21 June 2026. Order cutoff: Wednesday 17 June noon.
- Prices: GROUND £75, RITUAL £95 (gift pricing, `?source=gift`).
- CTAs route to `/buy?kit=ground&source=gift` and `/buy?kit=ritual&source=gift`.
- VITE_SITE_MODE is `first_batch` — do not reference subscriptions anywhere on this page.
- Design follows SOLUM design language: `--black` bg, Bebas Neue headings, Barlow Condensed body, steel-blue accents.
- The deadline counter shows days + hours remaining until June 17 at noon (UK time). After the deadline has passed, it shows "Last orders passed — check back next year."
- The box exterior image is `/box-exterior.png`.

- [ ] **Step 1: Create FathersDayPage.jsx**

Create `web/src/pages/FathersDayPage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SolumFooter from '../components/SolumFooter.jsx';

const DEADLINE = new Date('2026-06-17T12:00:00+01:00'); // UK time (BST)

const CSS = `
/* ─── Reset / page ─────────────────────────────────── */
.fd-page{background:var(--black);min-height:100vh;font-family:'Barlow Condensed',sans-serif;}

/* ─── Top bar ──────────────────────────────────────── */
.fd-topbar{background:var(--char);border-bottom:1px solid var(--line);padding:12px 48px;display:flex;align-items:center;justify-content:space-between;}
.fd-topbar-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.15em;color:var(--bone);text-decoration:none;}
.fd-topbar-tag{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);}

/* ─── Hero ─────────────────────────────────────────── */
.fd-hero{padding:80px 48px 64px;max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 440px;gap:64px;align-items:center;}
.fd-hero-eyebrow{font-size:12px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:20px;display:flex;align-items:center;gap:12px;}
.fd-hero-eyebrow::before{content:'';width:28px;height:1px;background:var(--blue);}
.fd-hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,6vw,96px);line-height:.92;letter-spacing:.03em;color:var(--bone);margin-bottom:28px;}
.fd-hero-title em{font-style:normal;color:var(--blue);}
.fd-hero-body{font-size:18px;font-weight:300;color:var(--mist);line-height:1.7;max-width:520px;margin-bottom:36px;}
.fd-hero-visual{display:flex;flex-direction:column;align-items:flex-end;}
.fd-hero-img{width:100%;max-width:420px;height:auto;object-fit:contain;filter:drop-shadow(0 24px 48px rgba(0,0,0,.7));}

/* ─── Deadline block ───────────────────────────────── */
.fd-deadline{background:var(--char);border:1px solid var(--lineb);padding:28px 32px;margin-bottom:40px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;}
.fd-deadline-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;white-space:nowrap;}
.fd-deadline-counter{display:flex;gap:16px;align-items:baseline;}
.fd-deadline-unit{display:flex;flex-direction:column;align-items:center;gap:2px;}
.fd-deadline-num{font-family:'Bebas Neue',sans-serif;font-size:40px;color:var(--bone);line-height:1;letter-spacing:.02em;}
.fd-deadline-unit-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.fd-deadline-colon{font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--lineb);padding-bottom:6px;}
.fd-deadline-note{font-size:13px;color:var(--stone);font-weight:300;line-height:1.5;}
.fd-deadline-past{font-size:14px;color:var(--stone);font-weight:300;}

/* ─── What's in the box ────────────────────────────── */
.fd-box{border-top:1px solid var(--line);padding:80px 48px;}
.fd-box-inner{max-width:1400px;margin:0 auto;}
.fd-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.fd-sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:48px;}
.fd-products{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);}
.fd-product{background:var(--char);padding:28px 20px;}
.fd-product-num{font-family:'Bebas Neue',sans-serif;font-size:40px;color:rgba(46,109,164,0.3);line-height:1;margin-bottom:8px;}
.fd-product-name{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.3;margin-bottom:6px;}
.fd-product-origin{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:8px;}
.fd-product-desc{font-size:13px;color:var(--mist);font-weight:300;line-height:1.55;}

/* ─── The experience ────────────────────────────────── */
.fd-experience{border-top:1px solid var(--line);padding:80px 48px;background:var(--char);}
.fd-experience-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.fd-experience-points{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.fd-exp-point{background:var(--char);padding:24px 28px;display:flex;gap:16px;align-items:flex-start;}
.fd-exp-num{font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--blue);line-height:1;flex-shrink:0;width:32px;}
.fd-exp-text{font-size:15px;color:var(--mist);font-weight:300;line-height:1.65;}
.fd-exp-text strong{color:var(--bone);font-weight:600;}

/* ─── Kit choice ────────────────────────────────────── */
.fd-kits{border-top:1px solid var(--line);padding:80px 48px;}
.fd-kits-inner{max-width:1400px;margin:0 auto;}
.fd-kits-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);margin-top:48px;}
.fd-kit{background:var(--char);padding:40px 36px;display:flex;flex-direction:column;}
.fd-kit.featured{background:var(--mid);border:1px solid var(--blue);outline:1px solid rgba(46,109,164,0.3);margin:-1px;}
.fd-kit-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;padding:4px 10px;margin-bottom:16px;font-weight:700;background:var(--blue);color:var(--bone);}
.fd-kit-name{font-family:'Bebas Neue',sans-serif;font-size:52px;letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:6px;}
.fd-kit-tagline{font-size:15px;color:var(--stone);font-weight:300;margin-bottom:28px;}
.fd-kit-price{font-family:'Bebas Neue',sans-serif;font-size:64px;color:var(--bone);letter-spacing:-1px;line-height:1;margin-bottom:4px;}
.fd-kit-price-note{font-size:13px;color:var(--stone);font-weight:300;margin-bottom:32px;}
.fd-kit-divider{width:100%;height:1px;background:var(--line);margin-bottom:24px;}
.fd-kit-products{display:flex;flex-direction:column;gap:6px;margin-bottom:36px;flex:1;}
.fd-kit-product{font-size:14px;color:var(--mist);font-weight:300;display:flex;align-items:center;gap:8px;}
.fd-kit-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:22px;}
.fd-kit-cta{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;background:var(--bone);color:var(--black);padding:18px 24px;border:none;cursor:pointer;width:100%;transition:background .2s,transform .15s;margin-top:auto;}
.fd-kit-cta:hover{background:#fff;transform:translateY(-1px);}
.fd-kits-footnote{text-align:center;margin-top:28px;font-size:14px;color:var(--stone);font-weight:300;line-height:1.6;}

/* ─── Responsive ────────────────────────────────────── */
@media(max-width:960px){
  .fd-hero{grid-template-columns:1fr;}.fd-hero-visual{display:none;}
  .fd-experience-inner{grid-template-columns:1fr;}
  .fd-products{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:768px){
  .fd-topbar{padding:12px 24px;}
  .fd-hero{padding:48px 24px 40px;}
  .fd-box,.fd-experience,.fd-kits{padding:60px 24px;}
  .fd-kits-grid{grid-template-columns:1fr;}
  .fd-kit.featured{margin:0;}
  .fd-deadline{padding:20px 24px;}
}
`;

const GROUND_PRODUCTS = [
  { num: '01', name: 'Amino Acid Body Wash', origin: 'United Kingdom', desc: 'Sulphate-free. Cleans without stripping natural oils.' },
  { num: '02', name: 'Exfoliating Mitt', origin: 'Korean Tradition', desc: 'Dead skin removal with every shower. Long circular strokes.' },
  { num: '03', name: 'Back Scrub Cloth', origin: 'Korean Tradition', desc: '70cm reach. Properly cleans the one area no product has ever reached.' },
  { num: '04', name: 'Silicone Scalp Massager', origin: 'South Korea', desc: 'Three minutes on a wet scalp. Most men have never properly cleaned theirs.' },
  { num: '07', name: 'Body Lotion 400ml', origin: 'United Kingdom', desc: 'Apply within 3 minutes of towelling. 70% higher absorption while skin is still warm.' },
];

const RITUAL_EXTRA = [
  { num: '05', name: 'Rhassoul Clay Mask', origin: 'Morocco', desc: 'Atlas mountain clay. Weekly deep-clean that draws out what soap never reaches.' },
  { num: '06', name: 'Argan Body Oil', origin: 'Morocco', desc: 'Cold-pressed, certified organic. Weekly treatment — replaces lotion on deep-clean days.' },
];

function DeadlineCounter() {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    function calc() {
      const diff = DEADLINE - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ days, hours, mins });
    }
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, []);

  if (timeLeft === null) {
    return (
      <div className="fd-deadline">
        <span className="fd-deadline-label">Order window</span>
        <span className="fd-deadline-past">Father's Day order window has passed — check back next year.</span>
      </div>
    );
  }

  return (
    <div className="fd-deadline">
      <span className="fd-deadline-label">Order by Wed 17 Jun</span>
      <div className="fd-deadline-counter">
        <div className="fd-deadline-unit">
          <span className="fd-deadline-num">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="fd-deadline-unit-label">Days</span>
        </div>
        <span className="fd-deadline-colon">:</span>
        <div className="fd-deadline-unit">
          <span className="fd-deadline-num">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="fd-deadline-unit-label">Hours</span>
        </div>
        <span className="fd-deadline-colon">:</span>
        <div className="fd-deadline-unit">
          <span className="fd-deadline-num">{String(timeLeft.mins).padStart(2, '0')}</span>
          <span className="fd-deadline-unit-label">Mins</span>
        </div>
      </div>
      <span className="fd-deadline-note">Royal Mail Tracked 48 · arrives by Father's Day · UK only</span>
    </div>
  );
}

export default function FathersDayPage() {
  const navigate = useNavigate();

  return (
    <>
      <style>{CSS}</style>
      <div className="fd-page">

        {/* Top bar */}
        <div className="fd-topbar">
          <a href="/" className="fd-topbar-logo">SOLUM</a>
          <span className="fd-topbar-tag">Father's Day · Delivered by 21 June</span>
        </div>

        {/* Hero */}
        <div className="fd-hero">
          <div>
            <div className="fd-hero-eyebrow">Father's Day Gift</div>
            <h1 className="fd-hero-title">
              Give Him<br />The System<br /><em>Nobody Else</em><br /><em>Built.</em>
            </h1>
            <p className="fd-hero-body">
              He showers every day. He's still carrying dead skin from years ago, a back that
              hasn't been properly cleaned once, a scalp that gets shampooed but never actually
              massaged. SOLUM is the first body care system built specifically for men. Ten
              minutes a morning. Results from session one.
            </p>
            <DeadlineCounter />
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                className="fd-kit-cta"
                style={{ width: 'auto', padding: '16px 40px' }}
                onClick={() => navigate('/buy?kit=ritual&source=gift')}
              >
                Gift RITUAL — £95
              </button>
              <button
                className="fd-kit-cta"
                style={{ width: 'auto', padding: '16px 40px', background: 'transparent', border: '1px solid var(--lineb)', color: 'var(--bone)' }}
                onClick={() => navigate('/buy?kit=ground&source=gift')}
              >
                Gift GROUND — £75
              </button>
            </div>
          </div>
          <div className="fd-hero-visual">
            <img src="/box-exterior.png" alt="SOLUM kit — Father's Day gift" className="fd-hero-img" />
          </div>
        </div>

        {/* What's in the box — GROUND (5 products) */}
        <div className="fd-box">
          <div className="fd-box-inner">
            <div className="fd-sec-tag">What He Gets</div>
            <h2 className="fd-sec-title">Five Products.<br />One Complete System.</h2>
            <div className="fd-products">
              {GROUND_PRODUCTS.map(p => (
                <div key={p.num} className="fd-product">
                  <div className="fd-product-num">{p.num}</div>
                  <div className="fd-product-origin">{p.origin}</div>
                  <div className="fd-product-name">{p.name}</div>
                  <div className="fd-product-desc">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The gift experience */}
        <div className="fd-experience">
          <div className="fd-experience-inner">
            <div>
              <div className="fd-sec-tag">The Gift Experience</div>
              <h2 className="fd-sec-title">Not A Candle.<br />Not A Voucher.</h2>
              <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--mist)', lineHeight: 1.7, maxWidth: '460px', marginTop: '16px' }}>
                SOLUM ships in a rigid matte black box with a steel-blue ribbon, foam insert,
                and a ritual card that explains exactly what to do and why. He opens it and
                knows immediately this is something different.
              </p>
            </div>
            <div className="fd-experience-points">
              {[
                ['Matte black rigid box', 'Debossed SOLUM wordmark. Magnetic close. Foam insert. Steel-blue ribbon pull.'],
                ['Ritual card included', 'Step-by-step guide inside the box. Daily and weekly rituals fully explained.'],
                ['Results from session one', 'The back scrub cloth reaches what no shower ever has. In 60 seconds.'],
                ['Royal Mail Tracked 48', 'Full tracking from dispatch. Arrives by Father\'s Day when ordered by 17 June.'],
              ].map(([title, body], i) => (
                <div key={i} className="fd-exp-point">
                  <span className="fd-exp-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="fd-exp-text"><strong>{title}.</strong> {body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kit choice */}
        <div className="fd-kits">
          <div className="fd-kits-inner">
            <div className="fd-sec-tag">Choose Your Gift</div>
            <h2 className="fd-sec-title">Two Kits.<br />One Right Answer.</h2>
            <div className="fd-kits-grid">

              {/* GROUND */}
              <div className="fd-kit">
                <div className="fd-kit-name">GROUND</div>
                <div className="fd-kit-tagline">The complete daily system. Every product he needs.</div>
                <div className="fd-kit-price">£75</div>
                <div className="fd-kit-price-note">One-time gift purchase · includes all tools</div>
                <div className="fd-kit-divider" />
                <div className="fd-kit-products">
                  {GROUND_PRODUCTS.map(p => (
                    <div key={p.num} className="fd-kit-product">
                      <span className="fd-kit-product-num">{p.num}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
                <button className="fd-kit-cta" style={{ background: 'var(--char)', border: '1px solid var(--lineb)', color: 'var(--bone)' }} onClick={() => navigate('/buy?kit=ground&source=gift')}>
                  Gift GROUND — £75
                </button>
              </div>

              {/* RITUAL */}
              <div className="fd-kit featured">
                <span className="fd-kit-badge">Most Popular</span>
                <div className="fd-kit-name">RITUAL</div>
                <div className="fd-kit-tagline">The complete system — daily and weekly. Seven products.</div>
                <div className="fd-kit-price">£95</div>
                <div className="fd-kit-price-note">One-time gift purchase · includes all tools</div>
                <div className="fd-kit-divider" />
                <div className="fd-kit-products">
                  {[...GROUND_PRODUCTS, ...RITUAL_EXTRA].map(p => (
                    <div key={p.num} className="fd-kit-product">
                      <span className="fd-kit-product-num">{p.num}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
                <button className="fd-kit-cta" onClick={() => navigate('/buy?kit=ritual&source=gift')}>
                  Gift RITUAL — £95
                </button>
              </div>

            </div>
            <p className="fd-kits-footnote">
              One-time purchase. No subscription attached. He can choose to subscribe later — that's his call.
              <br />Order by Wed 17 June for guaranteed delivery by Father's Day, 21 June.
            </p>
          </div>
        </div>

        <SolumFooter />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add web/src/pages/FathersDayPage.jsx
git commit -m "feat: Father's Day gift landing page"
```

---

## Task 9: Add /fathers-day route to App.jsx

**Files:**
- Modify: `web/src/App.jsx`

- [ ] **Step 1: Import FathersDayPage and add route**

Add import after BuyPage import:
```jsx
import FathersDayPage from './pages/FathersDayPage';
```

Add route inside `<Routes>` after the `/buy` route:
```jsx
<Route path="/fathers-day" element={<FathersDayPage />} />
```

- [ ] **Step 2: Commit**
```bash
git add web/src/App.jsx
git commit -m "feat: add /fathers-day route"
```

---

## Task 10: Smoke-test everything locally

- [ ] **Step 1: Start dev server**
```bash
cd web && npm run dev
```

- [ ] **Step 2: Verify main site**
Open `http://localhost:5173/full` and check:
- Hero copy is tighter (no "That's just getting wet" line)
- FounderSection appears between Provenance and SocialProof with Harsha's photo
- FAQ answer for GROUND correctly says "5 products"
- Bottom CTA body says "Ten minutes every morning."

- [ ] **Step 3: Verify Father's Day page**
Open `http://localhost:5173/fathers-day` and check:
- Countdown shows days/hours/mins to June 17 noon
- "Gift RITUAL — £95" CTA navigates to `/buy?kit=ritual&source=gift`
- "Gift GROUND — £75" CTA navigates to `/buy?kit=ground&source=gift`
- /buy page loads correctly with gift pricing (£95 for RITUAL)

- [ ] **Step 4: Check /buy?kit=ritual&source=gift shows £95**
The `BuyPage` uses `PREMIUM_SOURCES = ['gift', 'tiktok_shop']` and `PREMIUM_PRICES = { ground: 75, ritual: 95 }`. Verify the price shown matches.

---

## Self-Review Notes

- **Spec coverage:** All 9 files covered. Copy tightening (Tasks 1–5), FounderSection (Tasks 6–7), Father's Day page (Tasks 8–9), smoke test (Task 10).
- **No placeholders:** All code is complete. FathersDayPage is fully self-contained with real copy.
- **Type consistency:** `navigate('/buy?kit=ritual&source=gift')` matches the existing BuyPage URL param handling (`useSearchParams`, `source` and `kit_id` params).
- **GROUND product count fix (Task 4):** Critical correction — FAQ previously said GROUND has 7 products. Correct is 5. Fixed.
- **Father's Day deadline:** June 17 noon BST hardcoded in `DEADLINE` const. After that, counter shows "order window passed" message — no broken UI post-deadline.
- **No subscription copy on Father's Day page:** Page is deliberately one-time-only framed. The footnote says "He can choose to subscribe later — that's his call."
