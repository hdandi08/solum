# /buy Express Checkout Instrumentation — Design

Date: 2026-07-13
Status: Part A approved for build. Part B deferred until Part A data confirms the failure mode.

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

## Part B — IAB checkout gate (DEFERRED — do not build yet)

Decision gate: review Part A data after ~48h of meaningful ad traffic.

- If IAB visitors show ~zero `express_clicked` and no form input → build the gate: blocking choice card on
  /buy details step for in-app-browser users (headline "Pay with Apple Pay, Google Pay or PayPal", app-aware
  copy, primary "Open in browser ↗" reusing existing breakout machinery — Android `intent://` auto-open,
  iOS instruction overlay — secondary quiet "continue here — pay by card" with sessionStorage persistence,
  events `iab_gate_shown/open_clicked/continue_clicked`, `?forceIab=1` preview override, replaces the
  current inline nudge on the details step only).
- If instead visitors tap Link/PayPal and cancel/error → different fix; re-diagnose from the new events.

Approved layout for the gate (if built): blocking choice card, chosen over prominent-inline-card and
Android-auto-breakout on 2026-07-13.

## Out of scope

- Changing ad landing page (traffic is cold; stays on `/`).
- Home kits-section conversion work (separate effort).
- MX check changes (confirmed not the leak: zero `email_mx_blocked` since Friday).
