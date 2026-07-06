# Homepage Conversion Restructure — Design

Date: 2026-07-06
Status: Draft for review
Owner: Harsha
Scope: `web/` homepage (`FullSite.jsx`) + QualifiedVisit tracking

---

## 1. Problem

An external UX review of `bysolum.co.uk` found that visitors dwell 8–10 minutes without
clicking a CTA or buying. The homepage asks visitors to *learn* through the philosophy,
the ritual, every individual product, three kits, subscription, sourcing, timeline, founder
story and FAQ **before** reaching a clear buying decision. The benefits of the products are
locked behind too much reading.

Root causes, in order of impact:

1. Too much to consume before any action (page is very long).
2. Hero states the system before convincing the visitor they have the problem.
3. Too many competing CTAs; no single dominant action.
4. The value proposition is buried under per-product explanation.
5. **Kits/pricing appear before any trust signal** — there are currently *no* customer
   reviews, testimonials, before/afters, or UGC anywhere on the site. (`TrustBar` is
   checkout badges; `CredibilityStrip` is country origins — neither is social proof.)
6. Copy reads like a manifesto (intellectual) rather than emotional then rational.
7. Every product gets equal weight — visitors evaluate 7 products instead of one system.
8. The (persuasive) founder story appears too late.
9. CTA labels describe what to buy ("Get Ground") not what you get.
10. Friction-reduction answers (returns, delivery, "is it worth it") are buried in the FAQ.

## 2. Goals & non-goals

**North-star:** reduce *time-to-benefit-comprehension* and convert long passive dwell into
action. Success is measured against existing PostHog events, not a new metric.

**Goals**
- Reorder the page to the flow: Problem → Solution → Social proof → Offer → Buy.
- Add customer social proof (reviews) before the kits and near the buy moment.
- Collapse to one dominant, outcome-led primary CTA.
- Put friction-reduction answers next to the buy decision.
- Rewrite the hero to lead with the visitor's problem/urgency.
- Compress the page: demote heavy sections to short teasers linking to existing pages.
- **Preserve and recalibrate the `QualifiedVisit` signal** so ad optimisation is not broken.

**Non-goals**
- No new routing/IA project. We reuse existing pages (`/ritual`, `/product/:slug`, `/guide`)
  as the "secondary pages" the review recommends.
- No A/B split test (traffic is too low for timely significance; we measure before/after).
- No change to checkout, pricing, or product data.

## 3. Success metrics (existing PostHog/analytics events)

- CTA click-through rate up (currently the presenting problem).
- `section_viewed` for the offer/kits reached earlier in the session.
- Scroll-depth-to-action ratio improves (less dwell without action).
- `QualifiedVisit` volume stays healthy (~enough to keep Meta out of learning phase) while
  correlating with genuine consideration rather than raw time-on-page.

## 4. Approach

**Approach A — in-place reorder + condense, shipped in phases.** Keep one homepage. Reorder
and shorten existing components; demote heavy sections to teasers linking to pages that
already exist; add the two missing pieces (reviews + friction). Lowest risk, reuses
components, reversible, measurable via existing events.

(Rejected: B — split into landing + new detail pages: real content-migration/new-route work,
slower to first ship. C — A/B variant: doubles maintenance and low traffic makes significance
slow.)

## 5. Target page structure

Current order (`FullSite.jsx`):
Hero → Marquee → WhatSolumIs → RitualInAction → ProductLineup → KitComparison → TruthSection
→ FullBleedBand → CredibilityStrip → FounderSection → FAQ → ProvenanceSection →
SubscriptionSection → CTASection.

Target order:

