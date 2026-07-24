# Mobile Homepage and `/buy` Performance — Phase 1 Design

> Created 2026-07-24. Scope: `https://bysolum.co.uk/` and direct mobile landings on `/buy`.

## Goal

Improve the slowest mobile homepage visits and reduce unnecessary transfer on
return visits, without changing the purchase flow, wallet availability,
tracking events, or the visual character of the site.

## Baseline

PostHog Web Vitals for 2026-06-24 through 2026-07-24, filtered to mobile and
excluding test accounts:

| Route | Mobile Web Vitals events | Median FCP | Median LCP | p90 LCP | p90 INP |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 2,384 | 643 ms | 1,257 ms | 3,264 ms | 137 ms |
| `/buy` | 113 | 788 ms | 1,036 ms | 2,186 ms | 93 ms |

The homepage median is healthy, but its slowest tenth of mobile visits misses
the 2.5-second LCP target. `/buy` has a much smaller sample but is presently
within that target; Phase 1 must not make it slower.

Live response inspection found that fingerprinted JavaScript is Brotli encoded
but has `Cache-Control: public, max-age=0, s-maxage=31536000`. The CDN caches
it for a year, while browsers revalidate it on every return visit. The
homepage's mobile hero poster is correctly preloaded at about 11 KB. After the
load event, the page downloads a 506 KB mobile hero video and the poster images
for six below-fold ritual videos. A direct `/buy` landing also loads Stripe's
Express Checkout runtime before a shopper reaches the payment decision.

## Decisions

### 1. Cache only fingerprinted build assets immutably

Add a repository-managed Amplify `customHttp.yml` at the hosting app root.
Apply this header only to `/assets/*`:

`Cache-Control: public, max-age=31536000, immutable`

Vite fingerprints every file in this directory. A changed asset therefore has
a new URL, so long browser caching cannot serve an old JavaScript or stylesheet
after a deployment. Keep `index.html`, `/video/*`, `/products/*`, fonts, and
other stable public paths on Amplify's existing policy: several of them have
non-fingerprinted filenames and are intentionally replaceable.

Amplify supports versioned custom-header configuration in `customHttp.yml`;
the file must be at the repository root for this app's current layout. The
implementation will verify the exact response header on production after a
normal deployment.

### 2. Load ritual carousel media only when it is useful

Keep the ritual section's layout, controls, poster art, and user-triggered
playback unchanged. Replace eager media markup with a small viewport-aware
wrapper:

- Until the section is within a 600 px viewport margin, render the fixed-size
  media frame and its text overlay but no `<video>` and no poster image.
- When it enters that margin, load the active card's poster and retain
  `preload="none"` for its video source.
- Load an off-screen card's poster only when that card becomes active or enters
  the horizontal carousel viewport. Cards without video retain their existing
  lazy `<img>` behaviour.
- Preserve the existing `prefers-reduced-motion` path, keyboard activation,
  pointer activation, and progress instrumentation.

`preload="none"` currently prevents video-byte transfer but a `<video poster>`
still requests the poster as soon as the component mounts. Deferring both is
the required change. A fixed-size shell and generous root margin prevent a
visible layout shift or a blank card when visitors reach the section.

### 3. Measure the release rather than optimize by assumption

Phase 1 adds no new marketing SDKs and does not alter Meta, Google, TikTok,
Awin, PostHog, session replay, or Express Checkout timing.

Before deployment, record the built asset inventory and verify that the
homepage no longer discovers below-fold ritual posters during its initial
mobile render. After deployment, compare the same PostHog segments over a
minimum seven-day window, or until 500 mobile homepage Web Vitals events are
available, whichever is later.

Success criteria:

- Homepage mobile p90 LCP is at or below 2.5 seconds, or improves by at least
  15% from the 3,264 ms baseline without a regression in median LCP.
- `/buy` mobile p90 LCP remains at or below 2.5 seconds; its median remains no
  worse than 1,140 ms (10% above baseline).
- Mobile p90 INP remains below 200 ms on both routes.
- The published asset response has the intended immutable browser-cache header.
- The existing `/buy` E2E and unit suites continue to pass.

## Explicitly Out of Scope

- Deferring Stripe or removing the Express Checkout element. Stripe is about
  280 KB Brotli-compressed on a direct `/buy` landing, but it enables the
  prominent wallet path. Any change to its timing requires a separately
  designed, conversion-measured experiment.
- Route-splitting the eager homepage from the main application entry. It could
  reduce direct `/buy` JavaScript, but risks adding a request waterfall to the
  highest-volume homepage route and is a Phase 2 experiment.
- Delaying or removing advertising pixels, PostHog Web Vitals, or session
  replay. Those services are already deferred and have measurement value.
- Re-encoding or changing hero creative. The current responsive poster and
  delayed video strategy are sound; this phase only avoids unnecessary
  below-fold media.

## Files and Boundaries

- Create `customHttp.yml` — hosting-only cache header for hashed `/assets/*`.
- Modify `web/src/components/RitualInAction.jsx` — own the media deferral and
  preserve the carousel's public behaviour.
- Create a focused React hook only if it prevents the carousel component from
  mixing viewport-observation lifecycle with card rendering.
- Add or extend tests in `web/e2e` for the mobile carousel's existing visible
  and keyboard contracts if the new deferred media changes testable DOM state.
- Do not modify `web/src/pages/BuyPage.jsx`, `web/index.html`, payment
  functions, or analytics event contracts.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A stale HTML document points at new assets incorrectly | Do not cache `index.html` immutably; cache only Vite-hashed `/assets/*`. |
| Ritual cards visibly pop in | Preserve fixed dimensions and start loading 600 px before the section enters view. |
| Swiping to an unseen card feels slow | Begin its poster fetch when it enters the carousel viewport; retain the existing video `preload="none"` rule. |
| Checkout conversion changes | Do not modify Stripe, payment steps, wallet rendering, or tracking. |
| RUM noise is mistaken for a win | Use the stated sample/time window and compare p90 plus median, not a single synthetic run. |

## Verification

1. Run the relevant unit tests and the existing browser E2E suite.
2. Build the web application and inspect generated import sizes.
3. Use a 390 px mobile viewport to verify the homepage's hero poster still
   paints, the ritual media remains visually stable when it approaches the
   viewport, and its controls still work.
4. Confirm `/buy?kit=ground` still shows its accelerated checkout and complete
   the existing CI checkout coverage.
5. After deployment, check response headers for `/assets/*`, inspect the live
   mobile asset inventory, and perform the seven-day RUM comparison.
