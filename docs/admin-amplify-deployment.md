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

`solum-admin` is a manually deployed static Amplify application. It is not
connected to GitHub. This avoids the repository-root marketing build spec and
keeps the existing storefront application unchanged:
<https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html>.

## Non-negotiable controls

- Never add a Supabase service-role key, Stripe secret, SendCloud secret, or
  other privileged credential to Amplify.
- `VITE_ADMIN_ENV`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` are
  local build inputs only. They are not stored in Amplify.
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

Retire the three unreferenced legacy mutation functions from development:

```bash
supabase functions delete admin-adjust-stock \
  --project-ref rodvvmfzkyjsqbufkjbc
supabase functions delete admin-confirm-delivery \
  --project-ref rodvvmfzkyjsqbufkjbc
supabase functions delete admin-supplier-order \
  --project-ref rodvvmfzkyjsqbufkjbc
```

Confirm with `supabase functions list --project-ref rodvvmfzkyjsqbufkjbc`
that the five canonical functions are active and the three retired functions
are absent.

Confirm that server-only secrets remain in Supabase Edge Function secrets.
Do not copy them to AWS.

In Supabase Auth:

1. Give the administrator user protected app metadata
   `{"role":"admin"}`. Do not use editable user metadata for authorization.
2. Add `https://admin-dev.bysolum.co.uk` to the allowed redirect URLs.
3. Confirm TOTP MFA is enabled.

The first successful administrator login enrolls a TOTP factor. Subsequent
sessions must complete a TOTP challenge and reach `aal2`.

## 3. Create the separate manual Amplify app

Confirm that no app with the same name exists, then create it once:

```bash
aws amplify list-apps \
  --region eu-west-2 \
  --query 'apps[?name==`solum-admin`].{id:appId,name:name,repo:repository}'

aws amplify create-app \
  --region eu-west-2 \
  --name solum-admin \
  --description "Isolated SOLUM administrator application" \
  --platform WEB \
  --no-enable-branch-auto-build \
  --no-enable-auto-branch-creation

admin_app_id=$(aws amplify list-apps \
  --region eu-west-2 \
  --query 'apps[?name==`solum-admin`].appId | [0]' \
  --output text)
test -n "$admin_app_id"
test "$admin_app_id" != "None"
```

The app's repository field must be empty. Never copy the existing `solum-web`
app ID.

Create a password-protected development branch. The generated password is
saved to the macOS Keychain and is never printed:

```bash
admin_basic_user=solum-admin
admin_basic_password=$(openssl rand -base64 24 | tr -d '\n')
security add-generic-password \
  -U \
  -a "$USER" \
  -s solum-admin-dev-basic-auth \
  -w "$admin_basic_password"
admin_basic_credentials=$(printf '%s:%s' \
  "$admin_basic_user" "$admin_basic_password" | base64 | tr -d '\n')

aws amplify create-branch \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name dev \
  --stage DEVELOPMENT \
  --no-enable-auto-build \
  --enable-basic-auth \
  --basic-auth-credentials "$admin_basic_credentials"
```

## 4. Build and deploy a development artifact

Load the existing local public client configuration without printing it, then
build and scan exactly the development environment:

```bash
set -a
source admin/.env
set +a
test "$VITE_SUPABASE_URL_DEV" = \
  "https://rodvvmfzkyjsqbufkjbc.supabase.co"

VITE_ADMIN_ENV=development \
VITE_SUPABASE_URL="$VITE_SUPABASE_URL_DEV" \
VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY_DEV" \
npm --prefix admin run build
npm --prefix admin run verify:artifact -- development
```

Create an archive whose root contains `index.html` and `assets/`:

```bash
admin_artifact_dir=$(mktemp -d)
admin_artifact_zip="$admin_artifact_dir/solum-admin-development.zip"
(
  cd admin/dist
  zip -qr "$admin_artifact_zip" .
)
unzip -l "$admin_artifact_zip" | sed -n '1,30p'
```

Create the manual deployment, upload only to its short-lived URL, and start the
job:

```bash
deployment_json=$(aws amplify create-deployment \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name dev)
deployment_job_id=$(printf '%s' "$deployment_json" | jq -er '.jobId')
deployment_upload_url=$(printf '%s' "$deployment_json" | jq -er '.zipUploadUrl')

curl --fail-with-body --silent --show-error \
  --request PUT \
  --upload-file "$admin_artifact_zip" \
  "$deployment_upload_url"

aws amplify start-deployment \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name dev \
  --job-id "$deployment_job_id"

aws amplify get-job \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name dev \
  --job-id "$deployment_job_id" \
  --query 'job.summary.{id:jobId,status:status,start:startTime,end:endTime}'
```

If the first result is not terminal, make at most two further bounded checks.
Do not run a polling loop. No Vite variable or upload URL is saved in Amplify
or committed.

## 5. Configure SPA rewriting

In the new `solum-admin` app only, set this one `200` rewrite:

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

```bash
admin_custom_rules='[
  {
    "source":"</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "target":"/index.html",
    "status":"200"
  }
]'
```

## 6. Configure admin-only security headers

Set custom headers on the new Amplify app only. Do not add a repository-root
`customHttp.yml`, because that file would also affect the existing marketing
app.

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

