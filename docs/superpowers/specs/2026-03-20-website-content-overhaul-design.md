# SOLUM Website Content Overhaul — Design Spec

> **Spec:** 1 of 5
> **Scope:** Refactor `FullSite.jsx` into modular components + update all content to reflect new kit names, product lineup, pricing, ritual corrections, and subscription messaging
> **Reference:** `docs/superpowers/specs/2026-03-20-solum-platform-master-decisions.md`
> **Primary file:** `web/src/pages/FullSite.jsx`

---

## Goal

Break the monolithic `FullSite.jsx` into focused, reusable components and update all content to match decisions made on 2026-03-20: new kit names (GROUND · RITUAL · SOVEREIGN), updated 10-product lineup, correct pricing, corrected ritual copy (viscose mitt weekend-only), clear subscription replenishment cadence, and SOVEREIGN displayed as Coming Soon.

`ComingSoon.jsx` is **not touched** in this spec — it stays as the root `/` early access page. `FullSite.jsx` at `/full` is the target. At launch the routing will be swapped: `/full` becomes `/` and the coming soon page is retired.

---

## Component Structure

Split `FullSite.jsx` into the following files. Each component owns its own scoped CSS (injected via a `<style>` tag inside the component or passed as a prop string to a shared injector). `FullSite.jsx` becomes a thin orchestrator that imports and renders all sections.

```
web/src/
  components/
    Nav.jsx                  — Fixed top nav, scroll-aware active link
    Hero.jsx                 — Full-viewport hero, headline, CTAs
    Marquee.jsx              — Scrolling text strip
    TruthSection.jsx         — "Why SOLUM" stats + quote block
    KitComparison.jsx        — NEW: three-column kit comparison (GROUND / RITUAL / SOVEREIGN)
    ProductLineup.jsx        — 10-product grid with coming-soon treatment for 09+10
    RitualSection.jsx        — Daily + Weekly ritual tabs/steps with visual canvas
    SubscriptionSection.jsx  — NEW: replenishment cadence explainer + pricing
    ProvenanceSection.jsx    — Origins grid (UK / Korea / Morocco)
    SocialProof.jsx          — Testimonials / proof cards
    FAQ.jsx                  — Accordion FAQ
    CTASection.jsx           — Bottom CTA
    SolumFooter.jsx          — Footer
  data/
    products.js              — PRODUCTS constant (single source of truth)
    kits.js                  — KITS constant with kit contents and pricing
    rituals.js               — DAILY_STEPS + WEEKLY_STEPS constants
  pages/
    FullSite.jsx             — Thin orchestrator, imports all components
```

CSS variables and shared tokens stay in `web/index.css` (already exists — do not duplicate).

---

## Data Constants

### `web/src/data/products.js`

```js
export const PRODUCTS = [
  { num: '01', name: 'Body Wash', origin: 'UK', comingSoon: false },
  { num: '02', name: 'Italy Towel Mitt', origin: 'Korea', comingSoon: false },
  { num: '03', name: 'Back Scrub Cloth', origin: 'Korea', comingSoon: false },
  { num: '04', name: 'Scalp Massager', origin: 'Korea', comingSoon: false },
  { num: '05', name: 'Atlas Clay Mask', origin: 'Morocco', comingSoon: false },
  { num: '06', name: 'Argan Body Oil', origin: 'Morocco', comingSoon: false },
  { num: '07', name: 'Body Lotion', origin: 'UK', comingSoon: false },
  { num: '08', name: 'Bamboo Cloth', origin: 'UK', comingSoon: false },
  { num: '09', name: 'Turkish Kese Mitt', origin: 'Turkey', comingSoon: true },
  { num: '10', name: 'Beidi Black Soap', origin: 'Turkey', comingSoon: true },
];
```

### `web/src/data/kits.js`

```js
export const KITS = [
  {
    id: 'ground',
    name: 'GROUND',
    firstBoxPrice: 55,
    monthlyPrice: 38,
    productCount: 7,
    comingSoon: false,
    popular: false,
    products: ['01','02','03','04','05','07','08'],
    // No 06 (Argan Oil)
    tagline: 'Everything to start the ritual.',
  },
  {
    id: 'ritual',
    name: 'RITUAL',
    firstBoxPrice: 85,
    monthlyPrice: 48,
    productCount: 8,
    comingSoon: false,
    popular: true,
    products: ['01','02','03','04','05','06','07','08'],
    tagline: 'The complete system. The one to be on.',
  },
  {
    id: 'sovereign',
    name: 'SOVEREIGN',
    firstBoxPrice: 130,
    monthlyPrice: 58,
    productCount: 9,
    comingSoon: true,
    popular: false,
    // Replaces 02 (Italy Towel Mitt) with 09 (Turkish Kese Mitt). Does not include 02.
    products: ['01','03','04','05','06','07','08','09','10'],
    replacements: { '02': '09' }, // Italy Towel Mitt → Turkish Kese Mitt
    tagline: 'The artisan upgrade. Hand-woven. Limited.',
  },
];
```

