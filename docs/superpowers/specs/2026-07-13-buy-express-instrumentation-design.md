# /buy Express Checkout Instrumentation — Design

Date: 2026-07-13
Status: Parts A and B both approved for build (2026-07-13 — Harsha: most /buy visitors never see
Apple/Google Pay, so the IAB gate is the high-leverage fix; no need to wait for Part A data).

## Background

Sales campaign running since Fri 2026-07-11 14:00 (Meta, purchase-optimised, cold traffic landing on `/`).
Funnel since then (unique people, prod hosts): 126 visitors → 65 saw kits section → 8 reached /buy →
1 submitted checkout details → 1 purchase.

Diagnosis found a tracking blind spot on /buy: `checkout_initiated` (method `express`) only fires after the
user completes the entire wallet sheet AND payment-intent creation succeeds (`BuyPage.jsx:677`). The
ExpressCheckoutElement `onClick` captures nothing, `onCancel` is a no-op, and all error paths return before
any capture. 5 of 8 /buy visitors left within ~60s without typing anything — we cannot tell whether they
tapped a wallet button and it failed, or never tried.

Also confirmed from `express_availability` data: in the Facebook/Instagram in-app browser only Stripe Link
renders (no Apple Pay, no Google Pay, no PayPal); one Android IAB visitor got zero express options across
4 visits and never bought.

## Part A — event instrumentation (build now)

All events carry `{ kit, source }`. All changes in `web/src/pages/BuyPage.jsx`.

| Event | Where | Extra properties |
| --- | --- | --- |
| `express_clicked` | ExpressCheckoutElement `onClick` | `wallet: event.expressPaymentType` |
| `express_cancelled` | ExpressCheckoutElement `onCancel` | — |
| `express_error` | Every express `onConfirm` failure path | `stage: 'submit' \| 'create_intent' \| 'confirm' \| 'network'`, `message` (truncated ~200 chars) |
| `checkout_error` | Standard path failures: PI creation in `handleDeliveryNext` (non-OK + network), card `confirmPayment` failure on the payment step | `stage: 'create_intent' \| 'confirm' \| 'network'`, `message` (truncated ~200 chars) |

Notes:
- `event.expressPaymentType` is available on the ECE `onClick` event; the `resolve(...)` call is unchanged.
- Do not capture form-validation errors (email format, phone, address required) — user typos, noisy;
  `email_mx_blocked` already covers the MX case.
- No behaviour changes: capture calls only, existing error handling untouched.

### Success criteria

After ~48h of ad traffic we can answer, per /buy visitor: did they tap a wallet (which one), cancel the
sheet, hit an error (at which stage), or never try? `express_clicked` minus (`checkout_initiated` method
express + `express_cancelled` + `express_error`) ≈ 0.

### Verification

- Unit/lint pass; manual dev run: tap a wallet button on localhost with Stripe test mode where feasible,
  confirm events in PostHog dev traffic.
- Deploy to dev branch; Harsha sign-off before merge to master (standard workflow).

## Part B — IAB checkout gate (build now)

Blocking choice card on the /buy details step for in-app-browser users. Layout chosen over
prominent-inline-card and Android-auto-breakout on 2026-07-13.

- **Trigger:** `isInAppBrowser()` and platform iOS/Android, on the details step only, unless the user chose
  "continue here" earlier this session (sessionStorage flag `solum_iab_gate_continue`). Detection is
  synchronous (user-agent), so no flicker and no dependency on Stripe's async `express_availability`.
- **Render:** the card mounts *in place of* the express wrap + details form (they do not mount until the
  user chooses a path). Existing kit summary above stays.
- **Copy (app- and platform-aware):** headline "Pay with Apple Pay, Google Pay or PayPal" (lead wallet =
  Apple Pay on iOS, Google Pay on Android); body "They only work in your full browser, not inside the
  {Facebook/Instagram/TikTok/this} app" (app name from `detectInAppBrowser()`).
- **Primary button "Open in browser ↗":** reuse existing breakout machinery — Android `intent://`
  auto-open with fallback, iOS instruction overlay, `distinct_id` + full URL (incl. `?kit=`) forwarded via
  `buildBreakoutUrl`.
- **Secondary quiet link "or continue here — pay by card":** sets the session flag and reveals the normal
  express + form flow.
- **Housekeeping:** replaces the current inline `InAppBrowserBanner variant="inline"` on the details step;
  the fixed top banner on other steps stays. Honest copy: Link still renders in-app, so the card names the
  three missing wallets and never claims payment is impossible in-app.
- **Events:** `iab_gate_shown` (once per session), `iab_gate_open_clicked`, `iab_gate_continue_clicked` —
  all with `{ platform, app, kit, source }`.
- **Preview override:** `?forceIab=1` query param forces the gate in a normal browser for verification.

### Success criteria

IAB visitors on /buy either break out to the system browser (measurable: `iab_gate_open_clicked` followed
by a new session with the same `distinct_id` in a real browser) or knowingly continue to the card form
(`iab_gate_continue_clicked`). The silent 60-second bounce with zero interaction should shrink.

## Out of scope

- Changing ad landing page (traffic is cold; stays on `/`).
- Home kits-section conversion work (separate effort).
- MX check changes (confirmed not the leak: zero `email_mx_blocked` since Friday).
