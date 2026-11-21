# Black Friday production release

User authorized merging to master and publishing the offer on 21 November 2026.
This supersedes the earlier DEV-only rollout scope.

1. Add exact production/live credential pairing to frontend, promo creation and paid settlement, retaining DEV/test guards. Admit the apex and www production storefronts while preserving sticky affiliate exclusion.
2. Verify production-specific guard, checkout and webhook regressions, existing unit/backend suites, popup timing, claim/dismissal persistence and ordinary checkout compatibility. Independently review the promotion delta.
3. Apply migrations 20261119000002, 20261121000001 and 20261121000002 using the explicit production transport, after rollback-only financial/privilege/code fixtures. The last migration fixes the production orders.kit_id NOT NULL mismatch with the multi-kit finalizer, while preserving required kit identities on legacy rows. Keep the campaign disabled until handlers are deployed.
4. Deploy affected checkout and webhook functions plus meta-promo to gvfptmjluxpngfjendbi. Configure an isolated production campaign secret and opt-in flags without changing existing live keys or tracking secrets. Activate the campaign and frontend flag.
5. Merge verified source into master and push. Wait for Amplify success and verify the published apex/www experience and affiliate exclusion, blocking payment and email transports during acceptance. Remove only disposable test claims/visitors.

The offer code is shown and copied on screen; claiming does not send an offer email or subscribe someone automatically. Optional marketing consent remains separately stored. Existing paid-order confirmation emails are unchanged.

Disable new offers with META_PROMO_ENABLED=false, campaign enabled=false and VITE_META_PROMO_ENABLED=false followed by a rebuild. Preserve schema, reservations and paid settlement so issued orders remain recoverable.

## Release evidence

Observed production regressions fail before widening the guards: frontend activation, backend activation/admission, live payment creation and paid promo webhook settlement. After implementation: 347 frontend unit tests, 247 backend runtime tests, changed-handler/test typechecks, build with 25 prerendered pages, 63 production-config offer browser cases and nine additional exact-production-API/live-mode card/wallet/reminder cases pass. Ordinary production checkout compatibility passes all 38 cases. Scoped lint, script syntax and whitespace checks pass. Independent review has no remaining important findings.

Applied migrations 20261119000002, 20261121000001 and 20261121000002 explicitly to gvfptmjluxpngfjendbi after rollback-only financial/settlement/privacy/short-code fixtures passed. Repeated the rollback fixtures successfully after application. No sellable inventory reset or order changes were committed. The order-shape repair was required because actual production orders.kit_id retained NOT NULL although the multi-kit finalizer inserts kit identities into order_items.

Deployed meta-promo, stripe-webhook and four checkout-creation handlers explicitly to production. Configured a production-only Vault/Edge campaign key and enabled the backend campaign and master frontend flag, preserving existing live payment credentials, AWIN secrets and effective multi-kit configuration. Both production tracking origins return a checked no-cookie response with correct CORS. Offer claims display a code on screen and send no offer email.

Publish the verified source to master and confirm the Amplify deployment before declaring the release live. Final acceptance must cover actual apex/www browser admission, short-code copying, claimed-reminder persistence, net totals above Express Checkout and retained-cookie affiliate exclusion without payment operations.
