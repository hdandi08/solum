# Meta Black Friday implementation plan

Approved popup direction and complete contracts: 2026-11-19-meta-black-friday-design.md. Execute continuously within the user's dev-only implementation request.

1. Backend: write failing tests for signed Meta admission, sticky affiliate denial, expiry, email binding, retry/redemption locking, one-/mixed-kit net arithmetic and paid webhook recovery. Add DEV-only promo service/helper and private migration. Integrate trusted discounted attempts with current payment and webhook flows; preserve all non-promo behaviour.
2. Frontend: write failing pricing/request/popup tests, add the original-photo delayed popup and persisted eligibility/claim state, integrate claimed prices and promo references through card/wallet, safe edits, receipt/success, and mobile summaries. Do not show offers for unknown/affiliate visits or interrupt payment.
3. Root integration: configure only DEV campaign secret/feature flag and signed preview link; apply only the new DEV migration, deploy required DEV functions, and preserve production. Verify schema privileges and immutable discount accounting with rollback-only SQL fixtures.
4. Validation: existing frontend units/build plus focused backend tests/typechecks; mocked browser coverage at 320/390/1280, allowed Meta/affiliate/direct cases, claim/dismiss, expiry, wrong email, mixed order £235→£211.50, wallets, refresh/retry, released hold and duplicate redemption. Independently review eligibility and payment edge cases before publishing dev.
5. Commit only feature files, push HEAD:dev, wait for Amplify success and verify the real DEV popup/claim with all payment/email transports blocked or preview-only. Report signed preview link and current limitations. No master push or production mutations.

Backend owns supabase/, new shared helper tests, new DEV setup scripts. Frontend owns web/ including pricing helpers and browser tests. Root owns this plan/design, integration/deployment and final review. Share the stable contract above; neither worker edits the other's ownership area.
