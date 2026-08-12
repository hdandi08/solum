# Awin first-party `awc` cookie — tracking-subdomain deployment handoff

## Status

The former Amplify/CloudFront Function deployment is **superseded**. Do not
create, publish, associate, or re-associate the old CloudFront Function. The
Amplify-managed storefront distribution cannot provide the required durable
cookie endpoint safely.

Task 3 replaces it with an isolated tracking-subdomain service. This document
is the deployment handoff for that service; it does not authorise a production
deployment.

## Amplify clean-feed route

Amplify serves `solum-web` (`d3pa095gzazg3c`) from app-level custom rules.
`amplify.yml` does not update those app-level rules, so it must not be treated
as a deployment mechanism for the clean feed route. The approved rule artifact
is [`artefacts/solum-web-amplify-custom-rules.json`](../artefacts/solum-web-amplify-custom-rules.json).
Its required order is:

1. `/.well-known/<*>` passthrough.
2. `/feeds/awin.csv` proxy to the fixed production `awin-feed` Edge Function.
3. The existing SPA fallback, including its complete static-extension allow-list.

Verify the committed artifact without contacting AWS:

```bash
node scripts/awin/verify-amplify-custom-rules.mjs
```

Only after separate explicit production-deployment approval, apply that exact
artifact from the repository root:

```bash
aws amplify update-app \
  --region eu-west-2 \
  --app-id d3pa095gzazg3c \
  --custom-rules file://artefacts/solum-web-amplify-custom-rules.json
```

This command changes the live Amplify app and is intentionally not run by any
local test or verification script.

## Target architecture

- Production endpoint: `https://track.bysolum.co.uk/awin/click`
- Development endpoint: `https://track-dev.bysolum.co.uk/awin/click`
- Runtime: API Gateway HTTP API and Lambda with a custom domain in `eu-west-2`
- Cookie scope: `.bysolum.co.uk`
- Cookie lifetime: 30 days (`Max-Age=2592000`)

The browser sends a credentialed `POST` containing the landing-page checksum.
The service validates it, stores it in an HttpOnly cookie, and returns no
checksum in its response. `POST /awin/resolve` reads that cookie and returns a
short-lived opaque token for checkout; it never returns the checksum itself.

The cookie must be set with:

```text
awc=<validated-value>; Domain=.bysolum.co.uk; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax
```

## Task 3 deployment requirements

Task 3 must deploy the `infra/awin-tracking` SAM stack only after its local
tests and `sam validate` pass. The stack requires separate production and
development custom domains, an ACM certificate in `eu-west-2`, and an
`AWIN_ATTRIBUTION_SECRET` supplied from Secrets Manager. It must not modify the
storefront CloudFront distribution.

Production CORS accepts credentialed requests only from
`https://bysolum.co.uk` and `https://www.bysolum.co.uk`. The endpoint accepts
only `POST`, rate-limits requests through API Gateway, and logs no raw `awc`,
credentials, or request bodies.

The stack is defined at `infra/awin-tracking/template.yaml`. Its parameters are:

- `TrackingDomainName`: exactly `track-dev.bysolum.co.uk` or
  `track.bysolum.co.uk`.
- `CertificateArn`: an ACM certificate ARN issued in `eu-west-2` for that
  hostname.
- `AwinAttributionSecretArn`: the Secrets Manager ARN whose plaintext value is
  injected into the Lambda through a dynamic reference.
- `AllowedOrigins`: a required comma-separated list of exact origins with no
  stack default. Production must
  use `https://bysolum.co.uk,https://www.bysolum.co.uk`; development must use
  only the approved development storefront origin.
- `CookieDomain`: `.bysolum.co.uk`.

The same secret plaintext must be configured as
`AWIN_ATTRIBUTION_SECRET` for the `create-first-box-payment-intent` Supabase
function. It is used only to decrypt the five-minute opaque token. Never put
the secret, an `awc`, a request body, an email address, or a Stripe client
secret in a command line, deployment output, log, ticket, or screenshot.

Before any separately approved deployment, run locally:

```bash
node --test infra/awin-tracking/src/index.test.mjs
npm --prefix web run test:unit -- src/lib/awinCookieBridge.test.js src/lib/awinAttribution.test.js
deno test supabase/functions/_shared/awin.test.ts
sam validate --template-file infra/awin-tracking/template.yaml
```

