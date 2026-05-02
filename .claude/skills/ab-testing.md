# A/B Testing & Messaging — SOLUM

Use this skill whenever:
- Starting or reviewing a conversion experiment
- Writing copy for any channel (ads, hero, email, product pages, account)
- Reading Plausible results to call a winning variant
- Adding a new test to the registry

---

## The Three Files

```
web/src/data/abtests.js       ← test registry — add, pause, complete tests here
web/src/hooks/useVariant.js   ← assignment + localStorage persistence + Plausible tracking
Plausible dashboard           ← results — filter events by variant property
```

Never add A/B logic anywhere else. Everything goes through these three.

---

## Adding a New Test — Step by Step

**Step 1 — Add to the registry (`abtests.js`)**

```js
'my-test-id': {
  name: 'Human-readable name',
  status: 'active',              // 'active' | 'paused' | 'completed'
  variants: ['control', 'b'],    // first variant is always 'control'
  traffic: 1.0,                  // 0.0–1.0 — proportion of visitors in the test
  startDate: '2026-04-25',
  hypothesis: 'Specific, falsifiable prediction of what will happen and why.',
  metric: 'event_name_to_watch', // the Plausible event that signals a win
  result: null,                  // fill when test concludes
  notes: null,
},
```

**Step 2 — Use the variant in the component**

```js
import { useVariant, trackGoal } from '../hooks/useVariant';

const variant = useVariant('my-test-id');
// variant === 'control' or 'b'
```

**Step 3 — Track the conversion event**

```js
// When the conversion fires (CTA click, checkout reach, kit select):
trackGoal('checkout_started', { kit: 'ritual' });
// trackGoal auto-tags with ALL active variant assignments — no manual props needed
```

**Step 4 — Read results in Plausible**

Filter the conversion event by each variant property. Example:
- `hero_cta_clicked` where `hero-cta-copy = control` → X clicks
- `hero_cta_clicked` where `hero-cta-copy = ritual` → Y clicks
- Compare rates, not raw counts

---

## Rules for Running Tests

1. **One test per element at a time.** Never test two things on the hero simultaneously — results are unreadable.
2. **Minimum 200 conversion events per variant before calling a winner.** At launch volume (~500 visitors/week, ~2–3% conversion) this takes 2–4 weeks. Be patient. Calling early is worse than not testing.
3. **Never delete completed tests.** Move them to `COMPLETED_TESTS` array in `abtests.js` with winner, lift, and date. This is institutional memory.
4. **Document losers too.** Knowing what doesn't work is equally valuable. A failed test is not a failed test — it's a data point.
5. **Paused tests always return 'control'.** Safe to leave `useVariant()` calls in components while a test is paused.
6. **`traffic: 0.5` means only half of visitors enter the test** — the other half automatically get control. Use this when you want a softer rollout of a risky variant.

---

## Currently Active Tests (update as tests launch/conclude)

| Test ID | What's being tested | Metric | Status |
|---------|-------------------|--------|--------|
| `hero-cta-copy` | "Build Your Ritual" vs "Choose Your Kit" | `hero_cta_clicked` | ✅ Active |
| `hero-eyebrow-copy` | System framing vs problem framing | `hero_scroll_depth` | ⏸ Paused |
| `proof-section-position` | Social proof higher on page | `checkout_started` | ⏸ Needs reviews first |
| `kit-preselect` | RITUAL pre-selected as default | `kit_selected` | ⏸ Paused |
| `kit-cta-copy` | "Start your ritual" vs "Add to cart" | `checkout_started` | ⏸ Paused |
| `checkout-trust-line` | Cancel-anytime prominent above pay button | `checkout_completed` | ⏸ Paused |

**Priority order to activate next:** `proof-section-position` (once 5+ genuine reviews exist) → `kit-preselect` → `kit-cta-copy`

---

## Plausible Events Reference

