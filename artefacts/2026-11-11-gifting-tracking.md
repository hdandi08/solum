# Christmas gifting tracking

The /gift page reuses the existing checkout and conversion events. No extra Meta or TikTok InitiateCheckout is fired on a landing-page or kit click.

## Journey

1. `gift_page_viewed`: once per page mount, including React StrictMode protection.
2. `hero_cta_clicked`: existing shared hero event; choosing this CTA scrolls to kits.
3. `buy_cta_clicked` and `add_to_cart`: existing shared kit CTA events; AddToCart remains session-deduplicated per kit.
4. `buy_page_viewed`: existing checkout landing event.
5. `checkout_details_submitted`: standard card checkout progression.
6. `checkout_initiated`: existing card or express event, after successful payment-intent creation; includes method. Existing Meta/TikTok InitiateCheckout and Meta CAPI remain in place.
7. `purchase`: existing Stripe webhook event; server-verified payment, deduplicated by PaymentIntent ID. The existing browser success page keeps advertising conversions restricted to verified live payments.

Gifting checkout URLs include `source=gift&experience=christmas_gifting&kit=<kit>`. `source=gift` is already supported in frontend and backend, persisted in Stripe metadata, and emitted on the server PostHog purchase. No payment handlers or pricing rules changed. Gifting uses the existing gift source rather than first-batch promotional messaging.

## Event properties

Browser custom events, automatic pageviews and autocapture receive `landing_experience=christmas_gifting` and `gift_occasion=christmas`. Context survives SPA navigation and same-tab reloads/payment returns through session storage, expires after 24 hours, and has a memory fallback when storage is blocked. The explicit experience parameter restores context when an in-app browser checkout is opened in another browser. Existing Meta/TikTok click-ID continuity is unchanged.

The server purchase carries `source=gift`; browser-only experience properties are not claimed on the webhook event. No gender or sexual orientation is inferred or logged by this instrumentation.

## Suggested PostHog insight

Create an ordered unique-person funnel:
`gift_page_viewed` → `add_to_cart` → `checkout_initiated` → `purchase`.

Filter the first step to `landing_experience=christmas_gifting`; filter the purchase step to `source=gift`. Do not apply the browser-only experience filter globally, because the webhook purchase does not have it. Use a seven-day conversion window as an initial reporting choice. Compare all visitors to mobile visitors, and break down by kit where the selected event uses a kit property. `checkout_initiated.method` distinguishes standard and express paths; omit details/delivery submission from the primary funnel because express skips them.

Use `buy_page_viewed` in a secondary funnel to locate drop-off between kit selection and entering the checkout. Use checkout error and wallet availability events to investigate payment friction. Existing identified checkout email connects browser activity to the server-side purchase; no new identification data was added.

Suggested ad URL: `/gift?utm_source=meta&utm_medium=paid_social&utm_campaign=christmas_gifting&utm_content=<creative_id>`. Use non-sensitive creative IDs.

No live payment is needed to verify code wiring. Confirm actual ingestion after deployment with a normal visit and an authorised test payment, keeping test orders out of live advertising conversions.

Reference: https://posthog.com/docs/privacy/data-collection#overriding-captured-events
