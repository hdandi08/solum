# SOLUM — Awin Attribution Safety (Phase 1) Design

> Date: 2026-07-30  
> Status: design approved; awaiting written-spec review  
> Goal: make Awin checkout attribution safe before enabling broader partner activity, without changing the one-time purchase, Meta, or TikTok flows.

## Problem

Awin appends `source=aw` and `awc` to affiliate landing links. The current checkout treats every `source` value as an order-flow source, so `source=aw` can bypass the expected one-time checkout route. The client success page and the Stripe webhook also hard-code Awin channel `aw`, so a later Meta or TikTok paid click can still produce an Awin-commissionable conversion.

The current client sale pixel and server-to-server request use the same PaymentIntent reference. Awin may deduplicate them, but the integration must have one conversion authority rather than relying on that deduplication.

## Decisions

### 1. Keep order-flow source separate from marketing attribution

`source` continues to select the checkout/order flow and is restricted to these values:

- `first_batch`
- `gift`
- `tiktok_shop`

Any other URL or API value, including Awin's `source=aw`, resolves to `first_batch`. The payment-intent Edge Function applies the same allow-list defensively, so an external caller cannot store `aw` or another unknown source in an order.

Marketing attribution is carried separately as `awc` and `awin_channel`; it must never alter order-flow routing.

### 2. Store bounded, last-paid-channel attribution in the browser

Create a focused browser helper with this return shape:

```js
{
  awc: string | undefined,
  channel: 'aw' | 'display' | 'ppc' | 'email' | undefined,
}
```

The helper stores a JSON record in `localStorage` with an `expiresAt` timestamp exactly 30 days after capture, matching the Awin programme attribution period. Expired records are deleted before use.

It records the most recent recognised paid click from the landing URL, in this precedence order:

1. A paid UTM for Google or Bing search (`utm_source` Google/Bing, or `utm_medium` `cpc`, `ppc`, or `paid_search`) sets `ppc`.
2. A paid-social UTM (`utm_source` Meta, Facebook, Instagram, or TikTok; or `utm_medium` `paid_social` or `social_paid`) or a `ttclid` sets `display`.
3. An email UTM (`utm_source=email` or `utm_medium=email`) sets `email`.
4. An Awin click checksum (`awc`) or `source=aw` sets `aw`.

A UTM/`ttclid` signal intentionally wins over an Awin signal on the same URL. This supports a later paid-social or paid-search visit after an Awin click: the Awin checksum remains available for deduplication, while the reported channel becomes the actual latest paid channel.

The helper may read the browser `awc` cookie to finish an active Awin journey, but it does not migrate the old unbounded `localStorage.awc` value. That prevents historic values from becoming commissionable indefinitely after deployment. It must not send the checksum to PostHog, Meta, TikTok, or client logs.

## Conversion flow

```text
affiliate / paid landing
  -> capture bounded attribution
  -> one-time checkout source normalised to first_batch/gift/tiktok_shop
  -> PaymentIntent metadata: awc + awin_channel
  -> Stripe payment_intent.succeeded webhook
  -> one Awin S2S conversion, using awin_channel
```

### Browser checkout

The application captures attribution at route entry and re-reads it when creating a PaymentIntent. Both express and standard payment paths send `awc` and `awin_channel` to `create-first-box-payment-intent`.

### PaymentIntent creation

The Edge Function writes only validated values to Stripe metadata:

- `source`: one of the three order-flow sources above.
- `awc`: the checksum, if supplied.
- `awin_channel`: one of `aw`, `display`, `ppc`, or `email`, if supplied.

### Stripe webhook: the sole Awin conversion authority

The webhook sends an Awin S2S request only when all of the following are true:

- the payment is live;
- a non-empty `awc` exists; and
- `awin_channel` is one of the four supported channel values.

It uses that validated channel for `ch`, `DEFAULT:<amount>` for `parts`, the PaymentIntent ID for `ref`, and the checksum for `cks`. Missing or invalid channel metadata fails closed: no Awin conversion is sent. That is deliberately safer than defaulting a financially meaningful conversion to `aw`.

The browser success page stops calling `awinConversion`; the helper and its client sale/fallback-pixel logic are removed. Meta, Google Ads, and TikTok success events remain unchanged. Their existing client/server Purchase deduplication remains outside this phase.

For a Meta-last path after an Awin click, the S2S payload contains `ch=display` and the original `cks`. Awin receives the deduplication signal but must not treat the sale as Awin-last-click. Awin specifies that `aw` must only be used when Awin is the last-click referrer. [Awin channel documentation](https://help.awin.com/developers/docs/channel-parameter)

## Files and boundaries

| File | Responsibility after this phase |
| --- | --- |
| `web/src/lib/awinAttribution.js` | Pure source normalisation and bounded browser attribution capture. |
| `web/src/lib/awinAttribution.test.js` | Vitest coverage for order-source and last-paid-channel decisions. |
| `web/src/App.jsx` | Capture attribution once when the route changes. |
| `web/src/pages/BuyPage.jsx` | Use normalised checkout source and include attribution metadata in both PaymentIntent requests. |
| `web/src/pages/SuccessPage.jsx` | Remove the browser Awin sale call only. |
| `supabase/functions/create-first-box-payment-intent/index.ts` | Validate and persist `awin_channel` plus the allow-listed order source. |
| `supabase/functions/_shared/awin.ts` | Pure construction/validation of the Awin S2S request. |
| `supabase/functions/_shared/awin.test.ts` | Deno tests for a valid `aw` payload, a valid `display` payload, and fail-closed invalid metadata. |
| `supabase/functions/stripe-webhook/index.ts` | Delegate to the shared S2S helper and send exactly one Awin conversion from the webhook. |

## Tests and acceptance criteria

### Browser/Vitest

1. `source=aw&awc=...` normalises checkout source to `first_batch`, retains the checksum, and records channel `aw`.
2. `source=tiktok` remains `tiktok_shop`.
3. A later `utm_source=meta&utm_medium=paid_social` visit retains the current checksum but changes channel to `display`.
4. An expired attribution record is deleted and returned as undefined.
5. An unbounded legacy `localStorage.awc` key is not reused.

### Edge/Deno

1. An `aw` checkout produces a request with `ch=aw` and the expected `cks`, `ref`, `parts`, and currency.
2. A Meta-last checkout produces `ch=display` with the same request shape.
3. A missing or invalid channel produces no Awin request.
4. A non-live PaymentIntent produces no Awin request.

### End-to-end acceptance

- `https://bysolum.co.uk/buy?source=aw&awc=<valid-checksum>` follows the ordinary one-time GROUND/RITUAL checkout path.
- A live Awin-last test order appears once in Awin, with the Stripe PaymentIntent ID as the transaction reference.
- A test path that starts with Awin and later reaches the site through a Meta-tagged paid URL emits `ch=display`, not `ch=aw`.
- Existing Meta/TikTok checkout and purchase tests continue to pass.

## Out of scope for Phase 1

- Consent banner and consent-mode integration.
- Route-safe MasterTag loading; Awin says the tag should not be appended to pages that process payment or PII. This is Phase 2. [Awin MasterTag guidance](https://help.awin.com/developers/docs/advertiser-mastertag)
- CloudFront `awc` HttpOnly cookie deployment; the existing runbook is retained for Phase 2.
- Order-attribution database tables, Awin transaction sync, and the admin reporting dashboard.
- Awin commission groups, publisher tags, feed configuration, or partner settings.

## Rollback

Revert the Phase 1 application and Edge Function commit, then redeploy the prior application build and both Edge Function environments. No database migration is part of this phase.
