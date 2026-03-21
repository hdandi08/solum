# Reel 04 — Sulphate Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `artefacts/solum-reel-04-animated.html` — a 21-second Instagram Reel (405×720px) that educates men on sulphates in body wash, featuring an animated ingredient list reveal as the hero scene, ending with a SOLUM coming soon CTA.

**Architecture:** Single self-contained HTML file. Pure CSS animations + vanilla JS playback engine (same pattern as reel-03-animated.html). Five scenes: hook → setup → ingredient reveal → damage statement → coming soon. No external assets, no video, no images.

**Tech Stack:** HTML, CSS (`@keyframes`, transitions), vanilla JS. Google Fonts (Bebas Neue, Barlow Condensed). Pattern reference: `artefacts/solum-reel-03-animated.html`.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `artefacts/solum-reel-04-animated.html` | Create | The complete reel — all scenes, styles, JS engine |
| `artefacts/solum-reel-03-animated.html` | Reference only | Copy the playback engine and base structure from here |

---

### Task 1: Scaffold the HTML file with base structure and CSS variables

**Files:**
- Create: `artefacts/solum-reel-04-animated.html`
- Reference: `artefacts/solum-reel-03-animated.html` (copy base structure)

- [ ] **Step 1: Create the file with doctype, head, Google Fonts link, and CSS variables**

Copy the `<head>` block from reel-03 exactly. Update the `<title>` to `SOLUM — Reel 04 — The Sulphate Reveal`. CSS variables stay identical:

```css
:root {
  --black: #08090B;
  --charcoal: #181C24;
  --steel-blue: #2E6DA4;
  --sky-blue: #4A8FC7;
  --bone: #F0ECE2;
}
```

- [ ] **Step 2: Add base layout styles**

Copy verbatim from reel-03: `body`, `body.record-mode`, `#stage`, `.scene`, `.scene.active`, `.brand-rule`, `.scene-wordmark`, `.txt`, `.txt.visible`, `.pos-centre`, `.pos-centre.visible`. These are the shared foundation — do not alter them.

- [ ] **Step 3: Add the stage and five empty scene divs**

```html
<div id="stage">
  <div class="scene" id="s1"></div>
  <div class="scene" id="s2"></div>
  <div class="scene" id="s3"></div>
  <div class="scene" id="s4"></div>
  <div class="scene" id="s5"></div>
  <div id="progress-bar"></div>
  <div id="play-overlay" onclick="startReel()">
    <div class="play-icon"></div>
    <div class="play-label">Play Reel</div>
    <div class="play-duration">21 seconds</div>
  </div>
  <div id="countdown-overlay">
    <div id="countdown-number">3</div>
    <div id="countdown-label">Start QuickTime recording now</div>
  </div>
</div>
```

- [ ] **Step 4: Open in browser — verify black 405×720 stage renders, no errors in console**

- [ ] **Step 5: Commit**

```bash
git add artefacts/solum-reel-04-animated.html
git commit -m "feat: scaffold reel 04 — base structure and empty scenes"
```

---

### Task 2: Add text styles and scene backgrounds

**Files:**
- Modify: `artefacts/solum-reel-04-animated.html`

- [ ] **Step 1: Add text utility classes to `<style>`**

```css
.t-hook {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 80px;
  letter-spacing: 0.04em;
  line-height: 0.90;
  color: var(--bone);
}
.t-hook .accent { color: var(--sky-blue); }

.t-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sky-blue);
  opacity: 0.75;
  display: block;
  margin-bottom: 16px;
}

.t-body {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 20px;
  letter-spacing: 0.04em;
  line-height: 1.5;
  color: var(--bone);
}

.t-rule {
  width: 40px;
  height: 3px;
  background: var(--steel-blue);
  margin: 16px auto;
}

.t-cta-wordmark {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 80px;
  letter-spacing: 0.15em;
  color: var(--bone);
  display: block;
}

.t-cta-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sky-blue);
  display: block;
  margin-top: 8px;
}

.t-cta-hero {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 42px;
  letter-spacing: 0.06em;
  color: var(--bone);
  display: block;
  margin-top: 6px;
}

.t-cta-url {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--steel-blue);
  display: block;
  margin-top: 12px;
}

.t-cta-tagline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 300;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--bone);
  opacity: 0.42;
  display: block;
  margin-top: 8px;
}
```

