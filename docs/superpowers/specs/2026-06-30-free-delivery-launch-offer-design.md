# Free Delivery Launch Offer — Design

> Created 2026-06-30. Surfaces the (already free) UK delivery as a visible, honest launch incentive: free delivery worth £5.95, launch offer ending 11 Aug 2026 or while launch stock lasts.

## Problem

UK delivery is already free and unconditional (SOLUM absorbs ~£3.85 Royal Mail Tracked 48 per box), but it only appears passively — one item in `TrustBar` ("Free UK delivery") and a line in the checkout delivery step. It does no motivating work. We want visitors to see free delivery as a reason to buy now.

## Goal

Present free delivery as a value-anchored, time-bound launch offer across the funnel, honestly and compliantly (no fake urgency, no fabricated price the brand would never charge), with zero backend changes.

## Decisions (locked)

- **Framing:** limited launch offer, value-anchored. Delivery presented as **worth £5.95** (a realistic UK tracked-delivery retail price SOLUM would charge post-launch), **free during the launch**.
- **End condition:** **11 August 2026** (6 weeks from 2026-06-30) **or while launch stock lasts**, whichever first. Genuine intent to end/re-evaluate then.
- **No auto-charge:** we do NOT build £5.95 checkout-charging logic. Frontend messaging only. Wording therefore stays "free delivery, worth £5.95, launch offer ends 11 Aug" — never "you will pay £5.95 after" (we are not building that, so we must not claim it).
- **No live stock counter:** wording is "while launch stock lasts"; we do not render a live `kit_inventory` count (avoids scope + scarcity-number risk).
- **Urgency treatment:** gentle — show `ends 11 Aug` plus `X days left` (computed from the end date). No ticking second-by-second countdown.
- **Top bar:** dismiss-for-session (re-appears next session).
- **Placements:** all four — sitewide top bar, hero line, kit cards, checkout total.
- **Copy rules:** no em/en/double dashes (use `·` or commas); min 13px body / 11px labels; SOLUM palette + Barlow Condensed.

## Components

### 1. Offer config — single source of truth

`web/src/lib/offer.js` (new). All placements read from here so copy, date, and the on/off switch live in one place.

```js
export const DELIVERY_OFFER = {
  enabled: true,
  value: '£5.95',          // anchored worth of UK tracked delivery
  valuePence: 595,         // for the struck-through checkout line
  endDate: '2026-08-11',   // launch offer end (6 weeks from launch)
};

export function offerActive(now = new Date()) {
  return DELIVERY_OFFER.enabled && now <= new Date(DELIVERY_OFFER.endDate + 'T23:59:59');
}

export function daysLeft(now = new Date()) {
  const end = new Date(DELIVERY_OFFER.endDate + 'T23:59:59');
  return Math.max(0, Math.ceil((end - now) / 86400000));
}
```

All placement components call `offerActive()` and render nothing when it returns false. Turning the offer off = `enabled:false` or a past `endDate`, in one file.

### 2. Sitewide top bar — `web/src/components/OfferBar.jsx` (new)

- Slim persistent bar, mounted in `App.jsx` inside `BrowserRouter`, above `<Routes>`, so it renders on every route above each page's `Nav`.
- Copy: `FREE UK DELIVERY · WORTH £5.95 · LAUNCH OFFER ENDS 11 AUG · {N} DAYS LEFT`
- Dismiss-for-session: a `×` sets `sessionStorage['offerbar_dismissed']='1'`; bar hidden for the rest of the session, returns next session. Hidden entirely when `!offerActive()`.
- Style: ground `#08090B`, text Bone `#F0ECE2`, Steel Blue `#2E6DA4` accent on "WORTH £5.95"; Barlow Condensed 600 uppercase, letter-spacing; label text ≥11px. Thin (~36px), centered, premium — not a discount ribbon.

### 3. Hero line — `web/src/components/Hero.jsx`

A small line under the primary CTA: `✓ Free UK delivery this batch · worth £5.95`. Rendered only when `offerActive()`. ≥13px, Bone with reduced opacity, checkmark in Steel Blue. Sits where the dated Father's Day delivery line currently is (that seasonal line is replaced by this).

### 4. Kit cards — `web/src/components/KitComparison.jsx`

In each purchasable kit card's price block, add a delivery line: `Delivery £5̶.̶9̶5̶ FREE · launch offer` (strike via `<s>` or `text-decoration:line-through`, with "FREE" in Steel Blue). Rendered only when `offerActive()`. Applies to GROUND + RITUAL (purchasable now); not the SOVEREIGN "coming soon" card.

### 5. Checkout total — `web/src/pages/BuyPage.jsx` (payment step order summary)

Add a `Delivery` row to the order summary: struck `£5.95` then `£0.00` (or "FREE"). Total is unchanged (delivery is genuinely free). Rendered only when `offerActive()`. Reinforces the saving immediately before payment. The existing delivery-step subhead ("Free shipping") is updated to reference the offer wording for consistency.

## Data flow

```
web/src/lib/offer.js  (enabled, value, valuePence, endDate, offerActive(), daysLeft())
        │
        ├── OfferBar.jsx        (App.jsx, every route; dismiss-for-session)
        ├── Hero.jsx            (line under CTA)
        ├── KitComparison.jsx   (struck delivery line per kit card)
        └── BuyPage.jsx         (struck delivery row in order summary)
```

No backend, no API, no DB. Turning the offer off or changing the date is a one-file edit.

## Testing / verification

- `offerActive()` true before 11 Aug 2026, false after; false when `enabled:false`. `daysLeft()` returns correct integer (e.g. 42 on 2026-06-30) and floors at 0.
- With offer active: all four placements render; copy contains no em/en/double dashes; struck £5.95 visible on kit cards + checkout; checkout total unchanged.
- With offer inactive (`enabled:false`): none of the four render; site falls back to plain "Free UK delivery" trust signal (TrustBar unchanged).
- OfferBar dismiss sets sessionStorage and hides for the session; reappears in a new session.
- Mobile: bar wraps/truncates gracefully; text ≥11px labels / ≥13px body.

## Out of scope

- £5.95 (or any) delivery auto-charge at checkout — not built.
- Live `kit_inventory` stock counter / "N left" scarcity number.
- A/B testing the bar copy (existing AB framework could test later).
- Any backend / Stripe / migration change.
- Email or ad-channel versions of the offer.

## Compliance note

Honest because: delivery is genuinely free now; £5.95 is a realistic tracked-delivery price SOLUM would charge post-launch (not a fabricated anchor); the 11 Aug end is a real target with genuine intent to end/re-evaluate; and we make no claim we are not backing (no "pay £5.95 after" since no auto-charge is built). Aligns with brand honest-labelling rules and UK DMCCA 2024 / ASA guidance on time-limited offers and reference pricing.
