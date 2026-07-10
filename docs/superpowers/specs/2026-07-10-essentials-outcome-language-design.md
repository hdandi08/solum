# Essentials Rename + Outcome-Driven Product Story

**Date:** 2026-07-10
**Status:** Approved direction, pending final user review
**Scope:** Web (customer-facing site). Homepage "chaos vs system" section is a follow-up (direction chosen, build deferred).

## Goal

Two changes that make the site sell outcomes, not objects:

1. **Language:** the word "tools" disappears from all customer-facing copy. Durables become **shower essentials** (or **essentials** on repeat mention). Consumables become **refills**.
2. **Outcome story:** every active product gets an explicit transformation story: an outcome headline, a meaningful stat, and a "Now → With SOLUM" before/after block, rendered on the product page and in compact form on the lineup tiles.

## Part A · Language rename

Mapping, applied everywhere customer-facing:

| Current | New |
|---|---|
| tools (durables) | shower essentials / essentials |
| consumables | refills |
| "tools last 6–12 months" | "your shower essentials last 6 to 12 months" |
| "wash, tools, and lotion together" | "your refills and your shower essentials, together" |
| "tools and consumables" | "shower essentials and refills" |
| "tools replaced when due" | "essentials replaced when due" |
| tag `Weekly · Tool` (product 11) | `Weekly · Essential` |
| "The only tool that reaches the back properly" | "The only essential that reaches your whole back" |

Files in scope: `KitComparison.jsx`, `UnboxingFilm.jsx`, `SubscriptionSection.jsx`, `CheckoutPage.jsx`, `checkout/OrderSummary.jsx`, `SuccessPage.jsx`, `AccountPage.jsx`, `EmailPreviewPage.jsx` (order confirmation email copy), `ComingSoon.jsx`, `data/products.js`, `data/guide.js` (article prose and headings, e.g. "The Two Tools You Need" becomes "The Two Essentials You Need"), image `alt` text.

**Exception:** `TermsPage.jsx` keeps "Physical Tools (non-cosmetic)" and related returns wording. It is the legal CPSR category and the returns policy anchor. No change there.

**Copy punctuation rule (site-wide, from Harsha 2026-07-10):** no em dashes, en dashes, or double hyphens in any copy. Use `·`, periods, commas, or "to" for ranges.

## Part B · Outcome story per product

### Data model

New `outcome` object on each active product in `web/src/data/products.js`:

```js
outcome: {
  headline: 'Thicker hair. Cleaner scalp.',   // plain-words outcome
  headlineAccent: 'Two minutes a day.',        // sky-blue second line
  stat: '+120%',                               // the hook number
  statMeaning: 'scalp blood flow per session · thicker hair measured at 24 weeks',
  now: 'Itchy, flaky scalp. Buildup shampoo only moves around. Never once properly cleaned.',
  after: 'A genuinely clean scalp. No itch, no flakes, no scalp odour. Thicker hair you can measure.',
  tileNow: 'Itchy, flaky scalp',               // compact tile version
  tileAfter: 'clean scalp, thicker hair',
}
```

Products 09, 10 (coming soon) and 11 (mixing bowl) get no `outcome`; components render nothing extra when the field is absent.

### Product page block (chosen: outcome headline + stat proof chip + photo + Now/With SOLUM panels)

Rendered at the top of `ProductPage.jsx`, above the description:

1. **Outcome headline** · bold Barlow Condensed, accent phrase in Sky Blue `#4A8FC7`
2. **Stat pill** · charcoal pill, Steel Blue border: big stat + its meaning in one line. The stat must always answer "so what" (never a bare number)
3. **Photo** · existing use shot (`media.gallery[0]`), left on desktop (40%), full-width above the panels on mobile
4. **Now / With SOLUM panels** · "Now" dimmed on charcoal `#181C24`, "With SOLUM" lit on deep-blue tint `#12233a` with Steel Blue border, pulsing arrow between. Side by side on desktop, stacked on mobile

No before photos exist or are needed: the "before" is always text on the dimmed panel; imagery is always the product in use.

### Lineup tile (chosen: option 3, transformation line + stat pill)

`ProductLineup.jsx` tile replaces the current tagline slot with:

- Transformation line: `tileNow` in dim bone → arrow in Sky Blue → `tileAfter` in bold bone
- Compact stat pill underneath: stat + short meaning

Taglines remain in the data (still used on product page hero and meta description).

### Mobile

