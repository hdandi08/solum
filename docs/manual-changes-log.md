# Manual Changes Log

Track all out-of-code changes here so nothing is missed when merging dev → master.

Format: date · what changed · where · done?

---

## Current dev cycle (open)

| Date | Change | Where | Synced to prod? |
|------|--------|-------|----------------|
| 2026-08-12 | Restored Stripe Express Checkout for Apple Pay, Google Pay, Link, and PayPal while retaining the normal card fallback. Restored the tracked Meta/Instagram/TikTok in-app-browser breakout choice and all prior Express/IAB PostHog event names. AWIN, Meta, and TikTok attribution remains in the wallet PaymentIntent path. Production E2E remains prohibited; only DEV may run the automated test purchase. | Repository code; pending Supabase function and Amplify DEV/production deployment | No — verification and deployment pending. |
| 2026-08-12 | Hardened the guarded AWIN DEV acceptance rerun: it pauses the exact minute job, synchronizes the Edge worker secret and Vault bearer, proves an empty authenticated call, and restores one schedule from its exit trap. Future Phase B/C migrations were renumbered after applied Phase A migrations. VAT timing is explicitly based on immutable PaymentIntent creation time. | Repository only | No deployment; production untouched. |
| 2026-08-12 | AWIN Task 7 worker recovery and schedule: a development bearer exposed in internal diagnostic output was treated as compromised and replaced; the replacement was synchronized to the Edge Function and the single Vault entry `awin_worker_bearer_dev` without exposing it. Created exactly one active `awin-conversion-worker-dev` pg_cron job at `* * * * *`, targeting only the exact DEV worker URL and reading the bearer from Vault. Guarded verification separately found a recent successful cron run and a recent HTTP 200 response whose `claimed`, `sent`, `retried`, and `dead_letter` counters were zero (extra fields such as `accepted` were allowed), plus an empty outbox; no request-id correlation between those observations was asserted. Temporary files were removed. The isolated AWS DEV fixture and five DEV AWIN settings remain for acceptance, with explicit teardown documented. Read-only Amplify DEV checks correctly found no MasterTag on any route under the production-only policy. The DEV feed 404 is expected without the separate app-level production rule; local feed-contract and offline rule-artifact verification are the Phase A evidence. A local production-host simulation intercepted the external AWIN request and proved exactly one tag without contacting AWIN. Live feed and MasterTag checks remain part of a separately approved production rollout. | Supabase DEV `rodvvmfzkyjsqbufkjbc`, retained AWS `solum-awin-conversion-fixture-dev`, local browser simulation, and read-only Amplify DEV `https://dev.d3pa095gzazg3c.amplifyapp.com` | No — production and providers were not contacted or mutated; no web deployment or app-rule change was performed. |
| 2026-08-12 | AWIN Task 6 acceptance concurrency fix: the DEV acceptance harness now schedules only expected allowlisted fixture rows at a deterministic past instant and invokes the normal worker with an exact matching limit. A guarded rerun injected a non-allowlisted synthetic row after scheduling and proved it remained pending/unattempted while 429/500/200/206 fixtures completed; all synthetic rows were removed. The normal DEV `AWIN_WORKER_SECRET` was rotated without reading/printing its prior value; successful authenticated worker calls proved the deployed worker used the new value. The temporary Stripe acceptance secret was removed and verified absent by name. | Supabase DEV `rodvvmfzkyjsqbufkjbc` only | No — production and external providers were not contacted. |
| 2026-08-12 | AWIN Task 6 DEV acceptance completed: deployed the isolated `solum-awin-conversion-fixture-dev` SAM stack in AWS account `798470762256`, region `eu-west-2` (HTTPS-only fixture, one-day logs), generated the previously absent DEV-only AWIN attribution/encryption/worker/API secrets, and deployed only `stripe-webhook`, `create-first-box-payment-intent`, and `awin-conversion-worker` to Supabase DEV `rodvvmfzkyjsqbufkjbc`. Sanitized acceptance passed webhook replay/idempotency, encrypted persistence, 429/500 retry, 200 delivery, and 206 item independence; all synthetic rows were deleted. The temporary Stripe acceptance secret was removed and verified absent by name. | AWS isolated `-dev` fixture + Supabase DEV only | No — production was not contacted or mutated. Fixture teardown: `infra/awin-conversion-fixture-dev/scripts/teardown-aws-dev.sh`. |
| 2026-08-12 | AWIN Phase A webhook cutover implemented locally: eligible live Stripe PaymentIntent conversions now persist to the encrypted, idempotent outbox before email/analytics side effects; direct webhook delivery removed. Read-only CLI verification confirmed the linked project is development `rodvvmfzkyjsqbufkjbc`, but no migration, secret, fixture, or function deployment was performed because no safe HTTPS fixture responder was available. | Code only; Supabase development read-only project check | No — development acceptance/deploy blocked before mutation; production not contacted. |
| 2026-07-30 | Secure isolated SOLUM admin promoted: protected roles assigned, audit/order migrations applied, five canonical admin functions deployed, four legacy/test functions retired, and manual Amplify `dev`/`master` branches deployed behind separate Basic Auth at `admin-dev.bysolum.co.uk` and `admin.bysolum.co.uk`. Manual TOTP/browser acceptance remains pending; no production E2E or mutation verification was run. | Supabase dev + prod, Amplify `solum-admin` (`d1ohm9syp99eop`), Route 53 | Deployed to both; manual acceptance pending. |
| 2026-07-08 | Deployed NEW edge function `meta-capi-relay` (CAPI-led AtC/IC/ViewContent, browser+server dedup via eventID) to **dev + prod** (commit 78405b2, verify_jwt=false). Dev project intentionally has NO `META_CAPI_ACCESS_TOKEN` → function no-ops there (dev traffic must never hit the pixel; client also gated to prod hostname). Smoke-tested prod: 400 on non-whitelisted event. | Supabase functions — dev rodvvmfzkyjsqbufkjbc + prod gvfptmjluxpngfjendbi | Yes — both 11:56 UTC+1. Web client merged to master same session. |
| 2026-07-08 | New hero banner film (BANNER FILM 02, model + kit): uploaded `video/banner/banner-loop-02.{mp4,webm}` (2.8MB/1.5MB 1080p) + `banner-loop-02-mobile.{mp4,webm}` (710KB/494KB 540p) to s3://solum-media-assets. Cut 2.6–25.3s of the 4K master (black fades trimmed — opens on the model). New filenames, no CloudFront invalidation. Verified 200 on CDN + playing on localhost desktop/mobile. Code: `productMedia.js` BANNER → -02 files, new committed poster `banner-poster-02.jpg`. | S3 solum-media-assets + web (dev branch) | CDN files live (shared dev/prod); code needs dev→master merge. |
| 2026-07-07 | Fixed SendCloud STATUS_MAP (91 'Parcel en route' was mapped to 'delivered' → premature Delivered email; 8/5/22/80 also wrong vs canonical Sendcloud ids). Deployed `sendcloud-webhook` to **dev + prod** (commit fc10711). | Supabase functions — dev rodvvmfzkyjsqbufkjbc + prod gvfptmjluxpngfjendbi | Yes — both deployed 17:15 UTC. |
| 2026-07-06 | Creator Program Phase 2 LIVE on prod: deployed `submit-creator-application` + `creator-outreach-run` (updated /creators CTA) to dev+prod; merged dev→master (public /creators page + "Create With Us" footer link). **Replaced prod `RESEND_API_KEY` with a full-access key** (old prod key was NOT authorized for `creators.bysolum.com` → all creator sends 403'd; new key tested on creators.bysolum.com + orders.bysolum.co.uk before switching). Then sent 28 queued creator intros (0 failed). | Supabase secrets (prod) + functions (both) + Amplify (master) | Done. Prod key now full-access. |
| 2026-07-06 | Creator Program Phase 1 LIVE on prod: applied migration `20260706000000_create_creators.sql` + deployed `creator-outreach-run`, `resend-webhook`, `creator-unsubscribe` to dev + prod. RESEND_WEBHOOK_SECRET set per project (dev/prod separate). Merged dev→master. | Supabase (both) + Amplify (master) | Both done. |
| 2026-07-06 | Creator outreach cron: `pg_cron` job `creator-outreach-daily` (09:00 UTC) → `creator-outreach-run`. Applied via one-off migration pushed to **prod only**, then deleted locally (kept off dev by design). | Supabase prod SQL (pg_cron+pg_net) | **prod only** (intentional). |
| 2026-07-06 | Next-working-day dispatch + est. delivery: merged dev → master (frontend to prod Amplify) and deployed `create-payment-intent`, `create-first-box-payment-intent`, `create-checkout-session`, `stripe-webhook` to **dev + prod**. Shared logic in `_shared/dispatch.mjs` + `web/src/lib/dispatch.js`. | Amplify (master) + Supabase functions | Both dev + prod done. |
| 2026-07-06 | Deployed `send-freedelivery-blast` (free-delivery re-engagement email; leads deduped, buyers excluded, dry_run/test_email/batch modes) to **prod** gvfptmjluxpngfjendbi. Pushed `promo-man.jpg` hero to **master** (Amplify prod CDN, now live). Sent test to harsha@bysolum.com, then ran the LIVE send: 169 emails across 6 batches, 0 failures. | Supabase functions (prod) + master branch (Amplify) | Function: prod done, dev pending. Image: prod live. Blast: SENT. |
| 2026-07-01 | Updated `TIKTOK_EVENTS_ACCESS_TOKEN` to the correct token (user-provided) on dev + prod. Set `TIKTOK_TEST_EVENT_CODE=TEST87432` on **dev only** (routes dev events to TikTok Test Events; prod intentionally has none). | Supabase secrets (dev rodvvmfzkyjsqbufkjbc + prod gvfptmjluxpngfjendbi) | Token: both. Test code: dev only (by design). |
| 2026-07-01 | Deployed `stripe-webhook` + `create-first-box-payment-intent` (TikTok Events API v1.3 payload fix + ttclid/ttp) | Supabase functions — dev + prod | Yes — both deployed. Dev CompletePayment verified in TikTok Test Events. |
| 2026-06-30 | Deployed `stripe-webhook` (PostHog purchase parity at subscription sites 742/912) | Supabase functions — dev (rodvvmfzkyjsqbufkjbc) + prod (gvfptmjluxpngfjendbi) | Yes — both deployed + verified. POSTHOG_PROJECT_KEY already set on both. |
| 2026-06-30 | Kit inventory deduction: applied migrations 20260630000001 (orders flags + adjust_kit_inventory RPC) + 20260630000002 (revoke RPC from anon/authenticated) to dev; deployed stripe-webhook to dev (rodvvmfzkyjsqbufkjbc) | Supabase CLI (dev) | No — prod pending |
| 2026-04-06 | Dev site URL confirmed: https://dev.d3pa095gzazg3c.amplifyapp.com/ — no custom domain mapped yet | Amplify | N/A |

---

## Completed cycles

### 2026-04-06 — Dev infra setup
| Date | Change | Where | Synced to prod? |
|------|--------|-------|----------------|
| 2026-04-06 | Created SolumDB-DEV project (rodvvmfzkyjsqbufkjbc) | Supabase console | N/A (dev-only) |
| 2026-04-06 | Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY secrets | Supabase → SolumDB-DEV | N/A (dev-only) |
| 2026-04-06 | Connected dev branch, added VITE_ env vars (master + dev) | Amplify console | Yes — both branches live |
| 2026-04-06 | Set Stripe test keys on dev, live keys on master | Amplify console | Yes |

## 2026-06-25 — Amplify rewrite rule: allow .webp (+ mp4/webm)
- App: solum-web (d3pa095gzazg3c). Root cause of broken images on deploy: the SPA rewrite
  rule's passthrough extension list did not include `webp`, so all new .webp product images
  were rewritten to /index.html (served HTML, broken image). .jpg/.png were already allowed.
- Fix (via `aws amplify update-app --custom-rules`): added `webp|mp4|webm` to the negative
  lookahead. Applies app-wide (dev + master), at the edge, no rebuild. Verified .webp now
  returns 200 image/webp on the dev deploy.
- NOTE: this is Amplify app config (not in repo). If the app is recreated, re-apply.

## 2026-07-05 — Ritual section: unified center-active gallery + QualifiedVisit `ritual_multi`
- Rebuilt `web/src/components/RitualInAction.jsx` from the desktop player/rail + separate
  mobile carousel into ONE responsive center-active gallery (coverflow) for both desktop and
  mobile. Fixes the desktop click-disconnect (action now co-located with the playing video);
  fits one viewport; daily→weekly order; arrows/drag/click-to-centre on desktop, swipe on mobile.
- QualifiedVisit recalibration: new `ritual_multi` trigger fires when a visitor deliberately
  centres 2 distinct ritual steps (`qualifiedVisit.js` + `qualifiedVisitTracker.js:markRitualEngaged`).
  First auto-centred card is passive; selection is settle-debounced so flicking past cards does
  NOT over-fire `ritual_selected`/`ritual_multi`. In-view play gate restored (no below-fold autoplay).
- Commits on dev: edb2d40, 3ab5e95, e13f93f, 05fea10, 70de8a0. Reviewed clean; verified live on
  localhost (desktop coverflow, mobile swipe, `ritual_multi` fired once). Spec/plan in docs/superpowers.
- PENDING: user sign-off before merging dev → master.

## 2026-07-07 — Mobile perf: hero video mobile renditions on CDN
- Uploaded `video/banner/banner-loop-mobile.webm` (665KB) + `banner-loop-mobile.mp4` (869KB)
  to s3://solum-media-assets (960×540 re-encodes of banner-loop, made with ffmpeg from
  web/.media-build/banner-loop.mp4). New filenames — no CloudFront invalidation needed.
  Verified 200 via d2ni3owln6t6zz.cloudfront.net.
