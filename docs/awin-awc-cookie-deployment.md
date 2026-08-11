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

## Production guardrail

Do not deploy, alter DNS, issue certificates, or run checkout/conversion tests
against production without separate explicit approval. After an approved
deployment, use read-only checks only: inspect the public endpoint response
headers, deployed stack configuration, Amplify app rules, and CloudWatch error
counts. Verify `/feeds/awin.csv` returns a successful CSV response and that
ordinary storefront routes still use the SPA fallback.

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
attribution outcome is present for those transactions. Do not create synthetic
production conversions, replay customer orders, or copy raw `awc`/`cks` values
into logs, tickets, analytics, or documentation. Record only the diagnostic
outcome and aggregate counts.
