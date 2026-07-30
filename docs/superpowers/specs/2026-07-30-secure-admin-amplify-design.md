# SOLUM Secure Admin and AWS Amplify Deployment Design

**Date:** 2026-07-30

**Status:** Design approved; awaiting written-spec review

**Initial modules:** Dashboard, Orders, Events

**Production hostname:** `admin.bysolum.co.uk`

**Development hostname:** `admin-dev.bysolum.co.uk`

## Context

SOLUM already has a standalone Vite application in `admin/`, but it is not
deployed. The only current Amplify application is the public `solum-web` app
(`d3pa095gzazg3c`) in `eu-west-2`.

The admin application is currently unsafe to publish:

- `admin/src/lib/clients.js` creates browser clients with production and
  development Supabase service-role keys.
- Vite would inline those keys into downloadable JavaScript.
- Service-role access bypasses Row Level Security.
- The browser-side email allow-list is only a user-interface check.
- Existing admin Edge Functions repeat hard-coded email allow-lists, allow
  cross-origin requests from any origin, and do not require MFA.
- The admin contains an environment switch that lets one browser session move
  between development and production.
- A second, unused admin implementation remains under `web/src/admin`, which
  makes it unclear which application is canonical.

The admin must not be deployed until service-role credentials have been removed
from the browser and every exposed data operation has a server-side
authorization boundary.

## Goals

1. Make `admin/` the single canonical admin frontend.
2. Deploy it separately from the customer website using AWS Amplify Hosting.
3. Compile each deployment for exactly one Supabase environment.
4. Require a valid Supabase session, an administrator role, and MFA assurance
   level `aal2` for every admin API request.
5. Keep Supabase service-role credentials exclusively inside Edge Functions.
6. Expose only Dashboard, Orders, and Events in the first secure deployment.
7. Provide consistent API contracts, errors, audit records, and tests.
8. Leave the existing customer website and its Amplify deployment unchanged.

## Non-Goals

- Awin partner, commission-group, or channel-performance reporting. That is the
  next admin phase after the secure foundation is deployed.
- Migrating Stock, Payments, Bookkeeping, Subscribers, Customers, Creators, or
  other legacy admin pages in this phase.
- Running browser E2E tests against production.
- Moving Supabase, Stripe, SendCloud, Awin, or other backends into AWS.
- Adding a VPN, AWS WAF, Cognito, API Gateway, or a second identity provider.

## Approaches Considered

### 1. Separate Amplify app with isolated development and production branches

This is the selected approach. One new `solum-admin` Amplify application builds
the repository's `admin/` root. Its `master` branch is production and its `dev`
branch is development. Each branch receives only its own Supabase URL and anon
key and has its own hostname.

This keeps the admin independent from marketing scripts and storefront releases
while retaining simple Git-based deployment.

### 2. Add `/admin` to the public `solum-web` application

This requires fewer AWS resources, but the public HTML currently loads
advertising and analytics scripts before React. It would couple admin and
storefront deployments, caching rules, security headers, and failure modes.
This approach is rejected.

### 3. Deploy one admin site with a browser development/production switch

This preserves the current workflow, but a single build would know both
environments and makes accidental production changes more likely. This approach
is rejected.

## AWS Architecture

```text
GitHub repository: hdandi08/solum
  |
  +-- master -----------------> Amplify solum-web ----------------> bysolum.co.uk
  |
  +-- master --+
  |            +-------------> Amplify solum-admin / master -----> admin.bysolum.co.uk
  +-- dev -----+
               +-------------> Amplify solum-admin / dev --------> admin-dev.bysolum.co.uk
```

The existing `solum-web` Amplify application remains unchanged. A new
`solum-admin` application is connected to the same GitHub repository with
monorepo root `admin`.

Branch configuration:

| Amplify branch | Source branch | Supabase project | Hostname | Visual mode |
| --- | --- | --- | --- | --- |
| `master` | `master` | production (`gvfptmjluxpngfjendbi`) | `admin.bysolum.co.uk` | red production banner |
| `dev` | `dev` | development (`rodvvmfzkyjsqbufkjbc`) | `admin-dev.bysolum.co.uk` | amber development banner |

The environment is set at build time with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_ENV`, exactly `production` or `development`

These values are public frontend configuration, not secrets. No variable named
`SERVICE_ROLE`, and no other privileged credential, is configured in Amplify.
AWS also advises that frontend framework environment variables must not contain
secrets because they can be present in deployment artifacts.

The app uses `npm ci --include=dev` and `npm run build`. A single-page
application rewrite serves `index.html` for client-side routes.

The domain association is created with the AWS CLI so it claims only the unused
`admin` and `admin-dev` prefixes of `bysolum.co.uk`; the Amplify console must not
be allowed to add the apex or `www` hostnames to the new app. It does not move or
reassign those existing hostnames from `solum-web`. Amplify-managed TLS is
required before either custom hostname is considered ready.

The admin Amplify application receives app-specific security headers:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy`
- `Cache-Control: no-store` for `index.html`