After deployment, map the selected hostname to the stack's
`CustomDomainTarget` output using an approved DNS change. Do not point either
tracking hostname at the storefront CloudFront distribution. The
`ApiEndpoint` output is diagnostic only; browser traffic uses the custom
hostname so the cookie remains first-party.

## Browser and checkout flow

On a landing URL containing `awc`, the browser keeps the existing bounded
local attribution record and also sends the value once to `/awin/click` using
`credentials: include`. A module-level once guard prevents React StrictMode
effect replay from sending a duplicate request. Failure to reach the cookie
service does not block the storefront and is not logged.

At checkout, a valid direct `awc` remains preferred and no resolve request is
made. Only when a direct checksum is unavailable does the browser call
`/awin/resolve`; the resulting opaque token is sent as
`awin_attribution_token`. That lookup has a 500 ms deadline enforced with
`AbortController`; timeout, network, HTTP, and JSON failures return no token and
checkout proceeds immediately without AWIN metadata. The PaymentIntent function
decrypts a returned token, rejects it at expiry or if it claims a lifetime
beyond 300 seconds, and stores only the validated checksum and one of `aw`,
`display`, `ppc`, or `email` in Stripe metadata. The opaque token is not stored
in Stripe, orders, analytics, or admin data.

Node and Deno compatibility is locked by
`infra/awin-tracking/test-vectors/node-aes-gcm.json`. The Lambda test produces
that exact token with a fixed test-only IV, while the Deno test consumes the
same token and verifies both pre-expiry success and expiry-boundary rejection.

## Development acceptance

Use only development fixtures and the development tracking hostname to verify:

1. A valid click request receives a 30-day HttpOnly `.bysolum.co.uk` cookie.
2. An unapproved origin is rejected.
3. Resolve returns an opaque short-lived token, never the checksum.
4. No customer data, raw checksum, or secret is written to logs.

The development storefront currently uses `amplifyapp.com`, so cross-site
cookie recovery remains covered by the Lambda integration tests until a
`dev.bysolum.co.uk` storefront exists. Bounded local-storage attribution
remains the development browser fallback.

### Current development state (2026-08-12)

Development is exactly Supabase project `rodvvmfzkyjsqbufkjbc`. Its conversion
worker has one active pg_cron job named `awin-conversion-worker-dev`, scheduled
as `* * * * *`. The job posts only to
`https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/awin-conversion-worker`
and builds its bearer header at execution time from the single Vault entry
named `awin_worker_bearer_dev`, which contains the value configured as the
worker's `AWIN_WORKER_SECRET`; no credential is embedded in SQL or source.
The final guarded verification found exactly one job, a recent successful cron
run, HTTP 200 with `claimed`, `sent`, `retried`, and `dead_letter` all zero,
and an empty outbox.

An earlier generated development bearer was treated as compromised after it
appeared in internal diagnostic output. It was replaced, the edge-function and
Vault copies were synchronized without exposing the replacement, and an
authenticated empty worker response verified the recovery. Temporary files
were removed. Do not copy a bearer value into this runbook, logs, tickets, or
command output.

To pause or roll back development delivery, unschedule only the exact job:

```sql
select cron.unschedule('awin-conversion-worker-dev');
```

Then verify that no active job with that name remains. Do not delete the Vault
entry until delivery is intentionally retired and the worker secret has also
been removed from the exact development project. Recreating the job must
restore the exact name, minute schedule, development URL, and Vault lookup
above. The production schedule is a separate action and must never reuse the
development Vault entry or project URL.

The isolated AWS stack `solum-awin-conversion-fixture-dev` is intentionally
retained in account `798470762256`, region `eu-west-2`, for guarded development
acceptance. The development project also retains these five AWIN settings:
`AWIN_ATTRIBUTION_SECRET`, `AWIN_CONVERSION_API_BASE_URL`,
`AWIN_CONVERSION_API_KEY`, `AWIN_OUTBOX_ENCRYPTION_KEY`, and
`AWIN_WORKER_SECRET`. The API base URL points only to the retained fixture; the
fixture never calls AWIN. Remove the stack with
`infra/awin-conversion-fixture-dev/scripts/teardown-aws-dev.sh`, whose exact
account/region/`-dev` guards must pass. Before teardown, unschedule the worker
or change its development-only API configuration so it cannot target a removed
fixture. No production setting is part of this teardown.

### Storefront deployment prerequisite

