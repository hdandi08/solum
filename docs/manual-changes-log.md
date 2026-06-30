# Manual Changes Log

Track all out-of-code changes here so nothing is missed when merging dev → master.

Format: date · what changed · where · done?

---

## Current dev cycle (open)

| Date | Change | Where | Synced to prod? |
|------|--------|-------|----------------|
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