The CSP permits the admin's own assets, the selected Supabase project, and only
the minimum font resources required by the interface. The admin build contains
no PostHog, Meta, TikTok, Google Ads, or Awin code.

Amplify branch access control password-protects both branches as defence in
depth during initial rollout. The shared hosting password is configured in
Amplify and is not committed or placed in the browser bundle. This layer does
not replace Supabase authentication, administrator authorization, or MFA.

## Environment Isolation

The production and development URLs are separate applications from the
browser's point of view:

- There is no environment selector.
- There is one Supabase client per build.
- A development bundle cannot call production because no production Supabase
  URL is compiled into it.
- A production bundle cannot call development.
- The environment banner is derived from `VITE_ADMIN_ENV`, not local storage.
- The application refuses to start if the environment label and allowed
  Supabase project reference do not match.

Production mutations retain explicit confirmation prompts. Irreversible actions
such as refunding an order or creating a shipping label must state the effect
and identify the target order before submission.

## Authentication and Authorization

### Browser authentication

The browser authenticates using the environment's Supabase anon client. It
never receives a service-role key.

The login flow is:

1. Sign in with the configured administrator account.
2. Reject users whose protected `app_metadata.role` is not `admin`.
3. Enrol a TOTP factor when the administrator has no verified factor.
4. Challenge the verified factor.
5. Render protected routes only after the session reaches `aal2`.

The frontend checks improve usability, but they are not the security boundary.

### Server authorization

A shared Edge Function helper owns admin authorization. Every admin-facing
function uses it before reading a request body or accessing business data:

1. Require a bearer access token.
2. Validate the token against Supabase Auth.
3. Require `user.app_metadata.role === "admin"`.
4. Require JWT assurance level `aal2`.
5. Apply an exact CORS allow-list for the current environment:
   - production: `https://admin.bysolum.co.uk`
   - development: `https://admin-dev.bysolum.co.uk`,
     `http://localhost:5174`, and `http://127.0.0.1:5174`
6. Return a normalized authenticated actor containing user ID and email.

Missing or invalid authentication returns `401`. An authenticated non-admin or
non-`aal2` session returns `403`. The frontend signs out or sends the user back
through the appropriate login/MFA step.

The service-role client is created only after authorization succeeds and exists
only inside the Edge Function runtime.

Existing admin functions that remain reachable from Orders, including refund
and SendCloud actions, must use the same shared authorization helper before the
first production deployment.

## Canonical Frontend

`admin/` is the only admin application. The unused `web/src/admin` tree is
removed.

The first deployment exposes:

- `/` — Dashboard
- `/orders` — Orders
- `/events` — Events
- `/login` — Sign-in and MFA

Legacy page source under `admin/src/pages` is retained temporarily for later
migration, but it is not imported, routed, or linked in the deployable
application. The legacy service-role client module is deleted, so no retained
page can cause a privileged key to enter the bundle.

The layout contains a fixed, non-interactive environment banner and a sign-out
control. Production and development use visibly different treatments.

## API Boundaries and Contracts

The frontend uses one focused API client that:

- adds the current bearer token and anon `apikey`;
- parses the standard response envelope;
- handles `401`, `403`, validation, and server errors consistently;
- never falls back to direct table queries;
- never logs access tokens, customer details, or API response bodies.

Successful responses use:

```json
{
  "data": {},
  "request_id": "uuid"
}
```

