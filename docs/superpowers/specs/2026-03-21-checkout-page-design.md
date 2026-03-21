# SOLUM Checkout Page — Design Spec

> **Spec:** Checkout page (Spec 3 sub-task)
> **Route:** `/checkout?kit=ground` | `/checkout?kit=ritual` | `/checkout?kit=sovereign`
> **Reference:** `docs/superpowers/specs/2026-03-20-solum-platform-master-decisions.md`
> **Primary risk to solve:** Price anxiety + commitment anxiety at the point of purchase

---

## Goal

Replace the checkout modal in `KitComparison.jsx` with a dedicated `/checkout` page. The page must convert by keeping the kit summary — price justification and subscription reassurance — visible alongside the form at all times.

---

## Architecture

**New file:** `web/src/pages/CheckoutPage.jsx`

**Router update:** `web/src/App.jsx` — add `/checkout` route

**KitComparison update:** Replace modal + `openModal` state with `useNavigate` → `/checkout?kit=${kit.id}`

No new data files needed. `CheckoutPage` imports from existing `KITS` and `PRODUCTS` data constants.

---

## Layout

Two-column on desktop. Left: form. Right: sticky kit summary.

On mobile (≤768px): right column compresses to a compact summary bar pinned below the nav, form below it. Both columns stack full width.

---

## Left Column — Form

**Header:**
- Back link: `← Choose a different kit` → navigates to `/#kits`
- Eyebrow (11px, blue, letterspaced): `{KIT NAME} · £{firstBoxPrice} FIRST BOX`
- Heading (Bebas Neue, large): `START YOUR RITUAL.`
- Subhead (Barlow Condensed 300, mist): `Takes 30 seconds. You'll be at Stripe in a moment.`

**Form fields:**
- First name + Last name — side by side (required: first name only)
- Email — full width (required)
- Birth year + Birth month — side by side, clearly labelled as optional with reason: `Optional — helps us understand who we're building for`

**Submit:**
- Full-width bone button: `GO TO CHECKOUT →`
- Disabled + "Redirecting…" text while awaiting Edge Function response
- Below button: `🔒 Secure checkout via Stripe · We never share your data` (small, stone)

**Error state:** Inline error message below the form fields in muted red if Edge Function returns an error.

---

## Right Column — Sticky Kit Summary

Sticky positioned so it stays visible as the user fills the form.

**Price block:**
- Kit name in Bebas Neue (large)
- `£{firstBoxPrice}` — large, bone
- `FIRST BOX` — small label, stone, uppercased
- `then £{monthlyPrice}/mo` — mist
- Per-day calculation: `That's £{(monthlyPrice / 30).toFixed(2)} a day` — stone, italic

**Product list:**
- Divider
- Section label: `WHAT'S IN YOUR BOX`
- Each product: number (blue) + name — coming-soon items dimmed with `*`
- SOVEREIGN footnote: `* Coming soon — included when available`

**Trust signals:**
- Divider
- Three lines each prefixed with `✓` in blue:
  - `Cancel any time — no questions asked`
  - `Tools last 6–12 months — only consumables replenish monthly`
  - `Ships within 48hrs of order`

**Upgrade nudge (GROUND only):**
- Subtle card below trust signals, blue border
- Copy: `Most customers upgrade to RITUAL. Adds argan body oil — the step that changes what your skin feels like long-term.`
- Link: `Upgrade to RITUAL — £{85} first box →` → navigates to `/checkout?kit=ritual`

---

## Checkout Logic

On submit, `CheckoutPage` calls `create-checkout-session` Edge Function with:

```js
{
  kit_id, email, first_name, last_name,
  birth_year, birth_month,
  success_url: `${origin}/success?kit=${kit_id}`,
  cancel_url:  `${origin}/checkout?kit=${kit_id}`,
}
```

On success: `window.location.href = data.url` (Stripe hosted checkout).
On error: display inline error, re-enable submit button.

Note: `cancel_url` returns the user to the checkout page (not `/#kits`) so they don't lose their kit selection if they back out of Stripe.

---

## Validation

- First name: required, non-empty after trim
- Email: required, basic format check (`includes('@')`)
- Last name, birth year, birth month: all optional
- Birth year: if provided, integer between 1940–2006
- Birth month: if provided, integer between 1–12

---

## Kit Not Found

If `?kit=` param is missing or invalid, redirect to `/#kits` immediately.

---

## Files Touched

| File | Change |
|---|---|
| `web/src/pages/CheckoutPage.jsx` | Create |
| `web/src/App.jsx` | Add `/checkout` route |
| `web/src/components/KitComparison.jsx` | Remove modal + state, replace CTA with `useNavigate` |

---

## CSS Tokens

All existing tokens from `global.css`. No new tokens needed.

Key rules:
- Body copy: min 15px, `font-weight:300`
- Labels/eyebrows: 11px, `letter-spacing:5px`, uppercase, `color:var(--blue)`
- Headings: Bebas Neue, `clamp(36px,4vw,64px)`
- Right column sticky: `position:sticky; top:80px` (clears the 64px nav)

---

*Last updated: 2026-03-21*
