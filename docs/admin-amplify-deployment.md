# Admin Panel — Amplify Deployment Plan

> Status: **DEFERRED** (decision 2026-07-12). Admin stays local-only until the
> security prerequisite below is done. Do not deploy before it.

## Blocker: service-role keys in the client bundle

`admin/src/lib/clients.js` creates Supabase clients with
`VITE_SUPABASE_SERVICE_ROLE_KEY_PROD` / `_DEV` and uses them for all direct
table queries (31 `.from()` calls across 9 pages: Dashboard, Customers,
Orders, Payments, Bookkeeping, Inventory, Stock, Creators, CustomerPanel).
Vite inlines these at build time, so a public Amplify deploy would ship the
prod service-role key — full DB access, RLS bypassed — to anyone who fetches
the JS. The email/password login is a client-side gate only and does not
protect the key.

Edge-function calls (admin-events, admin-dashboard, create-sendcloud-parcel,
etc.) already use the correct pattern: `Authorization: Bearer <session
access_token>` + anon `apikey`. Only the direct queries need fixing.

## Prerequisite: security refactor

1. Replace the service-role data clients with session-bearing authenticated
   clients (reuse the existing `authProdClient` / `authDevClient`, or merge to
   one client per env).
2. Add RLS "admin" policies on every table admin reads/writes, gated on the
   JWT email being in the admin list (e.g. an `is_admin()` SQL function
   checking `auth.jwt()->>'email'` against an `admin_emails` table — keep in
   sync with `ADMIN_EMAILS` in `admin/src/App.jsx`).
3. Apply migrations to **both dev and prod** (parity rule).
4. Remove `VITE_SUPABASE_SERVICE_ROLE_KEY_*` from `admin/.env` and the code.
5. Verify every admin page still loads data on dev, then prod.

## Deploy steps (GitHub-connected second Amplify app)

Repo already has `admin/amplify.yml`. Existing app: `solum-web`
(`d3pa095gzazg3c`, eu-west-2, repo `hdandi08/solum`).

1. **Fix `admin/amplify.yml` first**: switch `npm install` → `npm ci
   --include=dev`, write env vars to `.env` in the build phase (mirroring the
   root `amplify.yml`), and add the SPA rewrite `customRules` (copy from root
   `amplify.yml`, drop the `.well-known` rule).
2. Amplify console → **New app → Host web app → GitHub** → same repo
   `hdandi08/solum`. Console step is required — CLI can't reuse the existing
   GitHub App connection. Name: `solum-admin`.
3. Enable **monorepo** and set app root = `admin` (sets
   `AMPLIFY_MONOREPO_APP_ROOT=admin`; Amplify then uses `admin/amplify.yml`).
4. Branch: `master` (dev branch optional, mirroring solum-web).
5. Env vars: the post-refactor set only — URLs + **anon** keys for dev and
   prod. Never add service-role keys.
6. **Access control**: App settings → Access control → password-protect the
   branch (defence in depth on top of Supabase login).
7. Custom domain: `admin.bysolum.co.uk` (bysolum.co.uk zone already in
   Amplify/Route 53).
8. Verify: login works, a data page loads, and the deployed bundle contains
   no `service_role` string (`curl <bundle.js> | grep -c service_role` → 0).