1. **Hero** — problem/urgency led, one CTA.
2. **Problem** — why a normal shower fails (reuse/retune `TruthSection` copy: "dead skin
   builds up for years; odour is bacteria feeding on dead cells").
3. **Solution / ritual (condensed)** — the 10-minute system as *one* thing (`WhatSolumIs` +
   a condensed `RitualInAction`), not seven separate products to evaluate.
4. **Reviews** — new social-proof section (see §6). Also reused on `/buy`.
5. **Offer / kits** (`KitComparison`) + **friction strip** immediately adjacent (see §7).
6. **Founder** (`FounderSection`) — moved up (people buy from people).
7. **FAQ**.
8. **Demoted tail** — provenance, subscription, full product lineup collapse to short teasers
   that link out to `/ritual` and `/product/:slug`. `CredibilityStrip` retained as a compact
   trust row.

## 6. Reviews section

**Placement:** before the kits (§5 step 4) on the homepage; component reused on `/buy`.

**Header:** "Rated 5/5 by our first users" + a 5-star row. No specific review count / no
Trustpilot claim we cannot stand behind.

**Layout:** 6 cards, 3×2 grid on desktop, 1-up (or carousel) on mobile. Each card: star row,
bold outcome headline, body, and an author block (avatar + name + short descriptor).

**Data model (headshot-ready from day one):**

```js
// web/src/data/reviews.js
{
  id: 'gym-odour',
  rating: 5,
  headline: '"My gym kit doesn\'t beat me anymore."',
  body: '...',
  name: 'Marcus',
  descriptor: '29 · trains 5x/week',
  photo: null,          // e.g. '/reviews/marcus.jpg' when real headshots arrive
  products: ['01','02'] // internal mapping, not necessarily shown
}
```

When `photo` is null, render a **branded monogram avatar** (author initial in a SOLUM-styled
circle) so it looks intentional now. When real names + headshots arrive, drop images into
`web/public/reviews/` and set `photo` — no layout change.

**The 6 reviews (placeholder personas, consented copy — see §10 compliance):**

1. **Gym odour** (01+02) — Marcus, 29, trains 5x/week — *"My gym kit doesn't beat me anymore."*
2. **Bacne / back you can't reach** (03) — Tom, 31, plays 5-a-side — *"The spots on my back cleared up."*
3. **Scalp** (04) — Adewale, 34, hard-water flat — *"No more flakes, no more itch."* (fuller-feeling hair; experiential, not a medical claim)
4. **Clay + oil skin feel** (05+06) — Ash, 33, cyclist — *"My skin actually feels fed now."*
5. **Scent** (01+07, cedarwood/vetiver) — Nathan, 30, works in the city — *"Subtle, and it lasts all day."*
6. **Irresistible to change** (retention/lock-in) — Liam, 27, personal trainer — *"Couldn't go back to just body wash if I tried."*

Full copy is drafted and approved in the brainstorming thread; it lives in `reviews.js`.

## 7. CTA + friction

**CTA hierarchy:** one dominant primary CTA repeated at hero, after reviews, and after kits.
Outcome-led label (candidates: "Build My Ritual", "Fix My Shower Routine", "Start My Reset").
Secondary actions (watch film, see full ritual, view details) demoted to quiet/text links so
they don't compete. Final label to be picked during Phase 1 (can be run through the existing
A/B CTA-copy test that already exists — `hero-cta-copy`).

**Friction strip:** a compact row directly adjacent to the kits answering the buy-moment
questions — returns policy, free/priced delivery, dispatch time, "is it worth it" reassurance.
Sources copy from existing FAQ/terms so it stays truthful.

## 8. QualifiedVisit recalibration (critical — do not skip)

`QualifiedVisit` is the optimisation signal cold Meta/TikTok campaigns bid toward. It fires
once per session (`web/src/lib/qualifiedVisit.js` / `qualifiedVisitTracker.js`) on the first
trigger that trips:

| Trigger | Condition | Source section |
|---|---|---|
| `product_detail` | viewed a product page | `/product/:slug` |
| `ritual_50` | ritual video ≥ 50% | RitualInAction / RitualVideoSelector |
| `unboxing_50` | unboxing video ≥ 50% | SubscriptionSection |
| `ritual_multi` | engaged 3 distinct ritual cards | RitualInAction |
| `scroll_dwell` | scroll ≥ 50% **and** dwell ≥ 60s | whole page |

**Two risks from the restructure:**

