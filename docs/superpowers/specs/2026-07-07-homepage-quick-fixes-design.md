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

## 2. Body/Face headline double-exposure in WhatSolumIs (diagnosis revised)

Reproduced locally: layout is fine — the ugly frame is the crossfade window
(keyframes 38–46%) where both stacked words sit at partial opacity, reading as a
smudge over the headline. Fix: stagger the `wsiBody`/`wsiFace` keyframes so the
outgoing word is fully transparent before the incoming word starts fading in.
No layout or markup changes.

## 3. Dead space (diagnosis revised): reveal animations, not padding

Measured with reveals forced visible: cards are 180–204px and section gaps are
56–87px — padding is fine. The blank runs in the capture (and for real users who
flick-scroll) are `.reveal` elements still at opacity 0: the observer
(`FullSite.jsx`) requires elements 50px inside the viewport
(`rootMargin: '0px 0px -50px 0px'`) before starting a 0.7s fade.

Fix:
- rootMargin bottom −50px → +200px (reveal starts before the element enters).
- global.css: `.reveal`/`.reveal-left` transition 0.7s → 0.45s, translate
  32px/28px → 20px/18px.

No padding changes needed.

## Rollout

Build on dev → Harsha tests dev URL → explicit sign-off → merge master.
Success check: fold-capture script re-run shows the CTA present, headline clean at
390px, and reduced section heights; no visual regressions on desktop 1440px.
