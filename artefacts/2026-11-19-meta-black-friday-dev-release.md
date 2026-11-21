# Meta Black Friday DEV release

21 November follow-up: add a personal-code copy button with truthful copied feedback/manual-selection fallback, and allow direct non-affiliate visits. AWIN/recognised partners and retained affiliate history remain excluded; attribution resolution must still succeed. No signed campaign URL is required for direct entry. This supersedes the earlier Meta-only entry rule in this historical release record.

Further user requests in the same update: shorten codes to BF- plus eight unambiguous characters, and move the applied-offer confirmation above Express Checkout with the saving and net total. Copy is available in the popup and compact confirmation. Migration 20261121000001 changes the default and shortens only unredeemed claims with no prepared attempt; existing prepared/paid codes and snapshots remain unchanged. Rollback fixtures verified actual migration preservation; isolated eight-request concurrency proof passed without stock/provider operations.

Follow-up checks: 346 frontend units/build25 pages/scoped lint; 246 backend tests and changed typechecks; complete60-case popup browser matrix passed before the banner move. Focused final copy/direct/banner cases passed; two parallel mixed-order timeouts passed on isolated rerun at all three widths. No new pricing or redemption logic was introduced. Only the DEV meta-promo function and short-code migration were deployed; production remains unchanged.

User approved delayed popup, strong original imagery, email capture and 10% across the entire 1–5 kit order. Production remains on 909a52b; no production schema, secrets, functions, flags or source promotion belongs to this release.

## Campaign and experience

- Private Meta campaign destination signature plus paid Meta source/medium admits a visitor. Use scripts/multi-kit/configure-dev-meta-promo.mjs to configure DEV and print the preview URL; no private signing key is printed.
- Campaign ends at 2026-12-01T00:00:00Z. Display says 30 November, 11:59pm UK. No resetting countdown or invented scarcity.
- Original holding-box photograph, SOLUM typography and black/bone/blue colours. Desktop portrait/form split; mobile compact photograph and form. Delayed by visible browsing time, one automatic appearance, explicit reopen, accessible focus/Escape/close and reduced motion. Payment steps, wallets and outstanding attempts suppress interruptions.
- Claim immediately shows a personal code and applies 10%. Email delivery remains preview-only on DEV; the UI does not promise an email was sent.
- Email and explicit optional marketing consent, text/version/timestamp are stored privately in public.meta_promo_claims on DEV rodvvmfzkyjsqbufkjbc. This does not automatically subscribe anyone or send a marketing email.

## Prices and payment safety

GROUND £65→£58.50; RITUAL £85→£76.50. Two RITUAL plus one GROUND £235→£211.50, saving £23.50. Free UK delivery remains included. Standard card, wallet, summaries, receipt and confirmation use the net price and retain the original subtotal/saving.

The private migration 20261119000002 adds campaign/visitor/grant/rate-limit tables, original subtotal/discount snapshots and immutable provider creation parameters. A promo single kit uses the same durable multi-kit reservation/finalisation path, with one parcel unit. Ordinary single/mixed checkout stays compatible.

Each grant is bound to one email/visitor and one active immutable attempt. Unknown outcomes retain the original request key; only positively cancelled/released resources allow a replacement. Original Stripe parameters survive tracking changes. Already-authorised paid attempts settle after campaign expiry or disabling creation. Mutable Stripe receipt-email differences do not strand a paid order; immutable authorised email is checked instead. Used codes stop being offered on return visits.

Affiliate denial is sticky per visitor and rechecked at claim/payment creation. AWIN, retained AWIN and recognised partner tags override Meta eligibility, including duplicated URL parameters. Signed links cannot prove a paid click, prevent link sharing or identify untagged partners; basic network throttling is not identity verification. Add new partner names/keys to metaPromo.ts when introduced.

## DEV operations and evidence

Applied the migration only to DEV after rollback-only DDL/financial fixtures passed. Deployed meta-promo, create-first-box-payment-intent, create-first-box-session, create-payment-intent, create-checkout-session and stripe-webhook only to DEV. Unsupported legacy routes reject promo fields before any payment creation.

META_PROMO_ENABLED is enabled only on DEV, alongside existing reservation/multi-kit flags. Its HMAC key is in DEV Vault and edge secrets. VITE_META_PROMO_ENABLED is enabled only on Amplify dev, preserving all other branch variables. Both backend/frontend require the exact DEV/test configuration.

Database tests prove original net arithmetic, email/visitor binding, unknown-attempt pinning, safe replacement, immutable provider parameters, paid replay, expired settlement, refund policy and private privileges. Eight concurrent prepare calls produced exactly one grant owner and an idempotent replay. Fixture records were cleaned; no stock hold or provider operation occurred. Real kit counts remained GROUND 252/RITUAL 251.

