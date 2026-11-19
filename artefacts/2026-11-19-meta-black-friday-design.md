# Meta Black Friday offer: approved direction

User chose a delayed popup and instructed implementation with strong imagery. Dev only. 10% across the complete kit order, including all 1–5 mixed GROUND/RITUAL kits; free delivery unchanged. Production stays on commit 909a52b until a separate request.

## Experience and visual direction

Use the original /products/kit/holding-box@600.webp photograph, not generated products or Father's Day artwork. Desktop: large portrait image left, offer/form right, 10% prominent in Bebas Neue. Mobile: compact horizontal image crop above the form, everything within a small viewport, closable and scrollable with keyboard. Existing SOLUM black #08090B, charcoal #181C24, bone #F0ECE2, steel blue #2E6DA4 and sky blue #4A8FC7. Barlow Condensed body/UI. No gold sale graphics, badges or competing animations.

Copy: “Your Black Friday invitation.” / “10% off your entire order.” / “A daily ritual. A weekly reset. Yours for a little less.” CTA “Unlock my 10%”. Email field; separate optional unchecked “Send me SOLUM news and offers” consent. Success shows a personal code and “10% applied”, with a continue-shopping button. No requirement to leave for an inbox. Store the email and consent; code-email delivery can remain preview-only on dev and must not falsely claim to have sent an email.

Root's timing calls: require 12 visible seconds and some browsing (20% scroll or 100px movement), with a 20-visible-second fallback for short direct-buy pages. One automatic appearance per campaign/browser; dismissal persists seven days, bounded by expiry. Reopen via a small eligible-only offer control. Suppress during delivery/payment and while another checkout modal, wallet, or request is active. Respect reduced motion, focus trap, Escape, scroll lock and return focus.

Root's campaign calls: start on activation; end at 2026-12-01T00:00:00Z (30 November 11:59pm UK). Deadline is fixed/server-enforced, never resets by visitor. No fake scarcity. One paid redemption per normalised email per campaign; declined/released attempts may retry safely. Refunds do not restore the offer entitlement.

## Eligibility and honest limits

Only the exact DEV project/test Stripe configuration plus explicit flags permits this feature. A signed, campaign-specific Meta destination link and matching paid Meta source/medium establish eligibility. Generic fbclid alone is insufficient. Meta source tags alone must not authorise a discount. A copied ad destination can still be shared; no browser-only mechanism proves a real paid Meta click or detects an untagged partner. Record this limit rather than promise absolute identity detection.

AWIN or other recognised affiliate evidence always wins, including retained AWIN attribution, signed AWIN resolution and incoming affiliate/partner tags. Record sticky affiliate exclusion server-side per opaque visitor token; never erase affiliate attribution to make an offer valid. Unknown/error attribution resolution fails closed. Check exclusion at visit, claim and creation of each new payment; any blocked/expired offer requires an explicit checkout correction, never a silent full-price charge. Recognise awc, source=aw, affiliate/partner/referral parameters and affiliate media/sources; document the extension list for additional partners.

## Stable integration contract

New DEV-only function `meta-promo` accepts:
- visit: {action:'visit',visitor_token?,landing_url,attribution:{awc?,channel?},awin_attribution_token?,attribution_checked:boolean}. Returns {visitor_token,eligible,blocked,ends_at,discount_percent:10,claimed?:{code,email,discount_percent:10}}.
- claim: {action:'claim',visitor_token,email,marketing_consent:boolean,attribution,awin_attribution_token?,attribution_checked:boolean}. Returns {code,email,discount_percent:10,ends_at,email_delivery:'preview'}.

Frontend persists opaque visitor_token and claimed offer; requests revalidation on navigation. Endpoint stores normalised email, exact consent text/version/timestamp, deadline and grant. Claims are idempotent for the visitor/email; bound and rate limited. Signed entry parameter is `offer_entry`; its HMAC payload is `black-friday-2026:2026-12-01T00:00:00Z`, using META_PROMO_ENTRY_SECRET. Matching sources: meta/facebook/instagram/fb/ig, paid media paid_social/paidsocial/cpc/paid.

Payment body adds `promo_code` and `promo_visitor_token` only after claim. Existing attribution is retained. Email must match the claim. All promo orders, including a single kit, use the durable multi-kit attempt/reservation/finalisation path (`checkout_flow:multi_kit_v1`), while normal one-kit orders retain the existing legacy path. response.promo = {code,discount_percent:10,subtotal_pence,discount_pence}. `order_items` carries actual net unit prices (GROUND 5850, RITUAL 7650), quantities and net line totals. `amount_pence` is net total. Normal gross snapshots remain unchanged.

Frontend `kitOrder(items, promo?)` estimates net items with optional claimed {code,discount_percent:10}, exposes subtotalPence,discountPence,promo,amountPence. `paymentKitOrder` verifies exact gross or authorised 10% arithmetic against server fields; never trusts arbitrary unit prices or a client amount. Shared client helpers remain backend-independent and retain legacy return shape for non-promo orders. Thread promo fields through standard/wallet request builders. Preserve full discounted order and original subtotal in refresh/redirect receipt storage and success page.

## Database and payment safety

New private tables hold campaign, visitor eligibility/blocking, and email/code grants. Immutable checkout_multi_attempts gain nullable promo claim reference plus original subtotal/discount amounts. Orders gain the same financial snapshot. Relax multi-kit attempt/order total quantity checks to 1–5 for promo single kits; normal existing paths stay compatible. Keep net order_item prices, so item sums always equal the paid total.

Prepare-promo RPC validates grant/visitor/email/campaign/exclusion under row lock, then prepares a trusted immutable net-priced attempt. A grant can belong to only one active attempt: same-key retries return the original snapshot; edits may replace it only after the previous Stripe resource has a released reservation. Never unlock a possibly payable/processing resource. Existing unknown/unbound attempts remain retryable only under their original immutable key. Failed payment preparation must not allow parallel discounted intents.

Finalisation of an already-paid authorised snapshot must work after campaign expiry or flag disablement. Wrap the existing atomic finaliser to persist promo fields and mark one redeemed order idempotently; keep refund/replay/component/parcel handling. No new popup during a held payment: changing/applying an offer must first safely retire any existing unpaid reservation. Never alter an existing amount in place. Freeze the complete original Stripe creation parameters before the first create call, so changed tracking metadata cannot break recovery. Persist pending promo checkout details in session storage before a request, restoring the original form/items/key after an unknown response; this follows the existing payment-retry privacy boundary and never puts customer details in receipts or local storage.

Customer/admin confirmations show actual net prices, discount saving and original subtotal. Conversion value equals net charged amount. Affiliate-attributed requests never receive the promo. Full financial details remain in the database.

## Alternatives

Inline price-adjacent claim was recommended; user chose the delayed popup for earlier visibility. Automatic discount with checkout-only email would lose non-purchaser leads. All approaches would require the same server validation; a public shared code was ruled out by the affiliate exclusion requirement.

## Rollout

Only DEV migrations, functions, secrets, branch flag and deployment. Mocks cover outbound email/payment. Live preview may collect a test email and create a grant but must not issue a charge, send an unsolicited email or reserve real stock. Supply the signed DEV Meta preview URL. Keep production source, schema and configuration unchanged.
