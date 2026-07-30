# SOLUM Admin Manual Amplify Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the reviewed SOLUM admin as an isolated static Amplify
application through the authenticated AWS CLI without connecting GitHub or
changing the existing `solum-web` application.

**Architecture:** Build one environment-specific admin artifact locally, scan
it, zip only the contents of `admin/dist`, and upload it through Amplify's
short-lived manual-deployment URL. A separate manual Amplify app contains
development and, only after acceptance, production branches; Supabase remains
the authenticated server boundary.

**Tech Stack:** React, Vite, Vitest, Supabase Edge Functions, AWS Amplify
Hosting manual deployments, AWS CLI, curl, zip.

## Global Constraints

- AWS account is exactly `798470762256`; region is exactly `eu-west-2`.
- Existing Amplify app `solum-web` (`d3pa095gzazg3c`) is never updated.
- Development Supabase project is exactly `rodvvmfzkyjsqbufkjbc`.
- Production Supabase project is exactly `gvfptmjluxpngfjendbi`.
- Development origin is exactly `https://admin-dev.bysolum.co.uk`.
- Production origin is exactly `https://admin.bysolum.co.uk`.
- Never place service-role, Stripe, SendCloud, GitHub, or other privileged
  credentials in Amplify or a browser artifact.
- A development artifact contains no production project reference; a
  production artifact contains no development project reference.
- Development deployment and acceptance complete before production work.
- Never run production E2E, checkout, synthetic-order, refund, label,
  dispatch, cancellation, or other mutation tests.
- Use only bounded deployment-status checks; do not create monitoring loops.

---

## File Map

- Modify: `docs/admin-amplify-deployment.md` — replace Git-connected setup with
  the accepted manual artifact workflow and record observed deployment data.
- Consume: `admin/dist/**` — verified environment-specific static artifact.
- Consume: `admin/scripts/verify-artifact.mjs` — environment-isolation and
  credential/tracker scan.
- Consume: `docs/superpowers/specs/2026-07-30-admin-amplify-manual-deployment-design.md`
  — approved design and stop conditions.

---

### Task 1: Update the executable deployment runbook

**Files:**

- Modify: `docs/admin-amplify-deployment.md`

**Interfaces:**

- Consumes: the approved manual-deployment design.
- Produces: exact operator commands for repeatable development and production
  manual releases.

- [ ] **Step 1: Replace Git-connected app creation**

Document that `solum-admin` has no repository and is created with:

```bash
aws amplify create-app \
  --region eu-west-2 \
  --name solum-admin \
  --description "Isolated SOLUM administrator application" \
  --platform WEB \
  --no-enable-branch-auto-build \
  --no-enable-auto-branch-creation
```

- [ ] **Step 2: Replace branch auto-build instructions**

Document the environment-specific local build, artifact scan, content-only zip,
`create-deployment`, upload, `start-deployment`, and bounded `get-job`
commands. State that Vite variables are build inputs only and are not saved to
Amplify.

- [ ] **Step 3: Preserve the security and rollback sections**

Keep the exact production-safety gate, security headers, SPA rewrite, domain
stop condition, and non-destructive production acceptance. Change rollback to
redeploying the last accepted verified artifact.

- [ ] **Step 4: Verify and commit the runbook**

Run:

```bash
rg -n "GitHub|auto-build|manual|create-deployment|start-deployment" \
  docs/admin-amplify-deployment.md
git diff --check
```

Expected: GitHub appears only in the explanation of why the admin app is not
repository connected; manual deployment commands are complete; diff check is
clean.

Commit:

```bash
git add docs/admin-amplify-deployment.md
git commit -m "docs: switch admin hosting to manual artifacts"
```

---

### Task 2: Create and deploy the development admin application

**Files:**

- No source-code changes.
- Update: `docs/admin-amplify-deployment.md` after observed AWS results.

**Interfaces:**

- Consumes: reviewed `dev` source and the local development anon client
  configuration.
- Produces: a separate manual Amplify app, active `dev` branch, deployment job,
  and immutable uploaded artifact.

- [ ] **Step 1: Confirm account, source, and existing app isolation**

Run:

```bash
aws sts get-caller-identity \
  --query '{Account:Account,Arn:Arn}' \
  --output json
git status --short --branch
aws amplify list-apps \
  --region eu-west-2 \
  --query 'apps[?name==`solum-admin`].{id:appId,name:name,repo:repository}' \
  --output json
```

Expected: account `798470762256`, clean `dev`, and no existing `solum-admin`
app. If an app exists, inspect and reuse it only when it has no repository and
matches this design; never call `create-app` twice.

- [ ] **Step 2: Build and verify the development artifact**

Load the existing local development public configuration without printing it:

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

Expected: build and artifact verification pass. No variable value is printed.

- [ ] **Step 3: Create a content-only archive**

Run:

```bash
admin_artifact_dir=$(mktemp -d)
admin_artifact_zip="$admin_artifact_dir/solum-admin-development.zip"
(
  cd admin/dist
  zip -qr "$admin_artifact_zip" .
)
unzip -l "$admin_artifact_zip" | sed -n '1,30p'
```

