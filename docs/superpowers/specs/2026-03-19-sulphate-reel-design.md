# SOLUM — Reel 04 Design Spec: The Sulphate Reveal
> Created: 2026-03-19

---

## Purpose

A pre-launch Instagram Reel educating men on why their body wash is damaging their skin every morning. Anchors the sulphate problem as a content series SOLUM will own long-term. Ends with a coming soon CTA for Product 01 — Amino Acid Body Wash.

---

## Content Strategy Alignment

- **Message ladder:** Layer 1 (The Wrong) → Layer 2 (The Why) → Layer 3 (The Fix, teased)
- **Pillar:** THE PROOF — ingredient-level truth
- **Phase:** Awareness (pre-launch, no product footage)
- **Series:** First in the sulphate series — establishes the problem, subsequent reels can go deeper (the mechanism, the fix, the comparison)

---

## Scene Breakdown

| Scene | Duration | Content | Visual Device |
|---|---|---|---|
| S1 | 2.5s | "YOUR BODY WASH IS STRIPPING YOUR SKIN. EVERY MORNING." | Full-screen Bebas Neue hook. Hard cut. |
| S2 | 3s | "MOST MEN HAVE NO IDEA WHY." | Single line. Barlow Condensed eyebrow weight. |
| S3 | 7s | Ingredient list reveal | Hero scene — animated dense ingredients list scrolls, slows, stops on SLS/SLES. Both highlight in Steel Blue, isolate, slight zoom. |
| S4 | 4s | "SULPHATES ARE INDUSTRIAL DEGREASERS. THEY STRIP YOUR SKIN BARRIER EVERY TIME YOU WASH." | Two-line statement. Hard-hitting. No softening. |
| S5 | 4s | SOLUM wordmark + "AMINO ACID BODY WASH. CLEANS. DOESN'T STRIP. COMING SOON — BYSOLUM.COM" | Clean still. Wordmark fades in. Tagline holds. |

**Total runtime:** ~21 seconds

---

## Visual Spec

**Format:** 405×720px (9:16 Instagram Reel ratio)
**Background:** SOLUM Black (#08090B)
**Brand rule:** 3px Steel Blue vertical rule, left edge, all scenes
**Wordmark:** Top-left, 16px Bebas Neue, 60% opacity, all scenes

### S1 — Hook
- Font: Bebas Neue, ~80px, Bone (#F0ECE2)
- "EVERY MORNING." on its own line, accented in Sky Blue (#4A8FC7)
- Text animates up from translateY(16px) on entry

### S2 — Setup
- Font: Barlow Condensed 600, 18px, Sky Blue, letterspacing 0.18em, opacity 0.75
- Centered. Single line. Subordinate to S1 — does not compete visually.

### S3 — Ingredient Reveal (hero)
- Full-screen dense ingredient list: Barlow Condensed 300, 13px, Bone 40% opacity
- ~20 realistic cosmetic ingredients listed (real INCI names)
- Slow CSS scroll animation downward, ~4s
- Scroll slows as it approaches SLS — animation easing change signals something is coming
- "SODIUM LAURYL SULPHATE" isolates: opacity 100%, Steel Blue, Barlow Condensed 700, slight scale(1.05)
- "SODIUM LAURETH SULPHATE" appears below, same treatment, 400ms delay
- Rest of list fades to near-invisible

### S4 — The Damage
- Font: Bebas Neue, ~64px, Bone
- "SULPHATES ARE INDUSTRIAL DEGREASERS." — line 1
- "THEY STRIP YOUR SKIN BARRIER / EVERY TIME YOU WASH." — line 2, ~52px, Sky Blue accent on "STRIP", explicit line break after "BARRIER" to control wrap on 405px stage
- Line 2 animates in 600ms after line 1

### S5 — Coming Soon
- SOLUM wordmark: Bebas Neue 80px, letterspacing 0.15em, Bone
- 40px horizontal rule, Steel Blue, centered
- "AMINO ACID BODY WASH" — Barlow Condensed 700, 18px, letterspacing 0.18em, Sky Blue
- "CLEANS. DOESN'T STRIP." — Bebas Neue 40px, Bone
- "COMING SOON · BYSOLUM.COM" — Barlow Condensed 600, 14px, Steel Blue, letterspacing 0.2em

---

## Technical Spec

- Single HTML file, self-contained
- CSS animations only — no external video, no images, no canvas
- Same playback engine as existing reels (showScene, progress bar, record mode, countdown)
- Scene transitions: instant cut (opacity switch), no cross-fades — maintains hard editorial rhythm
- S3 ingredient scroll: CSS `@keyframes` scroll + JS-triggered class to pause and highlight on cue. Spelling throughout: British "SULPHATE" (matches all brand copy). INCI list uses American "Sulfate" as standard but isolation callout text uses "SULPHATE" — this is intentional, the callout is brand voice not INCI.
- Output file: `artefacts/solum-reel-04-animated.html`

---

## Ingredient List for S3 (realistic INCI order)

SLS (Sodium Lauryl Sulfate) appears at position 2, SLES (Sodium Laureth Sulfate) at position 3 — SLS highlights first in the animation, SLES follows 400ms later.

```
Aqua (Water), Sodium Lauryl Sulfate, Sodium Laureth Sulfate,
Cocamidopropyl Betaine, Glycerin, Sodium Chloride,
Parfum (Fragrance), Citric Acid, Sodium Benzoate,
Potassium Sorbate, Cocamide MEA, Polyquaternium-7,
Tetrasodium EDTA, PEG-7 Glyceryl Cocoate,
Hydroxypropyl Methylcellulose, Disodium EDTA,
Methylisothiazolinone, Methylchloroisothiazolinone,
CI 42090 (Blue 1), CI 19140 (Yellow 5)
```

SLS and SLES appear early in the list (positions 2–3) — as they would on a real label — reinforcing that they are primary ingredients, not trace amounts.

---

## Brand Rules Check

- No "soap" — ✓
- No orange/amber/yellow/green — ✓ (Steel Blue + Sky Blue only)
- Wordmark always uppercase — ✓
- No figure or person — ✓
- No gender comparison — ✓
- Tone: confrontational on result, empathetic on cause — ✓ ("no idea why" removes blame)
- Numbers anchor truth — ✓ (SLS/SLES as named ingredients, not vague claims)

---

## Caption (for Instagram post)

```
Your body wash contains sulphates.
They strip your skin barrier. Every morning.

Not your fault — nobody labels it that way.

Something cleaner is coming.
Find out what you're missing → link in bio.

#mensgrooming #mensbodycare #bodycare #skincareformen #morningroutine
```

---

## Series Potential

This reel is the opener. Future reels in the sulphate series:
- Reel 05: What the skin barrier actually does (and what happens when it's gone)
- Reel 06: Amino acids — how they clean without stripping (the fix)
- Reel 07: Side-by-side ingredient comparison (your wash vs. SOLUM)