| Event | When fired | Auto-tagged with |
|-------|-----------|-----------------|
| `ab_assigned` | Visitor first assigned to a variant | `test`, `variant` |
| `hero_cta_clicked` | Hero primary CTA clicked | all active variants |
| `checkout_started` | Checkout page reached | all active variants |
| `checkout_completed` | Payment confirmed | kit, plan |
| `kit_selected` | Kit card CTA clicked | kit name, all variants |

To add a new tracked event, call `trackGoal('event_name', { extra: 'props' })` from the component. It auto-attaches all active variant assignments.

---

## Messaging Positioning — The 5-Level Ladder

Every piece of SOLUM copy maps to exactly one level. Use the right level for the right channel.

```
LEVEL 1 — HOOK          → Ads, hero H1
"You shower every day. Your body is still dirty."
Stops the scroll. Creates recognition. Says nothing about the solution yet.

LEVEL 2 — WHY           → Hero body copy, email subject lines
"Nobody ever built men a system worth following."
Removes blame. Creates curiosity. Positions SOLUM as filling a gap, not exploiting a failure.

LEVEL 3 — FIX           → Product pages, how-it-works section
"Ten minutes. Head to toe. Done properly."
Introduces the system. Specific time, specific scope, specific standard.

LEVEL 4 — PROOF         → SocialProof section, email body, ads (retargeting)
"Your back clean for the first time. Skin that holds moisture past midday."
Specific outcomes per body zone. Makes the promise tangible.

LEVEL 5 — IDENTITY      → Account page, retention emails, subscriber comms
"After four weeks it's muscle memory. You notice when you skip it."
The subscriber is already convinced — speak to who they are now, not why to buy.
```

**The rule:** Ads never go past Level 1. Account page never goes below Level 5. The system is revealed by scrolling — not front-loaded in the hero.

---

## Copy Rules

### Always converts
- Outcome headlines that name what changes: "Properly clean for the first time."
- Problem framing that creates recognition: "Most men have never had a proper back clean."
- Specific numbers: "Apply within 3 minutes — 70% more moisture absorption."
- De-risk language near the CTA: "Skip or cancel anytime — one click."
- Ritual framing: "Muscle memory by week four."
- Completeness: "Head to toe — the 90% of your skin most products ignore."

### Always kills conversion
- Shame: "You smell" / "you have a hygiene problem" — closes people off
- Luxury signals: "elevate", "premium", "artisan ritual" — signals price, not value
- Vague: "feel your best", "look great" — forgettable, converts nothing
- Fake social proof — UK ASA violation, also kills trust permanently
- Fabricated product claims — legal risk, especially antibacterial/medical claims
- System complexity above fold — 8 products in the hero bounces mobile visitors
- Two competing hero CTAs — splits attention, reduces primary CTA conversion

### Words to use
system · done properly · for the first time · head to toe · ten minutes · properly clean · muscle memory

### Words to never use
luxury · elevate · premium · routine · regimen · smell better · like a spa · just for men

---

## Positioning Statement (Internal — Not Copy)

SOLUM owns **category creation**, not competition. It does not compete with Lynx (mass market) or Aesop (luxury). It is the first brand to treat men's body care as a system worth taking seriously.

> "Everything else is a product. This is a system."

The aspiration is **competence** — being the man who has this sorted. Achievable, specific, not intimidating. Not luxury. Not budget. The first serious body care system for men.

---

## Key Research Numbers (cite when making decisions)

- **3×** — conversion gap between 2.4s and 5.7s mobile page load
- **270%** — higher conversion with 5+ genuine reviews vs zero
- **85%** — mobile cart abandonment rate industry-wide
- **40%** — quiz CTA conversion rate vs 4% for "Shop Now"
- **22%** — AOV increase from ritual-in-action imagery vs flat lays / box shots
- **8–18%** — lift from star ratings visible in the hero section
- **15–24%** — lift from social proof placed immediately below hero headline (not below fold)
