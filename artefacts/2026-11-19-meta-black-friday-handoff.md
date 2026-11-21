# Meta Black Friday handoff

Completed 21 November 2026 after the user enabled certificate permissions. The isolated DEV tracking stack, certificate and DNS are active; unmocked live popup/email capture/discount and direct/affiliate exclusion were verified. See the final dated section of the DEV release note. Production remains unchanged.

Resumed 21 November 2026 at user's request. Retried the DNS certificate request without tags; AWS still denied acm:RequestCertificate for sourceri-dev-console. No certificate, tracking stack or production change resulted. Exact supplied policy is now saved in artefacts/solum-dev-certificate-policy.json for attachment by the user. Await permission change before retrying infrastructure setup.

User paused work on 19 November 2026 and wants to continue tomorrow. Do not resume deployments or certificate requests until they ask to continue. No reminder was requested.

## Completed

- DEV-only Black Friday delayed popup with original kit photograph, email/optional consent capture and personal 10% discount across single/mixed kit orders.
- Private DEV tables, immutable financial/provider snapshots, affiliate exclusion and payment retry/recovery protections are implemented and deployed.
- Feature source commit 995999b; documentation commit 1341133 pushed to dev. Production master remains 909a52b. No production promo migration/configuration/deployment.
- Verified 346 frontend units, 241 backend runtime tests, build with 25 pages, 54 promo browser cases plus final three-width recovery regression, 38 ordinary checkout cases and six disabled-feature recovery cases. Independent review clear. Rollback financial fixtures and isolated concurrent grant preparation passed, with test records cleaned and no stock/provider operations.
- Published popup + real claim/email storage verified with ONLY the missing attribution service supplied by an isolated browser fixture. No charge or offer email was sent; fake signup deleted. This is conditional acceptance, not a working unmocked live offer.

## Current blocker and safe state

track-dev.bysolum.co.uk has no DNS record or tracking stack. Existing production tracking service/certificate is production-only. The live DEV offer correctly remains hidden because affiliate resolution fails; do not bypass the check. Email claims, when available, are in private DEV public.meta_promo_claims, not automatically subscribed or sent marketing email. DEV email delivery is preview-only.

AWS default user sourceri-dev-console (account 798470762256) was denied acm:RequestCertificate and acm:DescribeCertificate in eu-west-2. No certificate/DEV tracking stack was created. User said they would enable certificate permissions, then requested the policy, then paused. **Permission changes have not been confirmed or retried.**

Provided inline policy name SolumDevTrackingCertificate:
- Allow acm:RequestCertificate on *, conditioned on aws:RequestedRegion=eu-west-2, acm:ValidationMethod=DNS and ForAllValues:StringEquals acm:DomainNames=[track-dev.bysolum.co.uk].
- Allow acm:DescribeCertificate on arn:aws:acm:eu-west-2:798470762256:certificate/*.

On resume, retry certificate request **without --tags**, because the supplied policy does not grant acm:AddTagsToCertificate. Do not edit IAM permissions yourself or touch production.

## Next steps after user resumes

1. Confirm/retry the scoped certificate permissions. Request DNS-validated ACM certificate for track-dev.bysolum.co.uk in eu-west-2 (use stable idempotency token); inspect validation record and add only its DEV DNS record in hosted zone Z08521213A8ASH5UCKKSS, then verify issuance.
2. Follow infra/awin-tracking/template.yaml and docs/awin-awc-cookie-deployment.md. Run local tests/SAM validation. Deploy isolated solum-awin-tracking-dev with DEV storefront origin only, matching DEV AWIN attribution secret and DEV custom domain; preserve production. Secret generation/storage must remain private. Do not reuse the production secret.
3. Create only the DEV tracking DNS alias/CNAME to its own regional API Gateway target. Verify CORS, known no-cookie response {token:null}, affiliate cookie/token resolution, and matching DEV Supabase AWIN_ATTRIBUTION_SECRET. Existing DEV Supabase project is rodvvmfzkyjsqbufkjbc; CLI is linked to PRODUCTION, so always pass explicit DEV refs/use devQuery.
4. Rerun unmocked live popup/claim acceptance with payment calls blocked and preview-only emails, then clean own fake signup/visitor records. Do not erase affiliate attribution in the user's browser to make it eligible.
5. Open signed preview URL for user and update release evidence. Signed public Meta link can be regenerated from DEV Vault secret via scripts/multi-kit/configure-dev-meta-promo.mjs (this also reapplies DEV flags), or read /tmp/solum-meta-dev-preview.txt if retained. Secret is never printed. Ordinary direct URLs deliberately do not trigger the popup.

Relevant source/docs: artefacts/2026-11-19-meta-black-friday-design.md, -plan.md, -dev-release.md; scripts/multi-kit/apply-dev-meta-promo.mjs, configure-dev-meta-promo.mjs, test-dev-meta-promo-concurrency.mjs. Preserve unrelated pre-existing untracked artefacts. No active goal object or automation was created.
