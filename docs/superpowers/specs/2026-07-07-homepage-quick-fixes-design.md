# Homepage Quick Fixes — Design

Date: 2026-07-07 · Scope agreed with Harsha: quick mechanical fixes only (editorial
tightening pass and section reordering are explicitly OUT of scope, tracked in the
website-tightening memory).

Source: fold-by-fold mobile review of prod (iPhone 13, 390×664). Homepage is
15,726px (~24 folds); first kit/price at 4,220px; large empty runs; one probable
rendering bug.

## 1. Mid-page CTA in ProblemSection

The 3,500px between the hero and the kit cards contains no action. Add one CTA
under the blue payoff box ("…SOLUM is the 10-minute system that clears it, head
to toe."):

- Copy: `SEE THE KITS →`
- Behaviour: scroll to `#kits` (same pattern as the hero CTA)
- Style: hero primary button style (bone background, Bebas)
- Analytics: capture `problem_cta_clicked` on click

## 2. Body/Face headline collision in WhatSolumIs

At 390px the animated Body/Face swap (`.wsi-swap`, inline-grid with two stacked
words) collides with "GUIDED" in the h2. Diagnose locally at 390px:

- Preferred fix: make the swap word wrap cleanly as part of the headline.
- Fallback if the animation can't wrap reliably: below 768px render a static
  "Body" (animation desktop-only). Desktop unchanged.

## 3. Dead-space cuts, mobile only

Surgical padding reductions at three verified spots (no copy changes, no desktop
changes):

- Reviews section: empty run after the "SWIPE FOR MORE →" hint to section end.
- Kits section: gap between the "CHOOSE YOUR KIT." intro and the first kit card.
- ProblemSection symptom cards: oversized internal padding (4 cards currently
  spread over 1,681px).

Target: remove roughly 1–1.5 viewport-heights of empty space on mobile total.

## Rollout

Build on dev → Harsha tests dev URL → explicit sign-off → merge master.
Success check: fold-capture script re-run shows the CTA present, headline clean at
390px, and reduced section heights; no visual regressions on desktop 1440px.