Stack per approved mockup: headline → stat pill → photo → Now panel → arrow (rotated) → With SOLUM panel. Minimum sizes: 13px body, 11px labels (Harsha's hard rule). Tiles keep their current grid; the transformation line wraps to two lines if needed.

### Approved outcome copy (all 8 active products)

| # | Headline (+accent) | Stat · meaning | Now | With SOLUM |
|---|---|---|---|---|
| 01 | Clean everywhere. Stripped nowhere. · *Gentle enough for every area.* | **75×** · milder than SLS, the detergent in standard body wash | Tight, itchy skin after every shower. Standard wash strips the barrier and it takes 17 hours to recover. | Properly clean everywhere, barrier intact. No tightness, no irritation. Cedarwood + vetiver. |
| 02 | Smoother skin. Less odour. · *From the first use.* | **1 use** · weeks of dead skin visibly rolls off in one session | Rough, bumpy, dull skin. Dead cells never shed on their own and odour bacteria feed on them. | Visibly smoother skin and less body odour from the first session. Lotion finally absorbs properly. |
| 03 | Your whole back. Actually clean. · *60 seconds a day.* | **60 sec** · to clean the zone with the most oil glands on your body | A back you have never properly reached. Oil, bacteria and breakouts build there daily. | Every inch of your back cleaned daily. Silver ions keep the cloth itself clean between uses. |
| 04 | Thicker hair. Cleaner scalp. · *Two minutes a day.* | **+120%** · scalp blood flow per session · thicker hair measured at 24 weeks | Itchy, flaky scalp. Buildup shampoo only moves around. Never once properly cleaned. | A genuinely clean scalp. No itch, no flakes, no scalp odour. Thicker hair you can measure. |
| 05 | Clearer skin. Emptied pores. · *Once a week.* | **68%** · improvement in skin clarity from a single application | Clogged pores, dull skin, breakouts that keep coming back. Washing only cleans the surface. | Pores emptied of what causes spots and odour. Visibly clearer, firmer skin. |
| 06 | Skin properly fed. · *Not just moisturised.* | **1 ingredient** · cold pressed organic argan, nothing added | Dry, rough skin that lotion alone never quite fixes. The barrier stays broken. | The barrier rebuilt with the fatty acid your body cannot make. Absorbs fully, zero residue. |
| 07 | Hydrated all day. · *From a 3 minute habit.* | **10×** · absorption when applied within 3 minutes of towelling | Skin tight and dry by lunchtime. The shower takes more than it gives back. | Comfortable skin all day, barrier restored. And you smell amazing for hours · cedarwood + vetiver that lingers on skin. |
| 08 | No odour worry. · *All day, every day.* | **1 job** · a dedicated cloth built only for this · hands spread bacteria, this removes it | Hands for intimate cleansing. They spread bacteria as much as they remove it. The worry follows you all day. | Confident and clean, all day. Bamboo kun keeps the cloth itself clean between uses. |

Tile compact versions (`tileNow` → `tileAfter`):

| # | Tile line |
|---|---|
| 01 | Tight, stripped skin → clean everywhere, zero irritation |
| 02 | Rough, bumpy skin → visibly smoother, first use |
| 03 | A back never reached → fully clean in 60 seconds |
| 04 | Itchy, flaky scalp → clean scalp, thicker hair |
| 05 | Clogged pores, dull skin → visibly clearer skin |
| 06 | Dry skin lotion can't fix → barrier rebuilt, properly fed |
| 07 | Tight and dry by lunch → hydrated all day, smells amazing |
| 08 | Odour worry all day → confident all day |

### Claims guardrails

- Never "treats/cures dandruff" or "regrows hair". Allowed: flakes, itch, "thicker hair measured at 24 weeks" (study-backed hair shaft thickness), "+120% blood flow".
- Clay is never called "organic" (existing rule).
- Stats used are the ones already live in product copy (75×, 68%, 10×, +120%, 24-week study). No new claims introduced.

## Error handling

- Missing `outcome` field: components skip the block entirely (coming-soon products, mixing bowl).
- Missing gallery photo: block renders without the image column.

## Testing / verification

1. `npm run build` in `web/` passes.
2. Dev server visual check: home lineup tiles, product pages 01 to 08 (desktop + 375px), /buy, checkout, success page copy.
3. `grep -ri "tool" web/src` returns only TermsPage hits and non-copy identifiers (CSS class names in ComingSoon may be renamed or left; copy strings must be clean).
4. No em/en dashes introduced in new copy strings.
5. Existing e2e suite still passes.

## Follow-up (chosen, not in this build)

Homepage "Nobody ever gave you a system" section, **chaos vs system** direction: scattered grey scraps of the old routine on the left, the numbered 5-step 10-minute SOLUM system on the right. Sits after ProblemSection. Separate spec/plan when we pick it up.
