# Manual Changes Log

Track all out-of-code changes here so nothing is missed when merging dev → master.

Format: date · what changed · where · done?

---

## Current dev cycle (open)

| Date | Change | Where | Synced to prod? |
|------|--------|-------|----------------|
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
