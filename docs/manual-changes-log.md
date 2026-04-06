# Manual Changes Log

Track all out-of-code changes here so nothing is missed when merging dev → master.

Format: date · what changed · where · done?

---

## Current dev cycle (open)

| Date | Change | Where | Synced to prod? |
|------|--------|-------|----------------|
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