- [ ] **Step 2: Add scene background styles**

```css
/* S1: Strong confrontational — slight blue glow from below */
#s1 { background: radial-gradient(ellipse 80% 40% at 50% 80%, rgba(46,109,164,0.10) 0%, transparent 65%), var(--black); }

/* S2: Dark, minimal */
#s2 { background: var(--black); }

/* S3: Near-black with very subtle texture feel */
#s3 { background: #060A0F; }

/* S4: Pure black — maximum weight */
#s4 { background: var(--black); }

/* S5: Blue glow — arrival energy */
#s5 { background: radial-gradient(ellipse 70% 40% at 50% 55%, rgba(46,109,164,0.16) 0%, transparent 65%), var(--black); }
```

- [ ] **Step 3: Add the shared overlay/control styles from reel-03**

Copy verbatim from reel-03: `#progress-bar`, `#play-overlay`, `#countdown-overlay`, `#countdown-number`, `#countdown-label`, `.play-icon`, `.play-label`, `.play-duration`, `.controls`, `.btn`, `.btn-play`, `.btn-record`, `.btn-restart`, `.instructions`, `.instr-title`, `.instr-steps`.

- [ ] **Step 4: Open in browser — verify no style errors, stage still black**

- [ ] **Step 5: Commit**

```bash
git add artefacts/solum-reel-04-animated.html
git commit -m "feat: add text styles and scene backgrounds to reel 04"
```

---

### Task 3: Build S1, S2, S5 — hook, setup, and coming soon scenes

**Files:**
- Modify: `artefacts/solum-reel-04-animated.html`

- [ ] **Step 1: Populate S1 — the hook**

```html
<div class="scene" id="s1">
  <div class="brand-rule"></div>
  <div class="scene-wordmark">SOLUM</div>
  <div class="txt pos-centre" data-delay="100">
    <div class="t-hook">YOUR BODY<br>WASH IS<br>STRIPPING<br>YOUR SKIN.<br><span class="accent">EVERY<br>MORNING.</span></div>
  </div>
</div>
```

- [ ] **Step 2: Populate S2 — the setup**

```html
<div class="scene" id="s2">
  <div class="brand-rule"></div>
  <div class="scene-wordmark">SOLUM</div>
  <div class="txt pos-centre" data-delay="150">
    <span class="t-eyebrow">Most men have no idea why.</span>
  </div>
</div>
```

- [ ] **Step 3: Populate S5 — coming soon**

```html
<div class="scene" id="s5">
  <div class="brand-rule"></div>
  <div class="txt pos-centre" data-delay="300">
    <span class="t-cta-wordmark">SOLUM</span>
    <div class="t-rule"></div>
    <span class="t-cta-sub">Amino Acid Body Wash</span>
    <span class="t-cta-hero">CLEANS.<br>DOESN'T STRIP.</span>
    <span class="t-cta-url">COMING SOON · BYSOLUM.COM</span>
    <span class="t-cta-tagline">Your body. Done right.</span>
  </div>
</div>
```

- [ ] **Step 4: Add placeholder text to S3 and S4 so scenes are visually testable**

```html
<!-- S3 placeholder -->
<div class="scene" id="s3">
  <div class="brand-rule"></div>
  <div class="txt pos-centre" data-delay="100">
    <span class="t-eyebrow">Ingredient reveal — coming in Task 4</span>
  </div>
</div>

<!-- S4 placeholder -->
<div class="scene" id="s4">
  <div class="brand-rule"></div>
  <div class="txt pos-centre" data-delay="100">
    <span class="t-eyebrow">Damage statement — coming in Task 5</span>
  </div>
</div>
```

- [ ] **Step 5: Add the JS playback engine — copy verbatim from reel-03**

Copy the entire `<script>` block from reel-03. Update the `SCENES` array:

```js
const SCENES = [
  { id: 's1', duration: 2500 },
  { id: 's2', duration: 3000 },
  { id: 's3', duration: 7000 },
  { id: 's4', duration: 4000 },
  { id: 's5', duration: 4000 },
];
```