Expected: `index.html` and `assets/` are at the archive root; there is no
top-level `dist/` directory.

- [ ] **Step 4: Create the isolated manual app once**

Run the `create-app` command from Task 1. Capture and validate its ID:

```bash
admin_app_id=$(aws amplify list-apps \
  --region eu-west-2 \
  --query 'apps[?name==`solum-admin`].appId | [0]' \
  --output text)
test -n "$admin_app_id"
test "$admin_app_id" != "None"
```

Expected: one app named `solum-admin` with an empty repository field.

- [ ] **Step 5: Create the protected development branch**

Generate a unique password without printing it and save it in the macOS
Keychain:

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

Expected: branch `dev`, stage `DEVELOPMENT`, auto-build disabled, basic auth
enabled.

- [ ] **Step 6: Apply app-level SPA and security policy**

Set one extensionless-route SPA rewrite and app-wide security headers. The CSP
allows only self assets and the two fixed Supabase origins because Amplify
custom headers apply to every branch in one app:

```bash
admin_custom_rules='[
  {
    "source":"</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "target":"/index.html",
    "status":"200"
  }
]'

admin_custom_headers=$(printf '%s\n' \
  'customHeaders:' \
  \"  - pattern: '**'\" \
  '    headers:' \
  '      - key: Cache-Control' \
  '        value: no-store' \
  '      - key: Content-Security-Policy' \
  \"        value: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://rodvvmfzkyjsqbufkjbc.supabase.co wss://rodvvmfzkyjsqbufkjbc.supabase.co https://gvfptmjluxpngfjendbi.supabase.co wss://gvfptmjluxpngfjendbi.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests\" \
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

- [ ] **Step 7: Upload and start the development deployment**

Run:

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
```

The short-lived upload URL is held only in shell memory and is never printed or
written to the repository.

- [ ] **Step 8: Perform bounded job inspection**

Run one check:

```bash
aws amplify get-job \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name dev \
  --job-id "$deployment_job_id" \
  --query 'job.summary.{id:jobId,status:status,start:startTime,end:endTime}' \
  --output json
```

If the status is not terminal, make at most two further checks after other
useful work. Do not run a polling loop.

- [ ] **Step 9: Attempt the development hostname safely**

Run:

```bash
aws amplify create-domain-association \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --domain-name bysolum.co.uk \
  --sub-domain-settings prefix=admin-dev,branchName=dev
```

If AWS reports that `bysolum.co.uk` is already associated with `solum-web`,
stop. Do not delete, update, or detach the existing domain association.

- [ ] **Step 10: Record observed deployment state**

Record the app ID, default branch URL, job ID/status, hostname result, and date
in `docs/admin-amplify-deployment.md`. Commit and push only documentation:

```bash
git add docs/admin-amplify-deployment.md
git commit -m "docs: record development admin deployment"
git push origin dev
```

---

### Task 3: Accept development and preserve the production gate

**Files:**

- Update: `docs/admin-amplify-deployment.md`

**Interfaces:**

- Consumes: successful development deployment and custom hostname.
- Produces: documented acceptance evidence or an exact blocked condition;
  production remains gated.

- [ ] **Step 1: Verify AWS configuration**

Run:

```bash
aws amplify get-app \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --query 'app.{name:name,repo:repository,defaultDomain:defaultDomain,rules:customRules}' \
  --output json
aws amplify get-branch \
  --region eu-west-2 \
  --app-id "$admin_app_id" \
  --branch-name dev \
  --query 'branch.{name:branchName,stage:stage,auto:enableAutoBuild,basic:enableBasicAuth}' \
  --output json
```

Expected: empty repository, `dev`, `DEVELOPMENT`, auto-build false, basic auth
true.

- [ ] **Step 2: Complete development browser acceptance**

At `https://admin-dev.bysolum.co.uk`:

1. Confirm the development banner.
2. Confirm a non-admin is forbidden.
3. Sign in as `harsha@bysolum.com`, enrol or challenge TOTP, and reach `aal2`.
4. Load Dashboard, Orders, and Events.
5. Perform one preselected reversible development order-status transition and
   confirm one audit row.
6. Confirm network requests contain no PostHog, Meta, TikTok, Google Ads, or
   Awin request.

- [ ] **Step 3: Reconfirm storefront isolation**

Run:

```bash
aws amplify get-domain-association \
  --region eu-west-2 \
  --app-id d3pa095gzazg3c \
  --domain-name bysolum.co.uk \
  --query 'domainAssociation.subDomains[].{prefix:subDomainSetting.prefix,branch:subDomainSetting.branchName}' \
  --output json
```

Expected: the existing apex and `www` mappings are unchanged.

- [ ] **Step 4: Record the gate**

If all acceptance checks pass, mark development accepted in the runbook. If
the hostname cannot be attached safely, record the exact AWS error and keep
production blocked. Do not create or deploy the production branch in this
task.
