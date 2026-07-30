# SOLUM Admin — AWS Amplify Deployment Runbook

This runbook deploys the isolated `admin/` application without changing the
existing `solum-web` app (`d3pa095gzazg3c`), its apex/`www` domains, or its
marketing trackers.

## Fixed deployment map

| Branch | Admin environment | Supabase project | Domain |
| --- | --- | --- | --- |
| `dev` | `development` | `rodvvmfzkyjsqbufkjbc` | `admin-dev.bysolum.co.uk` |
| `master` | `production` | `gvfptmjluxpngfjendbi` | `admin.bysolum.co.uk` |

AWS account: `798470762256`
AWS region: `eu-west-2`

The initial GitHub App connection must be completed in the Amplify console.
AWS documents this as the supported authorization path for a new GitHub-backed
app:
<https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html>.

## Non-negotiable controls

- Never add a Supabase service-role key, Stripe secret, SendCloud secret, or
  other privileged credential to Amplify.
- The only frontend variables are `VITE_ADMIN_ENV`, `VITE_SUPABASE_URL`, and
  `VITE_SUPABASE_ANON_KEY`.
- The `dev` build must contain only the development project reference.
- The `master` build must contain only the production project reference.
- Deploy and accept development before production.
- Never run Playwright, checkout, synthetic-order, refund, or label-creation
  tests against production.
- Use bounded deployment-status checks. Do not start recurring production
  monitoring from this runbook.

## 1. Local preflight

From the repository root:

```bash
git status --short
npm --prefix admin ci
npm --prefix admin test

VITE_ADMIN_ENV=development \
VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co \
VITE_SUPABASE_ANON_KEY=test-anon \
npm --prefix admin run build
npm --prefix admin run verify:artifact -- development

VITE_ADMIN_ENV=production \
VITE_SUPABASE_URL=https://gvfptmjluxpngfjendbi.supabase.co \
VITE_SUPABASE_ANON_KEY=test-anon \
npm --prefix admin run build
npm --prefix admin run verify:artifact -- production
```

Both scans must pass before any deployment.

## 2. Prepare the development Supabase project

Link the CLI to development and inspect the target before pushing:

```bash
supabase projects list
supabase link --project-ref rodvvmfzkyjsqbufkjbc
supabase migration list --linked
supabase db push --linked
```

Deploy the five admin functions:

```bash
supabase functions deploy admin-dashboard \
  --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy admin-orders \
  --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy admin-events \
  --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy cancel-order \
  --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy create-sendcloud-parcel \
  --project-ref rodvvmfzkyjsqbufkjbc
```

Confirm that server-only secrets remain in Supabase Edge Function secrets.
Do not copy them to AWS.

In Supabase Auth:

1. Give the administrator user protected app metadata
   `{"role":"admin"}`. Do not use editable user metadata for authorization.
2. Add `https://admin-dev.bysolum.co.uk` to the allowed redirect URLs.
3. Confirm TOTP MFA is enabled.

The first successful administrator login enrolls a TOTP factor. Subsequent
sessions must complete a TOTP challenge and reach `aal2`.

## 3. Create the separate Amplify app

In AWS Amplify, region `eu-west-2`:

1. Choose **Create new app → Host web app → GitHub**.
2. Authorize/install the AWS Amplify GitHub App if prompted.
3. Select repository `hdandi08/solum`.
4. Select branch `dev`.
5. Select **My app is a monorepo** and enter app root `admin`.
6. Name the app `solum-admin`.
7. Confirm Amplify sets `AMPLIFY_MONOREPO_APP_ROOT=admin`.
8. Confirm the build settings match `admin/amplify.yml`.
9. Enable branch password protection as defence in depth.

Amplify's current monorepo guidance requires the app root and
`AMPLIFY_MONOREPO_APP_ROOT` to match:
<https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html>.

This repository also contains the existing marketing app's root
`amplify.yml`. Before saving the new app, inspect the generated build preview.
It must run `npm ci`, tests, the Vite build, and the artifact verifier from
`admin/`. If the preview or build log shows `npm --prefix web`, writes a
`web/.env`, or publishes `web/dist`, stop the deployment. Do not modify or
redeploy `solum-web` to work around an incorrect new-app build root.

## 4. Configure branch variables

Set these variables on the `dev` branch:

```text
VITE_ADMIN_ENV=development
VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co
VITE_SUPABASE_ANON_KEY=<development anon key>
```

Add the `master` branch only after development acceptance, then set:

```text
VITE_ADMIN_ENV=production
VITE_SUPABASE_URL=https://gvfptmjluxpngfjendbi.supabase.co
VITE_SUPABASE_ANON_KEY=<production anon key>
```

Anon keys are public client identifiers, but keep environment values scoped to
the correct branch. Never define any variable containing `SERVICE_ROLE`.

## 5. Configure SPA rewriting

In the new `solum-admin` app only, add this `200` rewrite after static asset
rules:

```text
Source:
</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>

Target:
/index.html

Status:
200
```

This lets `/orders`, `/events`, and `/login` load directly. Do not copy the
marketing app's `.well-known` or tracking-related rules.

## 6. Configure admin-only security headers

Set custom headers in the new Amplify app under
**Hosting → Custom headers**. Do not add a repository-root `customHttp.yml`,
because that file would also affect the existing marketing app.