- **Shorter page → `scroll_dwell` over-fires.** `scrollPct = (scrollY + innerHeight) /
  scrollHeight`; on a compressed page 50% scroll happens in seconds, so nearly every visitor
  trips at 60s → floods Meta with low-intent "qualified" visits.
- **Phase 3 removes signal sources.** `ritual_50`, `unboxing_50`, `ritual_multi` all depend
  on the ritual/subscription sections existing on the homepage. Demoting them deletes 3 of 5
  triggers and starves the signal.

**Recalibration principle:** QV fires on evidence of buying *consideration*, not time-on-page.
Keep it **attainable but intent-anchored** (low traffic needs ~50 QV/week to exit learning).

- **Keep:** `product_detail`, `ritual_50` (condensed ritual still has a video).
- **Add:** `markOfferReached()` — fires when the kits section enters the viewport. Reaching
  the offer on a tight page is genuine intent. Added in **Phase 1** so the signal is safe
  *before* structure changes.
- **Add (optional):** a proof-engagement marker when the reviews section is viewed, as a
  secondary consideration signal.
- **Retire:** the raw `scroll_dwell` path (meaningless on a short page). Replace with
  reach-offer / reach-proof + a shorter dwell.
- **Phase 3 must re-wire markers** wherever a section moves so no trigger is silently dropped.
- Update `web/src/lib/qualifiedVisit.test.js` to cover the new logic.

## 9. Phasing (each independently shippable)

**Phase 1 — Trust + offer clarity (highest leverage, self-contained)**
- Reviews section (`reviews.js` + component) on homepage and `/buy`.
- Friction strip adjacent to kits.
- Outcome-led CTA copy; collapse to one dominant primary CTA.
- **QV: add `markOfferReached()`** (make the signal safe before restructure).

**Phase 2 — Hero rewrite**
- Problem/urgency-led headline + single CTA, replacing "The First Guided Body Ritual…".

**Phase 3 — Reorder + compress + demote tail**
- Reorder to §5 target; move founder up; condense product lineup to one "system" summary
  linking to `/product/:slug`; demote provenance/subscription/timeline to teasers.
- **Re-wire QV markers**; retire `scroll_dwell`; update tests.

## 10. Compliance / trust note

- Placeholder personas are written under the founder's stated consent to write review copy.
  **They will be replaced with real names + headshots.** Final published testimonials must
  reflect genuine customer experience (ASA/CAP: testimonials must be truthful and held on
  file).
- Scalp copy stays experiential ("no more flakes/itch", "feels fuller") — **no medical or
  anti-dandruff drug claims**.
- Aggregate header uses "Rated 5/5 by our first users" — no fabricated volume/Trustpilot.

## 11. Files touched (indicative)

- New: `web/src/data/reviews.js`, `web/src/components/Reviews.jsx`, `web/public/reviews/`.
- Edit: `web/src/pages/FullSite.jsx` (order), `web/src/pages/BuyPage.jsx` (reuse Reviews),
  `web/src/components/Hero.jsx`, `web/src/components/KitComparison.jsx` (+ friction strip),
  `web/src/components/CTASection.jsx` + CTA labels, `FounderSection` placement,
  demoted-tail components.
- QV: `web/src/lib/qualifiedVisit.js`, `qualifiedVisitTracker.js`, `qualifiedVisit.test.js`;
  add `markOfferReached` call in the kits component.

## 12. Testing

- Unit: `qualifiedVisit.test.js` covers new `markOfferReached` / retired `scroll_dwell`.
- Manual/verify: drive the homepage, confirm QV fires on reaching the offer and on
  `product_detail`/`ritual_50`; confirm it does **not** fire on a fast scroll-through with no
  engagement; confirm reviews render with monogram fallback and later with a `photo` set.
- Respect min font sizes (13px body / 11px labels) and logo-embed rules for any new UI.

## 13. Open questions

- Final primary CTA label (pick in Phase 1; optionally A/B via `hero-cta-copy`).
- Mobile reviews layout: 1-up stack vs carousel.
- Exact friction-strip claims (confirm current returns window + delivery terms from FAQ/terms).