Apply the rewrite and the same header policy through the CLI:

```bash
admin_custom_headers=$(printf '%s\n' \
  'customHeaders:' \
  "  - pattern: '**'" \
  '    headers:' \
  '      - key: Cache-Control' \
  '        value: no-store' \
  '      - key: Content-Security-Policy' \
  "        value: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://rodvvmfzkyjsqbufkjbc.supabase.co wss://rodvvmfzkyjsqbufkjbc.supabase.co https://gvfptmjluxpngfjendbi.supabase.co wss://gvfptmjluxpngfjendbi.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests" \
  '      - key: Strict-Transport-Security' \
  '        value: max-age=31536000; includeSubDomains' \
  '      - key: X-Content-Type-Options' \
  '        value: nosniff' \
  '      - key: Referrer-Policy' \
  '        value: no-referrer' \
  '      - key: Permissions-Policy' \
  '        value: camera=(), geolocation=(), microphone=(), payment=()' \
  '      - key: X-Frame-Options' \
  '        value: DENY')

aws amplify update-app \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --custom-rules "$admin_custom_rules" \
  --custom-headers "$admin_custom_headers"
```

## 7. Map development domain and accept

Attempt to map only `admin-dev.bysolum.co.uk` to the `dev` branch:

```bash
aws amplify create-domain-association \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --domain-name bysolum.co.uk \
  --sub-domain-settings prefix=admin-dev,branchName=dev
```

If AWS reports that `bysolum.co.uk` is already associated with `solum-web`,
stop. Do not delete, update, or detach that existing association.

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
  --app-id "$admin_app_id" \
  --query 'app.{name:name,defaultDomain:defaultDomain,repo:repository}'
aws amplify list-branches \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --query 'branches[].{name:branchName,stage:stage,auto:enableAutoBuild}'
aws amplify list-jobs \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
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

Retire the same unreferenced legacy mutation/test functions from production:

```bash
supabase functions delete admin-adjust-stock \
  --project-ref gvfptmjluxpngfjendbi
supabase functions delete admin-confirm-delivery \
  --project-ref gvfptmjluxpngfjendbi
supabase functions delete admin-supplier-order \
  --project-ref gvfptmjluxpngfjendbi
supabase functions delete set-test-stock \
  --project-ref gvfptmjluxpngfjendbi
```

Confirm with `supabase functions list --project-ref gvfptmjluxpngfjendbi`
that the five canonical functions are active and the four retired functions
are absent.

In production Supabase Auth:

1. Set `app_metadata.role=admin` for the intended administrator.
2. Add `https://admin.bysolum.co.uk` to allowed redirect URLs.
3. Confirm TOTP MFA is enabled.

Build and scan the production artifact locally. Do not reuse the development
archive:

```bash
set -a
source admin/.env
set +a
test "$VITE_SUPABASE_URL_PROD" = \
  "https://gvfptmjluxpngfjendbi.supabase.co"

VITE_ADMIN_ENV=production \
VITE_SUPABASE_URL="$VITE_SUPABASE_URL_PROD" \
VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY_PROD" \
npm --prefix admin run build
npm --prefix admin run verify:artifact -- production

production_artifact_dir=$(mktemp -d)
production_artifact_zip="$production_artifact_dir/solum-admin-production.zip"
(
  cd admin/dist
  zip -qr "$production_artifact_zip" .
)
```

Create `master` only after development acceptance, protect it with a separate
generated password, and deploy the production archive through a new
short-lived upload URL:

```bash
production_basic_password=$(openssl rand -base64 24 | tr -d '\n')
security add-generic-password \
  -U \
  -a "$USER" \
  -s solum-admin-production-basic-auth \
  -w "$production_basic_password"
production_basic_credentials=$(printf '%s:%s' \
  solum-admin "$production_basic_password" | base64 | tr -d '\n')

aws amplify create-branch \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name master \
  --stage PRODUCTION \
  --no-enable-auto-build \
  --enable-basic-auth \
  --basic-auth-credentials "$production_basic_credentials"

production_deployment_json=$(aws amplify create-deployment \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name master)
production_job_id=$(printf '%s' "$production_deployment_json" | jq -er '.jobId')
production_upload_url=$(printf '%s' "$production_deployment_json" | jq -er '.zipUploadUrl')

curl --fail-with-body --silent --show-error \
  --request PUT \
  --upload-file "$production_artifact_zip" \
  "$production_upload_url"

aws amplify start-deployment \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name master \
  --job-id "$production_job_id"
```

Map `admin.bysolum.co.uk` only after the production deployment reaches
`SUCCEED`.

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

1. Rebuild the last accepted source commit for the affected environment.
2. Run the environment-specific artifact verifier.
3. Create a new manual deployment, upload the verified archive, and start it.
4. Verify the bounded job result.
5. If access must be stopped immediately, enable branch access control or
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
  --app-id "$admin_app_id" \
  --domain-name bysolum.co.uk
aws amplify list-jobs \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name master \
  --max-results 5
```

Record the app ID, accepted `dev`/`master` source commit SHAs, and manual
deployment job IDs. Do not start a recurring production monitor.