AWS's current custom-header procedure is documented here:
<https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html>.

Use:

```yaml
customHeaders:
  - pattern: '**'
    headers:
      - key: Cache-Control
        value: no-store
      - key: Content-Security-Policy
        value: >-
          default-src 'self'; script-src 'self'; style-src 'self';
          font-src 'self'; img-src 'self' data:; connect-src 'self'
          https://rodvvmfzkyjsqbufkjbc.supabase.co
          wss://rodvvmfzkyjsqbufkjbc.supabase.co
          https://gvfptmjluxpngfjendbi.supabase.co
          wss://gvfptmjluxpngfjendbi.supabase.co; object-src 'none';
          base-uri 'self'; frame-ancestors 'none'; form-action 'self';
          upgrade-insecure-requests
      - key: Strict-Transport-Security
        value: max-age=31536000; includeSubDomains
      - key: X-Content-Type-Options
        value: nosniff
      - key: Referrer-Policy
        value: no-referrer
      - key: Permissions-Policy
        value: camera=(), geolocation=(), microphone=(), payment=()
      - key: X-Frame-Options
        value: DENY
```

Redeploy the admin app after saving headers.

## 7. Map development domain and accept

Map `admin-dev.bysolum.co.uk` to the `dev` branch in the new app. Amplify
manages the Route 53 record and TLS certificate.

Development acceptance:

1. The login page visibly says **Development environment**.
2. A non-admin account is denied.
3. A new admin is required to scan the TOTP QR code and verify six digits.
4. A returning admin at `aal1` is challenged before data renders.
5. Dashboard, Orders, and Events load development data.
6. Order filters and pagination work.
7. Invalid dispatch transitions return a conflict without changing data.
8. Do not create real refunds or real shipping labels as an acceptance test.
9. Browser network requests go only to the development Supabase project and
   local static assets.
10. Response headers include the CSP, `Cache-Control: no-store`, HSTS,
    `X-Content-Type-Options`, and clickjacking protection.

Inspect the deployed app with bounded CLI calls:

```bash
aws sts get-caller-identity
aws amplify list-apps \
  --region eu-west-2 \
  --query 'apps[?name==`solum-admin`].{id:appId,name:name,repo:repository}'
aws amplify get-app \
  --region eu-west-2 \
  --app-id <ADMIN_APP_ID> \
  --query 'app.{name:name,defaultDomain:defaultDomain,repo:repository}'
aws amplify list-branches \
  --region eu-west-2 \
  --app-id <ADMIN_APP_ID> \
  --query 'branches[].{name:branchName,stage:stage,auto:enableAutoBuild}'
aws amplify list-jobs \
  --region eu-west-2 \
  --app-id <ADMIN_APP_ID> \
  --branch-name dev \
  --max-results 5
```

Stop after a bounded result; do not poll continuously.

## 8. Promote the backend and frontend to production

Only after development acceptance:

```bash
supabase link --project-ref gvfptmjluxpngfjendbi
supabase migration list --linked
supabase db push --linked

supabase functions deploy admin-dashboard \
  --project-ref gvfptmjluxpngfjendbi
supabase functions deploy admin-orders \
  --project-ref gvfptmjluxpngfjendbi
supabase functions deploy admin-events \
  --project-ref gvfptmjluxpngfjendbi
supabase functions deploy cancel-order \
  --project-ref gvfptmjluxpngfjendbi
supabase functions deploy create-sendcloud-parcel \
  --project-ref gvfptmjluxpngfjendbi
```

In production Supabase Auth:

1. Set `app_metadata.role=admin` for the intended administrator.
2. Add `https://admin.bysolum.co.uk` to allowed redirect URLs.
3. Confirm TOTP MFA is enabled.

Connect the Amplify `master` branch with the production-only variables, deploy
that saved commit, and map `admin.bysolum.co.uk` to `master`.

Production acceptance is read-only:

1. Confirm the red **Production** banner.
2. Confirm role and MFA enforcement.
3. Load Dashboard, Orders, and Events.
4. Confirm no browser request reaches the development project.
5. Confirm security headers and the artifact scan in build logs.
6. Do not run production E2E, checkout, synthetic orders, refunds, dispatch
   mutations, or label creation.

## 9. Rollback

Frontend rollback:

1. In the `solum-admin` branch history, select the prior successful deployment.
2. Choose **Redeploy this version**.
3. Verify the prior commit and artifact scan in the bounded job result.
4. If access must be stopped immediately, enable branch access control or
   remove the admin custom-domain association. Do not alter apex/`www`.

Edge Function rollback:

1. Check out the last accepted commit.
2. Redeploy the five functions to the affected project reference.
3. Do not delete audit rows.

Database migrations are additive and are not rolled back automatically.
If a migration causes a problem, create a reviewed forward migration. Never
drop `admin_audit_events` or weaken its append-only guard as a rollback.

## 10. Final inspection

```bash
aws amplify get-domain-association \
  --region eu-west-2 \
  --app-id <ADMIN_APP_ID> \
  --domain-name bysolum.co.uk
aws amplify list-jobs \
  --region eu-west-2 \
  --app-id <ADMIN_APP_ID> \
  --branch-name master \
  --max-results 5
```

Record the app ID and accepted `dev`/`master` commit SHAs. Do not start a
recurring production monitor.