### `web/src/data/rituals.js`

```js
export const DAILY_STEPS = [
  { num: '04', name: 'Scalp Massager', time: '2–3 MIN', zone: 'SCALP', desc: 'Small firm circles, hairline to back. 2–3 minutes.' },
  { num: '01', name: 'Body Wash', time: '1 MIN', zone: 'FULL BODY', desc: 'Amino acid formula. No sulphates. Cleans without stripping.' },
  { num: '03', name: 'Back Scrub Cloth', time: '1 MIN', zone: 'BACK', desc: 'Both handles, drape over shoulder, saw back and forth. The only way to reach your back.' },
  { num: '08', name: 'Bamboo Cloth', time: '30 SEC', zone: 'SENSITIVE AREAS', desc: 'For sensitive areas. Nothing left uncleaned.' },
  { num: '07', name: 'Body Lotion', time: '1 MIN', zone: 'FULL BODY', desc: 'Within 3 minutes of towelling. Skin absorbs 70% more moisture.' },
];

export const WEEKLY_STEPS = [
  { num: '04', name: 'Deep Scalp Massage', time: '5 MIN', zone: 'SCALP', desc: '5 minutes, more pressure than daily.' },
  { num: '05', name: 'Atlas Clay Mask', time: '8–10 MIN', zone: 'HEAD TO TOE', desc: 'Apply head to toe on damp skin. Leave 8–10 minutes.' },
  { num: '02', name: 'Italy Towel Mitt', time: '3 MIN', zone: 'FULL BODY', desc: 'Weekend use only. Firm slow strokes. Dead skin rolls off. Viscose rayon is too aggressive for daily use.' },
  { num: '08', name: 'Bamboo Cloth', time: '30 SEC', zone: 'SENSITIVE AREAS', desc: 'For sensitive areas.' },
  { num: '06', name: 'Argan Body Oil', time: '2 MIN', zone: 'FULL BODY', desc: 'Stay damp. 10–15 drops pressed in. No lotion needed today.' },
];
```

---

## Section-by-Section Changes

### Nav — update CTA

Nav links stay the same. Add "Kits" as a nav link pointing to `#kits`. CTA button text: "Choose Your Kit" → `#kits`.

---

### Marquee — update items

```js
const MARQUEE_ITEMS = [
  'The Ritual Men Were Never Taught',
  'Ground · Ritual · Sovereign',
  '10 Minutes Daily · 18 Minutes Weekly',
  '8 Products Live · 10 Coming',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
  'UK · Korea · Morocco',
  'Formulated for Men. Built to Last.',
];
```

Note: Turkey removed from marquee — Product 09 (Turkish Kese Mitt) is Coming Soon and not yet available.

---

### KitComparison — NEW section

Add between the Truth/Stats section and the Products section. Section ID: `kits`.

**Three-column card layout on desktop. Stacked on mobile (768px breakpoint).**

Each card shows:
- Kit name (Bebas Neue, large)
- First box price + product count
- Monthly sub price
- Product list (for SOVEREIGN: show Turkish Kese Mitt in place of Italy Towel Mitt — display "Turkish Kese Mitt (replaces Italy Towel Mitt)")
- CTA button or "Coming Soon" badge

**GROUND card:**
- 7 products · £55 first box · £38/mo
- Product list: Body Wash · Italy Towel Mitt · Back Scrub Cloth · Scalp Massager · Atlas Clay Mask · Body Lotion · Bamboo Cloth
- CTA: "Start with GROUND" → `#` (placeholder, Spec 3)

**RITUAL card (featured):**
- 8 products · £85 first box · £48/mo
- "Most Popular" badge — steel blue background, bone text
- Highlight border: `var(--blue)` / `var(--steel-blue)`
- Product list: All GROUND products + Argan Body Oil
- CTA: "Start with RITUAL" → `#` (placeholder, Spec 3)

**SOVEREIGN card (Coming Soon):**
- 9 products · £130 first box · £58/mo when available
- "Coming Soon" overlay badge
- Card content dimmed: `opacity: 0.55` on product list and pricing
- Product list: shows Turkish Kese Mitt replacing Italy Towel Mitt, plus Beidi Black Soap
- No CTA button — replace with "Notify Me" (links to Mailchimp form, same as ComingSoon.jsx)

