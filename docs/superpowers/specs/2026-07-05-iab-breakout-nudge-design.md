# In-App-Browser Break-Out Nudge — Design

> Date: 2026-07-05
> Status: Approved (design)
> Area: `/buy` checkout, `web/`

## Problem

Most SOLUM ad traffic (Meta, TikTok) opens `/buy` inside a social app's
**in-app browser** (IAB) — an embedded `WKWebView`/Android WebView, not real
Safari/Chrome. Apple deliberately does **not** expose the Apple Pay JS API
inside a WKWebView, and Google Pay is unreliable in iOS webviews. As a result,
a large share of paid-traffic users never see the Express Checkout wallet
buttons and drop straight to the manual form.

Stripe **Link** and **PayPal** already work inside the IAB (both are enabled),
so the remaining prize of leaving the webview is specifically **Apple Pay (iOS)**
and **Google Pay (Android)**.

There is no merchant-side way to stop Meta/TikTok from using their IAB, and no
reliable programmatic escape on iOS. The only lever is to nudge the user, from
our own page, to reopen the current URL in their system browser.

## Goal

On `/buy`, when the session is an in-app browser, offer a low-friction,
dismissible nudge to reopen in the system browser — where the wallets work —
**without breaking ad attribution or PostHog session continuity** across the
browser jump.

Non-goals (v1): auto-redirect, site-wide banners, server changes, A/B wiring.

## Decisions (locked with stakeholder)

- **Aggressiveness:** dismissible nudge banner, never an auto-redirect. Nobody
  gets trapped or bounced out of the app involuntarily.
- **iOS tap:** show an instructions overlay ("Tap ⋯ / aA → Open in Safari").
  Apple provides no reliable programmatic escape, so instructions are the honest,
  unbreakable path.
- **Android tap:** navigate to an `intent://` URL that opens the user's default
  browser automatically, with the full URL preserved.
- **Target scope:** both iOS and Android in-app browsers.
- **Attribution:** forward the full query string **and** the PostHog
  `distinct_id`, and re-adopt the `distinct_id` on the destination side.

## Architecture

### `web/src/lib/inAppBrowser.js` (extend — pure, testable)

Already contains `detectInAppBrowser(ua)` and `isInAppBrowser(ua)`. Add:

- `detectPlatform(ua = navigator.userAgent) → 'ios' | 'android' | 'other'`
  - iOS: `/iPhone|iPad|iPod/i`, or iPadOS masquerading as Mac
    (`/Macintosh/i` with touch — best-effort; acceptable to treat unknown as
    `other`).
  - Android: `/Android/i`.
- `buildBreakoutUrl(distinctId) → string`
  - Start from `window.location.href` (includes path + full query string).
  - Append `distinct_id=<distinctId>` as a query param (only if provided and not
    already present). All existing params (`source`, `kit`, `utm_*`, `fbclid`,
    `ttclid`) are preserved by construction.
  - Returns an absolute `https://` URL.
- `buildAndroidIntentUrl(httpsUrl) → string`
  - Format:
    `intent://<host><path><?query>#Intent;scheme=https;S.browser_fallback_url=<encodeURIComponent(httpsUrl)>;end`
  - **No hardcoded `package=`** → Android's intent resolver opens the user's
    default browser (works even if Chrome isn't installed). `browser_fallback_url`
    covers the no-handler case.
  - **Hash guard:** the intent format uses `#Intent;…` as its delimiter, so a
    source URL containing its own `#fragment` would collide. `/buy` URLs use
    `?query` not `#hash`; the function must still strip/ignore any fragment
    defensively so the intent string is always well-formed.

### `web/src/components/InAppBrowserBanner.jsx` (new)

- Self-contained; rendered once at the top of `/buy`.
- Renders **only** when `isInAppBrowser()` is true and `detectPlatform()` is
  `ios` or `android`, and the banner hasn't been dismissed this session.
- Slim top banner. Copy is **platform-aware** so it never names the wrong wallet:
  iOS → *"⚡ Faster checkout — open in your browser for 1-tap Apple Pay ↗"*;
  Android → *"⚡ Faster checkout — open in your browser for 1-tap Google Pay ↗"*.
  Dismiss (X) on the right.
- **Tap behavior:**
  - Android → `window.location.href = buildAndroidIntentUrl(buildBreakoutUrl(distinctId))`.
  - iOS → open an instructions overlay (modal) with the manual steps + a "Got it"
    close.
- **Dismiss:** hide and persist a flag in `sessionStorage`
  (`solum_iab_banner_dismissed`) so it doesn't reappear during the session.
- Styling: matches checkout aesthetic (charcoal ground, steel/sky-blue accent,
  Barlow Condensed). Respects min font sizes (≥13px body, ≥11px labels). Colocated
  CSS or a small style block consistent with existing checkout components.

### `web/src/lib/analytics.js` (extend)

- In `initAnalytics()`, before `posthog.init`, read `distinct_id` from
  `window.location.search`. If present, pass
  `bootstrap: { distinctID: <value> }` to `posthog.init` so the destination
  browser session continues the same PostHog person rather than minting a new one.
- After init, strip `distinct_id` from the URL with
  `history.replaceState` so it doesn't linger or get re-forwarded.
- The existing `in_app_browser` / `is_in_app_browser` super-properties remain.

### `web/src/pages/BuyPage.jsx` (wire)

- Render `<InAppBrowserBanner />` at the top of the `/buy` layout (above the
  checkout content, below the checkout nav).

## Data flow (browser jump)

1. User on `/buy?source=…&fbclid=…` inside Instagram IAB taps the banner.
2. `buildBreakoutUrl` produces
   `https://bysolum.co.uk/buy?source=…&fbclid=…&distinct_id=<id>`.
3. Android: wrapped in an `intent://` URL → default browser opens it. iOS: user
   follows overlay steps; the app opens the current URL as-is (params intact).
4. In the system browser, `initAnalytics` bootstraps PostHog from `distinct_id`
   (continuous person), then strips the param. Meta/TikTok pixels re-fire using
   `fbclid`/`ttclid` from the URL → attribution preserved.
5. Express Checkout now offers Apple Pay / Google Pay.

## Instrumentation

Three PostHog events (each carries `platform` and `in_app_browser`):

- `iab_banner_shown` — on first render.
- `iab_banner_clicked` — on tap (before navigating / opening overlay).
- `iab_banner_dismissed` — on X.

These let us measure show → click → (downstream) purchase and decide later
whether an A/B test or more aggressive treatment is warranted.

## Testing

- Unit (vitest), colocated:
  - `detectPlatform` — iOS / Android / other UA strings.
  - `buildBreakoutUrl` — preserves existing query params; appends `distinct_id`;
    idempotent if `distinct_id` already present; no-op distinctId handling.
  - `buildAndroidIntentUrl` — correct `intent://…;scheme=https;…;end` shape,
    `browser_fallback_url` is URL-encoded, fragment stripped/guarded.
- `detectInAppBrowser` already unit-tested.
- Manual/device check: iOS IAB shows overlay; Android IAB opens default browser
  with params intact; real Safari/Chrome show no banner.

## Scope guardrails (YAGNI)

- `/buy` only (not site-wide).
- No auto-redirect.
- No server-side changes.
- No A/B wiring in v1 — the three events inform whether it's worth adding.
