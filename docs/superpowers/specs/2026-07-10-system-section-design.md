# Homepage System Section (chaos vs system) + Section Reorder

**Date:** 2026-07-10
**Status:** Approved (visual direction chosen by Harsha in mockup session; placement confirmed in chat)

## Goal

Replace the placeholder Reviews section on the homepage with the "Nobody ever gave you a system" section, in the chaos-vs-system visual direction Harsha approved. Also reorder: Products lineup moves above The Ritual.

## Changes

### 1. New `SystemSection` component (replaces `<Reviews />` in FullSite)

Placement: exactly where `<Reviews />` sat — after `KitComparison`, before the (reordered) `ProductLineup`.

Content (from the approved mockup, option "chaos vs system"):

- Kicker: `WHY NOTHING CHANGED UNTIL NOW` (Sky Blue, letterspaced)
- Headline (Bebas Neue): `Nobody ever gave you` / `a system for your body.` — second line Sky Blue
- Two panels side by side, arrow between:
  - **Left ("EVERY SHOWER UNTIL TODAY")** — charcoal, dashed border, five grey "scraps" slightly rotated/offset like scattered notes: `Hot water on the back` · `Whatever wash was on offer` · `A quick scrub with your hands` · `Back never reached` · `Scalp never once cleaned`
  - **Right ("THE SOLUM SYSTEM · 10 MINUTES")** — deep-blue tint `#12233a`, Steel Blue border, five numbered steps with filled Steel Blue number dots: `1 Scalp deep-cleaned · 2 min` · `2 Wash that strips nothing` · `3 Dead skin off, everywhere` · `4 Back fully cleaned · 60 sec` · `5 Locked in within 3 minutes`
- Mobile (≤768px): panels stack vertically, arrow rotates 90° between them
- Section has `id="system"` so the existing FullSite `section_viewed` IntersectionObserver tracks it automatically; uses `reveal` class for the standard entrance animation
- No CTA inside the section (ProductLineup follows immediately)

### 2. Section reorder in `FullSite.jsx`

Old: Problem → Kits → Reviews → Ritual → Products → Unboxing
New: Problem → Kits → **System** → **Products** → **Ritual** → Unboxing

### 3. Removals

- `<Reviews />` usage + import in FullSite
- Delete `web/src/components/Reviews.jsx`, `web/src/components/ReviewsBadge.jsx` (already orphaned), `web/src/data/reviews.js` — all placeholder content, no other importers (verified)
- If `web/src/data/abtests.js` references a reviews test, leave the registry intact but note it in the report (stale entry is harmless; removing A/B registry entries is out of scope)

### 4. Outcome lines in kit product lists (Harsha: outcome-only, confirmed for /buy too)

Every kit product-list row gains a small second line under the product name showing the product's outcome (`p.outcome.tileAfter`, e.g. "clean scalp, thicker hair"). No before-half, no arrow — outcome only, so rows stay compact. Products without `outcome` (bowl, coming-soon) show no second line.

Applies to all three list variants:
- `KitComparison.jsx` expandable product list (homepage kit cards)
- `BuyPage.jsx` desktop order-summary list (`.co-product` rows)
- `BuyPage.jsx` mobile bottom-sheet list (`.co-mobile-product` rows)

Style: 13px, `var(--stone)`, weight 300, under the name; "worth £X" chip stays on the row.

## Constraints

Site-wide rules apply: no em/en dashes or double hyphens in copy (use `·`); min font sizes 13px body / 11px labels; brand colours via existing CSS vars; Bebas Neue only for headings; never "soap"; wordmark via `/solum-wordmark-clean.svg` only (not applicable here).

## Verification

Unit suite (91 pass baseline), build, e2e product-lineup.spec.ts (homepage), new e2e assertions: `#system` section visible on `/`, Reviews gone, ProductLineup appears before RitualInAction in DOM order. Visual check desktop + 375px.