Below the cards, one line of copy:
> "First box is a one-time purchase. Subscription starts with your second delivery. Cancel any time."

---

### ProductLineup — update to 10 products

Use `PRODUCTS` from `data/products.js`. Products 09 and 10 render with:
- `opacity: 0.45` on the card content
- A "COMING SOON" label overlaid in the visual area
- Dimmed product number

Remove any explicit Turkey origin tile from the origins/provenance section — Product 09 is not yet available. The provenance section covers UK · Korea · Morocco only at launch.

Remove any product numbered above 08 that currently appears (there are none in the current code — the current lineup is 01–08, with Product 08 shown as the Kese Mitt in some places; correct to "Bamboo Cloth" throughout).

---

### RitualSection — correct steps and add weekly tab

Current code has one ritual sequence with Product 02 (Italy Towel Mitt) shown as a daily step. This is wrong.

**Change to a two-tab layout: "Daily · 10 Min" and "Weekly · 18 Min".**

Daily tab uses `DAILY_STEPS` (04 → 01 → 03 → 08 → 07). No Italy Towel Mitt.

Weekly tab uses `WEEKLY_STEPS` (04 → 05 → 02 → 08 → 06). Italy Towel Mitt shown here with the explicit note: "Weekend use only — viscose rayon is too aggressive for daily use."

The visual canvas (right-side panel) continues to show the active step's product number and name. The auto-cycle timer applies within each tab independently.

Rename any step labelled "Exfoliating Cloth" to "Back Scrub Cloth" — that is Product 03's correct name.

---

### SubscriptionSection — NEW section

Replace the existing vague pricing section with a two-part section:

**Part 1 — Replenishment cadence (what ships and when):**

Three rows, each with icon/label + product list + rationale:

| Cadence | Products | Copy |
|---|---|---|
| Every month | Body Wash · Body Lotion · Bamboo Cloth | "The daily essentials. Always there when you need them." |
| Every 3 months | Italy Towel Mitt · Back Scrub Cloth · Atlas Clay · Argan Oil* | "The tools and weekly ritual products. Refreshed before they degrade." |
| Every 6 months | Scalp Massager | "Silicone nubs wear down. A fresh one ships automatically." |

*Argan Oil annotated with "(RITUAL+ only)" — shown in the product list as greyed out / annotated for GROUND viewers. Since this is a marketing page (not an account portal), show the full list with the annotation, not a conditional hide.

**Part 2 — Pricing summary:**

| Kit | Monthly price |
|---|---|
| GROUND | £38/mo |
| RITUAL | £48/mo |
| SOVEREIGN | £58/mo (coming soon) |

Add: "First box is a one-time purchase. Subscription starts with your second delivery. Cancel any time."

---

### FAQ — update pricing references

Replace all references to old pricing (£72, £89, £40/mo, £52/mo) and old kit names (Daily Starter, Full Ritual, World Kit) with new values:

- Old: "£72 or £89" → New: "£55 (GROUND) · £85 (RITUAL) · £130 (SOVEREIGN)"
- Old: "£40 or £52/month" → New: "£38 (GROUND) · £48 (RITUAL) · £58 (SOVEREIGN)"
- Old: "Daily Starter" → "GROUND"
- Old: "Full Ritual" → "RITUAL"
- Old: "World Kit" → "SOVEREIGN" (note: not yet available)

Updated FAQ for the gifting question: remove World Kit reference — SOVEREIGN is Coming Soon. The gifting answer should reference RITUAL as the recommended gift kit until SOVEREIGN is available.

---

### CTA Section — update copy

Both CTA copy instances (top hero + bottom CTA section):

Replace "first kit" with "first box" everywhere.

Updated CTA copy:
> "Sign up now → get 20% off your first box at launch · GROUND from £44 · RITUAL from £68"

(£55 × 0.8 = £44 · £85 × 0.8 = £68 — maths confirmed)

---

## Messaging Framework (apply to all copy)

All copy runs the 5-layer message ladder in order. The full page must hit all 5 layers:

1. **The Wrong** — opens with the problem, confrontational, urgency. *"Your back has never been clean."*
2. **The Why** — removes blame. Nobody built men the system.
3. **The Fix** — SOLUM. Concrete and specific. "10 minutes. 8 products. Two rituals."
4. **The Proof** — physical outcomes by week. Numbers, not vibes.
5. **The Identity** — "Your body. Done right."

