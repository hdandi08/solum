# Perf Round 2: Safe Wins + Invisible-Bounce Measurement — Design

**Date:** 2026-07-07
**Status:** Approved by Harsha (chat, 2026-07-07)
**Context:** Round 1 (commit `c3274f7`) took prod mobile Lighthouse 27 → 43 (LCP 17.5s → 7.0s)
via lazy routes, deferred hero video + 540p mobile rendition, and deferred Meta/TikTok pixels.
Real-user data (PostHog `$web_vitals`, 30d, mostly pre-fix): mobile LCP p50 1.5s / p75 2.1s /
p90 2.9s — already "good" per CWV. Ad-vs-organic QualifiedVisit gap is device-independent
(mobile ad 6.8% vs desktop ad 7.0%), pointing at traffic intent, not speed. Harsha chose
**safe wins + measurement** over homepage prerender/SSG (deferred as a possible round 3).

## Goals

1. Remove the remaining low-risk critical-path costs (fonts, PostHog extras, oversized images).
2. Measure the cohort no analytics currently sees: paid clicks that abandon before the app
   bundle boots ("invisible bounce").

Success criteria: prod mobile Lighthouse ≥ mid-50s; real-user mobile LCP p75 trending ≤ 1.8s;
`early_hit` vs `$pageview` ratio queryable per source/device after a few days of ad traffic.
Explicit non-goals: prerender/SSG, hero changes (video stays, per Harsha), analytics init timing.

## 1. Self-hosted fonts

- Download woff2 (latin subset) for: Bebas Neue 400; Barlow Condensed 300/400/500/600/700 + 300 italic.
- Store in `web/public/fonts/`. Add `@font-face` rules (all `font-display: swap`) inlined in a
  `<style>` block in `index.html` (no extra CSS request).
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the two above-the-fold
  fonts only: Bebas Neue 400 (hero title) and Barlow Condensed 300 (body).
- Remove the Google Fonts `<link>` stylesheet + both preconnects.
- Risk: none meaningful; fonts are static assets on Amplify CDN. Verify glyph coverage (£ sign,
  arrows) on the live pages.

## 2. PostHog diet (`web/src/lib/analytics.js`)

- `disable_surveys: true` — zero surveys configured; drops the 32KB surveys.js fetch.
- Defer the session recorder off the paint path:
  - `disable_session_recording: true` in `posthog.init` config.
  - Start via `posthog.startSessionRecording()` at **window load OR 4s after init, whichever
    comes first** (guards against late load events on slow phones).
  - Existing `session_recording` masking config stays (it applies when recording starts).
- Event capture (init timing, pageviews, capture_pageleave, QV, purchases) untouched.
- Accepted trade-off (Harsha signed off): sessions shorter than ~load-or-4s get no replay;
  replays that exist start from a full snapshot, losing only pre-start dead time.
- Post-deploy check: visit prod, confirm the recording appears in PostHog.

## 3. Image slimming + LCP preload

- Convert to right-sized WebP (keep PNG/JPG originals in git history only; components point at
  new `.webp` paths):
  - `/icons/problem-*.png` (6 files, 34–84KB each) → 144px (48px display @3x), expect ~3–8KB each.
  - `/icons/pillar-*.png` (WhatSolumIs) → same treatment.
  - `/harsha.jpg` 114KB → 2 usages (FounderSection photo, FounderChat avatar); resize to largest
    rendered size @2x, expect ~20–30KB.
- `<link rel="preload" as="image" href="/video/banner-poster.jpg">` in `index.html` — the hero
  poster is the likely LCP element and currently waits for React to render before fetching.
- Tooling: `cwebp` or ffmpeg (both local). Visual check on retina viewport before commit.

## 4. Invisible-bounce beacon

- Inline snippet at the **top of `<head>`** in `index.html`, before all other tags that fetch:
  sends one `early_hit` event via `navigator.sendBeacon` (fallback: `fetch` keepalive) to
  `https://eu.i.posthog.com/i/v0/e/` using the public `phc_` project token (already public in
  the bundle — no secret exposure).
- Payload: event `early_hit`, random UUID distinct_id (no cookie read — this event is
  deliberately person-agnostic), properties: `path`, `utm_source`, `utm_campaign`, `referrer`,
  `$current_url`, `screen_width`. Production hostname gate like the pixels.
- Analysis (new script `scripts/posthog/invisible_bounce.py`, PH key from `.env.posthog`):
  invisible-bounce rate = 1 − (`$pageview` events / `early_hit` events), split by utm_source
  presence × device class (from screen_width), per day.
- Sanity check once live: compare a day of Meta Ads Manager link clicks vs `early_hit` count
  for ad-tagged traffic.
- Volume cost: ~1 extra event per page load — negligible at current traffic.

## Verification

1. `npm run build` + local `vite preview` Lighthouse mobile run (compare vs 60 local baseline).
2. Playwright functional pass (reuse round-1 script): homepage renders, no Stripe on /,
   fonts render (no FOUT to fallback), /buy works.
3. Confirm in the network trace: no fonts.googleapis.com, no surveys.js before load,
   recorder starts ≤4s, `early_hit` beacon fires before the app bundle request.
4. Deploy dev → Harsha tests → sign-off → master → re-run Lighthouse on prod → verify a
   session replay appears in PostHog.

## Rollout / rollback

Single commit on dev, standard dev → master flow. Every change is independently revertible;
the beacon and PostHog flags are one-liners. No DB, no edge functions, no CDN invalidations.