Error responses use:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Administrator MFA is required."
  },
  "request_id": "uuid"
}
```

### `admin-dashboard`

`POST /functions/v1/admin-dashboard` returns:

```json
{
  "data": {
    "summary": {
      "active_subscribers": 0,
      "pending_orders": 0,
      "unresolved_payment_issues": 0,
      "products_at_risk": 0
    },
    "subscribers_by_kit": {},
    "products": [],
    "recent_orders": [],
    "recent_inventory_events": []
  },
  "request_id": "uuid"
}
```

Runway and risk are calculated on the server. The frontend renders the supplied
contract and does not maintain a second risk formula.

### `admin-orders`

`POST /functions/v1/admin-orders` lists orders using validated filters:

- page and page size;
- order type;
- order or dispatch status;
- bounded customer search.

It returns rows, total count, and pending dispatch-batch summaries. Customer
fields are limited to what the Orders interface displays.

`PATCH /functions/v1/admin-orders` performs reversible order record changes:

- mark dispatched with validated carrier/tracking values;
- mark delivered;
- reset to pending.

Refunds and SendCloud label actions continue through their dedicated Edge
Functions, after those functions adopt the shared authorization and audit
boundary.

### `admin-events`

`POST /functions/v1/admin-events` returns paginated inventory events and the
product options needed by the filter. It accepts validated product, event-type,
and date filters. There is no direct-query fallback.

## Audit Logging

Create an append-only `admin_audit_events` table with no browser policies.
Server functions write one event for every mutation:

- actor user ID and email;
- environment;
- action;
- target type and ID;
- timestamp;
- request ID;
- bounded before/after metadata without secrets or full customer records;
- success or failure.

The first phase records order-status changes, refunds, and shipping-label
creation. Read-only dashboard and list requests are not recorded as audit
events.

Database-only mutations and their audit events use one database transaction.
External mutations create a `pending` audit event before calling Stripe or
SendCloud, then update it to `succeeded` or `failed`. Failure to create the
pending event blocks the external call. An operation is never reported as
successful unless its audit record is also successful.

## Error Handling

- Missing frontend configuration: render a configuration error and make no API
  request.
- Supabase environment mismatch: stop application startup.
- Expired session: return to login without exposing the prior page's data.
- Missing MFA: route to the MFA challenge.
- Unauthorized origin: omit CORS authorization and return `403`.
- Invalid filters or mutation input: return `400` with field-safe guidance.
- Database or integration failure: return a generic user message with a request
  ID; log the detailed error only in the server runtime.
- Partial mutation failure: use database RPC/transactional operations where
  multiple database writes must succeed together. External systems such as
  Stripe or SendCloud retain their existing idempotency controls and produce a
  failed audit event when reconciliation is needed.
- Dashboard module failure: show a retry state without rendering stale figures
  as current.

## Testing

### Unit tests

- Environment validation accepts only the expected project reference for the
  compiled environment.
- The API client adds auth headers without logging them.
- API errors map to login, MFA, forbidden, validation, and retry states.
- Dashboard renders the canonical response contract.
- Orders serialize filters and mutations correctly.
- Events pagination and filters do not use a direct-table fallback.

### Edge Function tests

- No token returns `401`.
- Invalid token returns `401`.
- A valid non-admin token returns `403`.
- An admin token at `aal1` returns `403`.
- An admin token at `aal2` succeeds.
- An unapproved origin fails closed.
- Dashboard contract uses the canonical field names.
- Orders rejects invalid pagination, carrier, tracking, and state transitions.
- Events rejects invalid dates and transaction types.
- Every successful mutation writes one audit event.
- A failed mutation writes or preserves an actionable failed audit record
  without exposing secrets.

### Build and artifact tests

- `npm --prefix admin run build` succeeds.
- The built JavaScript contains no service-role key and no
  `VITE_SUPABASE_SERVICE_ROLE_KEY` marker.
- The production artifact contains only the production Supabase project
  reference.
- The development artifact contains only the development Supabase project
  reference.
- Neither artifact contains marketing tracker identifiers or scripts.
- Client-side routes resolve through the Amplify SPA rewrite.

### Deployment acceptance

Development is deployed and verified before production:

1. `admin-dev.bysolum.co.uk` presents development branding.
2. A non-admin cannot enter the application.
3. An administrator must complete MFA.
4. Dashboard, Orders, and Events load development data.
5. A reversible development order mutation succeeds and creates an audit event.
6. Browser developer tools show no service-role credentials and no marketing
   requests.

Production deployment then requires:

1. The production admin user's protected role is set.
2. MFA is enrolled and challenged.
3. Read-only pages load production data.
4. A preselected safe production verification confirms authorization and audit
   wiring without creating a payment, refund, shipment, or test order.
5. The customer site remains unchanged.

No Playwright or synthetic checkout tests run against either production
hostname.

## Deployment Sequence

1. Implement and test the secure admin frontend and shared server
   authorization layer.
2. Apply database migrations and deploy Edge Functions to development.
3. Build the development artifact and scan it for privileged credentials.
4. Create `solum-admin` in Amplify, connected to the existing GitHub
   repository with app root `admin`.
5. Connect the `dev` branch with development-only public configuration.
6. Configure SPA rewrites, access control, and admin-specific security headers.
7. Associate `admin-dev.bysolum.co.uk`, wait for managed TLS, and complete
   development acceptance.
8. Apply the same migrations and Edge Functions to production.
9. Connect `master` with production-only public configuration.
10. Associate `admin.bysolum.co.uk`, wait for managed TLS, and complete the
    non-destructive production acceptance.

The Amplify console is used for the initial GitHub App connection because the
existing repository connection cannot safely be inferred or recreated with the
CLI. Once the new app exists, branch, domain, headers, and access settings can
be inspected and managed with the AWS CLI.

## Rollback

- Disable the affected Amplify branch or remove its custom subdomain mapping.
- Roll the branch back to the last known-good Amplify deployment.
- Revert the frontend and Edge Function commits.
- Do not roll back the append-only audit table merely because the UI is rolled
  back.
- If a privileged credential is ever detected in an artifact, disable the
  deployment immediately, rotate the credential, invalidate the affected
  artifact, and review access logs before redeployment.

## Follow-On Phase

After this foundation is deployed, add the Awin attribution dashboard:

- publisher and publisher group dimensions;
- commission-group dimensions;
- Awin transaction ingestion and reconciliation;
- order-level attribution records;
- channel comparison without double-counting revenue;
- gross revenue, commission, net revenue, refund, and conversion reporting.

That phase consumes the same authenticated API client, server authorization,
audit, environment, and Amplify deployment boundaries defined here.