- [ ] **Step 6: Add controls and instructions HTML below the stage (copy from reel-03, update scene count to 5)**

- [ ] **Step 7: Play the reel — verify S1, S2, S5 render correctly, placeholder text shows for S3/S4, progress bar runs**

- [ ] **Step 8: Commit**

```bash
git add artefacts/solum-reel-04-animated.html
git commit -m "feat: add hook, setup and coming-soon scenes to reel 04"
```

---

### Task 4: Build S3 — the ingredient reveal (hero scene)

This is the most complex task. The ingredient list scrolls, slows, then stops with SLS highlighted. Implemented with CSS animation + a JS class trigger.

**Files:**
- Modify: `artefacts/solum-reel-04-animated.html`

- [ ] **Step 1: Add the ingredient list styles**

```css
/* ── INGREDIENT REVEAL (S3) ── */
#s3 .ingredient-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 28px;
}

#s3 .ingredient-list {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 300;
  font-size: 13px;
  line-height: 1.9;
  color: var(--bone);
  opacity: 0.35;
  text-align: center;
  padding-top: 60px;
  padding-bottom: 60px;
  animation: ingredientScroll 3.8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
  will-change: transform;
}

#s3.reveal-active .ingredient-list {
  animation-play-state: paused;
}

@keyframes ingredientScroll {
  0%   { transform: translateY(0); }
  60%  { transform: translateY(-38%); }
  80%  { transform: translateY(-52%); }
  100% { transform: translateY(-56%); }
}

/* Individual ingredient item */
#s3 .ingredient-list span {
  display: block;
  transition: opacity 0.4s ease, color 0.4s ease, font-weight 0.4s ease, transform 0.4s ease, font-size 0.4s ease;
}

/* Highlighted state — SLS/SLES */
#s3.reveal-active .ingredient-list span.highlight {
  opacity: 1;
  color: var(--steel-blue);
  font-weight: 700;
  font-size: 15px;
  transform: scale(1.04);
}

/* All other items fade when reveal is active */
#s3.reveal-active .ingredient-list span:not(.highlight) {
  opacity: 0.08;
}

/* Label above highlighted items */
#s3 .reveal-label {
  position: absolute;
  bottom: 90px;
  left: 0; right: 0;
  text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--sky-blue);
  opacity: 0;
  transition: opacity 0.5s ease 0.6s;
  z-index: 5;
}

#s3.reveal-active .reveal-label {
  opacity: 0.8;
}
```

- [ ] **Step 2: Replace S3 placeholder HTML with the ingredient list**

```html
<div class="scene" id="s3">
  <div class="brand-rule"></div>
  <div class="scene-wordmark">SOLUM</div>
  <div class="ingredient-wrap">
    <div class="ingredient-list">
      <span>Aqua (Water)</span>
      <span class="highlight" id="sls">Sodium Lauryl Sulphate</span>
      <span class="highlight" id="sles">Sodium Laureth Sulphate</span>
      <span>Cocamidopropyl Betaine</span>
      <span>Glycerin</span>
      <span>Sodium Chloride</span>
      <span>Parfum (Fragrance)</span>
      <span>Citric Acid</span>
      <span>Sodium Benzoate</span>
      <span>Potassium Sorbate</span>
      <span>Cocamide MEA</span>
      <span>Polyquaternium-7</span>
      <span>Tetrasodium EDTA</span>
      <span>PEG-7 Glyceryl Cocoate</span>
      <span>Hydroxypropyl Methylcellulose</span>
      <span>Disodium EDTA</span>
      <span>Methylisothiazolinone</span>
      <span>Methylchloroisothiazolinone</span>
      <span>CI 42090 (Blue 1)</span>
      <span>CI 19140 (Yellow 5)</span>
    </div>
  </div>
  <div class="reveal-label">Found in most body washes</div>
</div>
```

- [ ] **Step 3: Add CSS transition-delay to SLES so it staggers 400ms after SLS**

In the ingredient list styles, add:

```css
#s3.reveal-active .ingredient-list span#sles {
  transition-delay: 0.4s;
}
```

This ensures SLS highlights first, SLES follows 400ms later — matching the spec.