Live API probes passed signed admission, sticky affiliate denial, direct/forged rejection and duplicate affiliate evidence; their isolated visitor rows were removed. No charge, external email or real shipping label is part of acceptance.

Final checks: 346 frontend units across 46 files; build with 25 prerendered pages; 241 backend runtime tests and changed-function typechecks; 54 complete promo browser cases at 320/390/1280 plus the enhanced three-width interrupted-card/wallet-switching regression; 38 ordinary checkout cases and six disabled-feature recovery cases. Scoped lint, script syntax and whitespace checks pass. Independent review found no remaining Critical/Important findings after retry and busy-state fixes. Whole-backend-suite typechecking has an existing waitlist DNS mock cast issue; the runtime suite and all changed files pass.

Before declaring the dev storefront live, finish final unit/build and browser checks, commit only feature files, push HEAD:dev, wait for Amplify success, and verify the published popup/claim with payment requests blocked.

## Published source and remaining infrastructure prerequisite

Source commit 995999b was pushed only to dev; Amplify dev job 357 succeeded. Production master remains 909a52b.

Live browser acceptance found the existing DEV AWIN bridge was never deployed: track-dev.bysolum.co.uk returns DNS resolution failure, no matching DNS record exists, and only the production tracking stack is present. The provider correctly sends attribution_checked=false, so the offer remains hidden. Do not treat a tracking failure as proof of no affiliate attribution.

The published popup plus real promo API/email storage were verified with only the missing bridge replaced by an isolated test response. The personal grant applied £235→£211.50 and survived reload; unchecked consent was stored accurately. Payment transports were blocked, no offer email was sent, and the fake signup/visitor records were deleted. This is conditional acceptance, not proof the ordinary live browser can currently qualify.

The configured AWS user sourceri-dev-console was denied acm:ListCertificates, acm:DescribeCertificate and acm:RequestCertificate. Public TLS inspection confirms the production certificate covers only track.bysolum.co.uk, so it cannot be reused for DEV. No certificate or DEV tracking stack was created, and no production infrastructure was changed.

Remaining prerequisite: an issued ACM certificate in eu-west-2 covering track-dev.bysolum.co.uk, or certificate request/description access. Then deploy the existing isolated infra/awin-tracking stack with DEV-only origins and matching DEV token secret, add only its DEV DNS record, and rerun unmocked live acceptance. User was asked for that prerequisite; the affiliate exclusion guard remains intact.

## Disable creation

Set META_PROMO_ENABLED=false explicitly on DEV, disable the campaign row and remove/disable VITE_META_PROMO_ENABLED on dev before rebuilding. Leave schema, webhook and reservation cleanup in place for existing attempts. Do not restore stock manually or delete paid promo records.

## Infrastructure prerequisite resolved — 21 November 2026

After the user added the scoped certificate permissions, requested and DNS-validated the DEV certificate 4f55b11b-023b-4670-9f9b-93f29d11dab0 in eu-west-2. Deployed isolated solum-awin-tracking-dev and mapped only track-dev.bysolum.co.uk to d-ujiowawky1.execute-api.eu-west-2.amazonaws.com. The DEV API endpoint is https://swzy5fe3th.execute-api.eu-west-2.amazonaws.com. Its origin allowlist contains only the DEV Amplify storefront.

The template now has a TrackingRuntime parameter, preserving the existing production default while DEV explicitly uses nodejs22.x. Ten tracking tests and SAM validation passed; CloudFormation completed successfully. No production stack, DNS record, secret or storefront was changed.

DEV AWIN credentials are isolated in Secrets Manager solum/awin/attribution-dev and DEV Vault awin_tracking_secret_dev; the matching AWIN_ATTRIBUTION_SECRET was configured only on rodvvmfzkyjsqbufkjbc. Private values were never printed. Verified actual DNS/TLS, no-cookie resolution, rejected production origin, encrypted affiliate-token resolution and the matching Edge secret digest.

Unmocked published DEV browser acceptance now passes: delayed original-photo popup, email and explicit false marketing-consent storage, personal code application, RITUAL £76.50 and mixed £235→£211.50, £23.50 saving and refresh persistence. Only payments/analytics were blocked. No payment or offer email was sent. The fake signup and visitor records were removed. Separate unmocked browser checks excluded direct/affiliate visits and retained affiliate exclusion after a signed Meta return.

This resolves the historical blocker above. Generate the signed campaign preview link using the existing DEV configuration helper; normal direct visits deliberately do not show the offer. Email delivery remains preview-only and marketing is not automatically subscribed.