The exact storefront `https://dev.d3pa095gzazg3c.amplifyapp.com` was read-only
checked on 2026-08-12. The restricted routes `/buy`, `/checkout`, `/account`,
and `/creators` correctly had no MasterTag, but `/` also had no
`#solum-awin-mastertag` or `https://www.dwin1.com/129171.js`, and
`/feeds/awin.csv` returned HTTP 404 with an empty body. This is a stale/missing
development web deployment, not a local Phase A test failure.

Before production approval, deploy/push `codex/awin-phase-a` to the Amplify
**development branch only**, then repeat these exact read-only checks:

1. `/` contains exactly one script with id `solum-awin-mastertag` and source
   `https://www.dwin1.com/129171.js`.
2. `/buy`, `/checkout`, `/account`, and `/creators` contain none.
3. `/feeds/awin.csv` returns HTTP 200, a CSV content type, and exactly the two
   expected product rows (plus the header), validated with
   `scripts/awin/verify-feed.mjs`.

Do not substitute production for this missing development evidence. The
Amplify development hostname is outside `.bysolum.co.uk`, so it cannot prove
first-party `.bysolum.co.uk` cookie recovery; Lambda integration tests remain
the authority until a `dev.bysolum.co.uk` storefront domain exists.

## Attribution and commission interpretation

Acquisition reporting and AWIN commission reporting answer different questions
and must not be added together. Preserve UTMs, referrer, and the normalized
platform channel (`aw`, `display`, `ppc`, or `email`) for acquisition analysis.
For an AWIN-attributed order, report the AWIN publisher/partner and click
identity, order reference, validated voucher (when present), and commission
group as affiliate dimensions on that same conversion. One order remains one
order and one revenue amount; the AWIN dimensions enrich it rather than create
a second conversion.

Commissionable prices are customer-paid amounts inclusive of VAT and delivery.
Before VAT registration, use VAT `0`. From the separately configured effective
instant onward, remove VAT from the VAT-inclusive amount. Deduct only delivery
the customer actually paid as a separate charge. Free or bundled delivery is
`0`; never deduct internal or notional fulfilment figures such as £3.85, £3.95,
or £5.95. Send a voucher only when a real code was validated and stored on the
order. A no-code launch promotion, inferred discount, or display label must not
populate AWIN's `voucher` field.

## Production rollout gate and read-only acceptance

Phase A completion does not authorise production deployment. Obtain a separate,
explicit approval that names the production AWS/Supabase/Amplify rollout before
deploying code or functions, applying migrations, creating the production
schedule, changing Amplify rules or DNS, issuing certificates, or setting
production secrets. The production schedule is created only inside that
approved rollout, with its own Vault secret and production worker URL.

After an approved production deployment, acceptance is read-only only:

- `GET`/`HEAD` the public storefront routes and confirm ordinary SPA routes
  still load; verify exactly one MasterTag on public routes and none on `/buy`,
  `/checkout`, `/account`, or `/creators`.
- `GET`/`HEAD` `/feeds/awin.csv`; require HTTP 200, CSV content type, and the
  verified two-row product contract.
- Inspect the deployed AWS stack/Lambda versions, API Gateway/custom-domain
  mapping, Supabase migration/function versions, production pg_cron command,
  and Vault **names only**. Do not read or print secret values.
- Inspect CloudWatch error counts and the Supabase sync/outbox backlog,
  retry/dead-letter counts, and worker run health. Use only naturally occurring
  real customer activity; do not create an order, conversion, refund, label, or
  dispatch as an acceptance test.
- Compare the real order and sync/outbox outcome by opaque reference or
  aggregate status. Never expose raw `awc`, ciphertext, bearer credentials, or
  provider response bodies.

```bash
aws amplify get-app \
  --region eu-west-2 \
  --app-id d3pa095gzazg3c \
  --query 'app.customRules' \
  --output json

curl -sS -D - -o /dev/null https://bysolum.co.uk/feeds/awin.csv
```

For Awin platform acceptance, wait for naturally occurring, completed real
customer transactions. In Awin diagnostics, confirm the resolved `cks` /
attribution outcome, publisher/partner, order reference, voucher omission or
validated code, and commission group. Do not create synthetic production
conversions, replay customer orders, or copy raw `awc`/`cks` values into logs,
tickets, analytics, or documentation. Record only the diagnostic outcome and
aggregate counts.