- [ ] **Step 5: Wire the reveal trigger into the JS engine**

Inside the `showScene` function, after `el.classList.add('active')`, add:

```js
// Trigger ingredient reveal for S3
if (SCENES[index].id === 's3') {
  setTimeout(() => {
    el.classList.add('reveal-active');
  }, 3900); // fires just after scroll animation ends
}

// Reset S3 reveal state when leaving
if (currentScene >= 0 && SCENES[currentScene]) {
  const prev = document.getElementById(SCENES[currentScene].id);
  if (prev) prev.classList.remove('reveal-active');
}
```

Also reset in `restartReel()`:
```js
document.getElementById('s3').classList.remove('reveal-active');
```

- [ ] **Step 6: Play the reel — watch S3 carefully**

Check:
- List scrolls smoothly downward
- Scroll slows and stops with SLS/SLES roughly centred in the viewport
- After ~4s, `reveal-active` fires: non-highlighted items fade to near-invisible, SLS/SLES turn steel blue, label fades in at bottom
- No jank, no overflow visible

Adjust `@keyframes ingredientScroll` percentages if SLS/SLES doesn't land centred — tweak the final `translateY` value.

- [ ] **Step 7: Commit**

```bash
git add artefacts/solum-reel-04-animated.html
git commit -m "feat: build ingredient reveal hero scene (S3) for reel 04"
```

---

### Task 5: Build S4 — the damage statement

**Files:**
- Modify: `artefacts/solum-reel-04-animated.html`

- [ ] **Step 1: Add S4-specific styles**

```css
/* S4 — two-line damage statement with staggered entry */
#s4 .txt-line2 {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
#s4 .txt-line2.visible {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 2: Replace S4 placeholder with the damage statement**

```html
<div class="scene" id="s4">
  <div class="brand-rule"></div>
  <div class="scene-wordmark">SOLUM</div>
  <div class="txt pos-centre" data-delay="150">
    <div class="t-hook" style="font-size:64px;">SULPHATES<br>ARE<br>INDUSTRIAL<br>DEGREASERS.</div>
  </div>
  <div class="txt pos-centre txt-line2" data-delay="600" style="top:62%;">
    <div class="t-hook" style="font-size:52px;">THEY <span class="accent">STRIP</span><br>YOUR SKIN<br>BARRIER<br>EVERY TIME<br>YOU WASH.</div>
  </div>
</div>
```

- [ ] **Step 3: Wire the staggered line 2 animation in JS**

The existing engine already handles `data-delay` on `.txt` elements — stagger works automatically. Verify line 2 fires ~800ms after line 1 during playback.

- [ ] **Step 4: Play full reel end-to-end — verify all 5 scenes, correct timing, no overflow**

Check per scene:
- S1: Hook text fits, "EVERY MORNING." in sky blue
- S2: Eyebrow line centred, subordinate weight
- S3: Scroll lands correctly, reveal fires, label appears
- S4: Line 1 hits first, line 2 staggers in ~800ms later, "STRIP" in sky blue
- S5: Wordmark, rule, product name, coming soon URL — clean and still

- [ ] **Step 5: Commit**

```bash
git add artefacts/solum-reel-04-animated.html
git commit -m "feat: add damage statement scene (S4) to reel 04 — reel complete"
```

---

### Task 6: Final polish and record mode verification

**Files:**
- Modify: `artefacts/solum-reel-04-animated.html`

- [ ] **Step 1: Test Record Mode**

Click "Record Mode" — verify:
- Controls and instructions hide
- Stage scales to fill the screen
- 30-second countdown runs
- Reel auto-plays after countdown
- All 5 scenes play without issue at full scale

- [ ] **Step 2: Check font sizes on all scenes at full scale — nothing overflows**

If any text wraps unexpectedly, reduce font size in the relevant scene (S1 hook or S4 line 2 are most likely candidates on smaller screens).

- [ ] **Step 3: Verify brand rule (3px steel blue left edge) appears on all 5 scenes**

- [ ] **Step 4: Final commit**

```bash
git add artefacts/solum-reel-04-animated.html
git commit -m "feat: reel 04 complete — sulphate reveal, record mode verified"
```
