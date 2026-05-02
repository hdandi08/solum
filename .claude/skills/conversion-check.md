# Conversion Check — SOLUM

Use this skill whenever building or reviewing anything user-facing: hero sections, landing pages, product pages, emails, ad copy, checkout flow, or account page. Run the checklist against what's being built. Flag anything that fails.

---

## The Core Principle

**High-converting pages remove doubt — they don't convince.**

The visitor arrived interested. The page's job is to not unsell them. Every element either removes a specific doubt or adds friction. There is no neutral.

---

## The 5 Doubts Every Visitor Arrives With

Work through these in order. Each must be resolved before the next matters.

**1. "Is this real / does it work?"**
- Resolved by: social proof immediately below the headline (not below fold)
- Minimum: 5 genuine reviews. Star rating visible in hero.
- Data: 270% higher conversion with 5+ reviews. 8–18% lift from star ratings in hero.
- SOLUM status: ❌ No reviews yet — beta kit programme is the fix.

**2. "Is this for me?"**
- Resolved by: outcome headline that names the specific problem they recognise
- Test: Does the headline describe something true about their life? "You shower every day. Your body is still dirty." Yes. "Your body. Done right." No — too abstract.
- Must be the FIRST thing above fold on mobile. Before image, before sub-headline.

**3. "What do I do?"**
- Resolved by: one CTA, not two
- Research: two CTAs in a hero reduce primary CTA conversion. Every additional option is a hesitation point.
- SOLUM rule: Primary = "Build your ritual" (or "Choose your kit"). Secondary = remove or make text-only and visually subordinate.

**4. "Is it safe to commit?"**
- Resolved by: cancel-anytime language near CTA, monthly price visible before checkout, free delivery prominent
- SOLUM subscription trust line: "Then from £38/month — skip or cancel anytime."
- This must appear near the CTA — not buried in the kit section or FAQ.
- Counter-intuitive truth: showing the exit (cancel anytime) makes people more likely to stay.

**5. "Is this company legit?"**
- Resolved by: UK delivery timeframe, Harsha's founder story + photo, real ingredient origins, no fabricated claims
- New brands must earn trust the page can't assume. The founder story (ComingSoon) is doing this work well — replicate it on /full.

---

## Hero Section Checklist

Run this every time the hero is touched.

### Mobile (iPhone 14 viewport — test this first, always)
- [ ] H1 outcome headline is above fold without scrolling
- [ ] Star rating + review count visible below headline (once reviews exist)
- [ ] ONE primary CTA button visible above fold
- [ ] Subscription price / trust line visible near CTA
- [ ] Hero image loads in under 2.5s (test with PageSpeed Insights)
- [ ] No autoplay video

### Desktop
- [ ] Two-column layout: copy left (55%), visual right (45%)
- [ ] Ghost SOLUM watermark and grid overlay in place
- [ ] Visual is ritual-in-action (not box shot — box is a placeholder)
- [ ] Scroll cue visible at bottom right

### Image
- [ ] Using ritual-in-action photography (see 6-shot brief in memory)
- [ ] NOT using box-exterior.png as final (it's the placeholder)
- [ ] Image compressed to WebP, under 200KB
- [ ] box-exterior.png (5.5MB) will destroy mobile LCP — never ship uncompressed

---

## Copy Rules

### Converts
- Outcome headlines: names what changes about their life
- Problem framing: describes something true about their current situation
- Specific numbers: "70% more moisture", "3-minute window", "10 minutes"
- De-risk language: "cancel any time, one click, no penalty"
- Ritual framing: "muscle memory by week four"
- System gap: "the routine most men never got taught"

### Kills Conversion
- Shame language: "you smell", "you have a hygiene problem" — closes people off
- Luxury signals: "elevate your ritual", "premium grooming" — signals expensive, not valuable
- Vague benefits: "feel your best", "look great" — forgettable, converts nothing
- Fake social proof: any invented subscriber name or testimonial — UK ASA violation
- Fabricated claims: "99.9% antibacterial" without test data — legal risk
- System complexity above fold: showing all 8 products and 2 ritual tiers in the hero — decision fatigue bounces mobile visitors
- Two competing hero CTAs — splits attention

---

## Page Structure — What Goes Where

```
ABOVE FOLD (mobile — visible without scrolling)
├── Outcome headline (H1)
├── Star rating + review count  ← once reviews exist
├── Single CTA
└── Subscription trust line ("from £38/month — cancel anytime")

BELOW FOLD (revealed by scrolling)
├── Visual / photography
├── How it works (system explanation — 3 steps max)
├── Product grid (all 8 products)
├── Social proof / outcomes section
├── Kit comparison (GROUND vs RITUAL)
├── FAQ
└── Final CTA
```

The system is the reward for scrolling — not the hook.

---

## Performance Standards

| Metric | Target | Current Risk |
|--------|--------|-------------|
| Mobile LCP | < 2.5s | box-exterior.png is 5.5MB — fails badly |
| Image format | WebP | PNG currently used throughout |
| Hero image size | < 200KB | All current images are MB-range |
| No autoplay video | Always | Not currently an issue |

Research: 2.4s load → 1.9% conversion. 5.7s load → 0.6%. That's a 3× gap from load speed alone.

---

## Subscription-Specific Rules

SOLUM is a subscription product. Higher trust bar than one-off purchases.

1. **Pre-select subscription as default** in checkout — don't make it opt-in
2. **Show monthly recurring price** near the hero CTA, not just at checkout
3. **Cancel-anytime is a selling point** — not a legal footnote. Put it near the buy button.
4. **Founding 100 scarcity** — if spots remain, show the count. Real scarcity. Real urgency.
5. **Retention over dark patterns** — the 2-step cancel flow on the account page is legal and effective. Never add friction that violates UK Consumer Contracts Regulations 2013.

---

## SOLUM-Specific Risks

| Risk | Why it matters |
|------|---------------|
| No genuine reviews at launch | Single biggest conversion killer for new subscription brands |
| Box shot in hero | Communicates nothing about what the system does — black box = no signal |
| System complexity above fold | 8 products + 2 rituals will overwhelm mobile visitors |
| Male audience, personal category | No social validation from friends — page must do all trust work alone |
| Subscription commitment | Higher doubt threshold than one-off — every trust signal matters more |

---

## Key Numbers to Cite When Making Decisions

- **3×** — conversion gap between 2.4s and 5.7s page load
- **270%** — higher conversion with 5+ reviews vs zero
- **85%** — mobile cart abandonment rate industry-wide
- **40%** — quiz CTA conversion rate vs 4% for "Shop Now"
- **22%** — AOV increase from lifestyle/action imagery vs flat lays
- **8–18%** — lift from star ratings visible in hero
- **15–24%** — lift from social proof placed immediately below hero headline

---

## Photography — 6 Required Shots (Pre-Launch Blocker)

Harsha has an agency. These replace the box-exterior.png placeholder everywhere.
Style: shot on SOLUM Black (#08090B), tight framing, hands/skin/texture, no full face, skin looks like the outcome.

1. Back scrub cloth draped over back, mid-stroke — **hero candidate**
2. Scalp massager on wet scalp, water visible
3. Italy Towel Mitt on forearm — exfoliation / dead skin rolling
4. Body wash applied to chest — lather, clean water
5. Clay mask applied to torso — grey texture against skin
6. Lotion application within 3 minutes — towel on shoulder, skin still damp

---

## Before Shipping Any User-Facing Change

Ask: which of the 5 doubts does this address? If it addresses none and adds no trust signal, question whether it's needed. Complexity has a conversion cost.
