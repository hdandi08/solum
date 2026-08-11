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