**Approved headline copy (locked — use exactly):**
- H1: "You Shower Every Day. / Your Body Is Still Dirty."
- Eyebrow: "Men shower. Men don't actually clean."
- Stats framing: "Here's what actually happens when you do it right:"

**Tone rules:**
- Confrontational on result, empathetic on cause
- Short sentences. Declarative. No hedging.
- Numbers anchor truth: "70% more moisture in 3 minutes" not "deeply hydrating"
- Never "pamper" — always "do this right"
- Never "soap" — body care, body ritual
- Origins appear at Layer 3–4 (proof of why products work), never in the opening hook

---

## Text Legibility Requirements

The current FullSite.jsx has legibility issues — small text, low contrast, dense copy. All new copy must meet:

- **Body copy minimum:** 15px, `font-weight: 300`, `color: var(--mist)` or `var(--stone)` on dark backgrounds
- **Labels / eyebrows:** 11px minimum, `letter-spacing: 4px+`, `text-transform: uppercase`
- **Key stats / numbers:** Bebas Neue, minimum 48px
- **Section headlines:** Bebas Neue, `clamp(36px, 4vw, 72px)` minimum
- **Line height:** body copy `1.7`, headlines `1.0–1.1`
- **Contrast:** all text on `var(--black)` must use `var(--bone)`, `var(--mist)`, or `var(--stone)` — no grey-on-grey
- **Card body text:** 14px minimum on dark card backgrounds
- **Never use opacity to replace colour for readability** — use the correct colour token instead

---

## Visual / Style Rules

- All components follow existing CSS variable tokens: `--black #08090B`, `--blue #2E6DA4`, `--blit #4A8FC7`, `--bone #F0ECE2`, `--char`, `--mid`, `--dark`, `--stone`, `--mist`, `--line`, `--lineb`
- Fonts: Bebas Neue (headings), Barlow Condensed (body) — loaded in `web/index.html`
- Mobile breakpoint: 768px — all grid sections collapse to single column
- Existing reveal animation classes (`reveal`, `reveal-left`) continue to apply
- SOVEREIGN card: `opacity: 0.55` on product list + pricing block, with "Coming Soon" badge
- "Most Popular" badge on RITUAL: steel blue background (`var(--blue)`), bone text, Barlow Condensed 700
- Coming soon products (09, 10): `opacity: 0.45`, "SOON" badge in product card visual area

---

## File Output

| File | Action |
|---|---|
| `web/src/pages/FullSite.jsx` | Refactor to thin orchestrator — imports all section components |
| `web/src/data/products.js` | Create — 10-product constant |
| `web/src/data/kits.js` | Create — 3-kit constant with contents and pricing |
| `web/src/data/rituals.js` | Create — daily + weekly step constants |
| `web/src/components/Nav.jsx` | Extract from FullSite.jsx — add "Kits" link |
| `web/src/components/Hero.jsx` | Extract — update CTA copy |
| `web/src/components/Marquee.jsx` | Extract — update items |
| `web/src/components/TruthSection.jsx` | Extract — no content changes |
| `web/src/components/KitComparison.jsx` | Create new — GROUND / RITUAL / SOVEREIGN cards |
| `web/src/components/ProductLineup.jsx` | Extract + update — 10 products, coming-soon treatment |
| `web/src/components/RitualSection.jsx` | Extract + update — two tabs, correct steps |
| `web/src/components/SubscriptionSection.jsx` | Create new — cadence explainer + pricing |
| `web/src/components/ProvenanceSection.jsx` | Extract + update — remove Turkey, UK/Korea/Morocco only |
| `web/src/components/SocialProof.jsx` | Extract — no content changes |
| `web/src/components/FAQ.jsx` | Extract + update — new pricing, new kit names |
| `web/src/components/CTASection.jsx` | Extract + update — "first box" copy |
| `web/src/components/SolumFooter.jsx` | Extract — no content changes |
| `CLAUDE.md` | Update product lineup section — Product 08 = Bamboo Cloth, add 09 + 10 |

---

## What This Spec Does NOT Cover

- Checkout flow (Spec 3)
- Actual subscription management (Spec 4)
- Payment integration (Spec 3)
- Backend / database (Spec 2)
- Discount code redemption UI (Spec 5)
- Account / portal pages (Spec 4)
- Loyalty programme / t-shirt reward (Spec 5) — 6-month continuous subscription reward tracked in Supabase, handled in Discounts & Loyalty spec. If any existing loyalty UI or copy exists in FullSite.jsx, remove it.
- `ComingSoon.jsx` — not touched in this spec
