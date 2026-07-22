# Awin server-side `awc` cookie — deployment runbook

Sets a first-party, **HttpOnly + Secure** `awc` cookie from the `?awc=` landing
parameter on affiliate clicks, so Awin can read it (via the `cks` parameter) when
a transaction fires.

**Why:** the Awin MasterTag already sets an `awc` cookie client-side, but
Safari / iOS ITP caps JavaScript-set cookies at **7 days**. That would silently
shrink our **45-day** cookie window on a large share of mobile visitors. A
server-set HttpOnly cookie is not subject to that cap.

**Stack reality:** bysolum.co.uk is a static React/Vite SPA on AWS Amplify
(CloudFront). There is no PHP/server layer, and Amplify static custom headers
cannot read a query-parameter value. The correct mechanism is a **CloudFront
Function on `viewer-response`**. Function code: `scripts/awin/awc-cookie-cloudfront-function.js`.

> CloudFront Functions run in `us-east-1` (CloudFront is global). Use
> `--region us-east-1` on every command below, regardless of our eu-west-2 default.

---

## 1. Find the Amplify app's CloudFront distribution

Amplify serves the custom domain through a managed CloudFront distribution.

```bash
aws cloudfront list-distributions --region us-east-1 \
  --query "DistributionList.Items[?contains(Aliases.Items, 'www.bysolum.co.uk') || contains(Aliases.Items, 'bysolum.co.uk')].{Id:Id,Domain:DomainName,Aliases:Aliases.Items}" \
  --output table
```

Note the **distribution Id** (looks like `E123ABC...`).

## 2. Create and publish the function

```bash
aws cloudfront create-function --region us-east-1 \
  --name solum-awin-awc-cookie \
  --function-config Comment="Set Awin awc HttpOnly cookie from ?awc=",Runtime="cloudfront-js-2.0" \
  --function-code fileb://scripts/awin/awc-cookie-cloudfront-function.js
# → note the ETag in the output, then:

aws cloudfront publish-function --region us-east-1 \
  --name solum-awin-awc-cookie --if-match <ETag-from-create>
# → note the published function ARN:
#   arn:aws:cloudfront::798470762256:function/solum-awin-awc-cookie
```

## 3. Associate on viewer-response (Console is simplest)

**Console:** CloudFront → Distributions → *[the id from step 1]* → **Behaviors**
→ select the Default (`*`) behavior → **Edit** → **Function associations** →
**Viewer response** → type **CloudFront Function** → select `solum-awin-awc-cookie`
→ Save. Repeat for any other behavior that serves HTML (e.g. `/index.html`).

**CLI alternative:** `get-distribution-config` → add a `FunctionAssociations`
entry (`EventType=viewer-response`, `FunctionARN=<arn>`) to the
`DefaultCacheBehavior` → `update-distribution --if-match <ETag>`.

## 4. Test

```bash
curl -sI "https://www.bysolum.co.uk/?awc=TEST_123" | grep -i set-cookie
# expect: set-cookie: awc=TEST_123; Domain=.bysolum.co.uk; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax
```

Also check in a browser: DevTools → Application → Cookies → `awc` present, with
**HttpOnly** and **Secure** flags ticked. Confirm a request *without* `?awc=`
sets **no** cookie.

## 5. Amplify redeploy caveat (must verify)

Amplify manages this distribution. After the **next Amplify build/deploy**,
re-run the step 4 `curl` to confirm the function association survived. If Amplify
strips it:
- fall back to **Lambda@Edge** (same logic, Node.js, `viewer-response`), which
  attaches at the distribution level and is less likely to be reset, **or**
- put a thin CloudFront distribution in front that we fully own.

## 6. Confirm with Awin

Once live, Awin transactions should carry the `awc` value in the `cks`
parameter (instead of the literal `{{awc}}`). Verify in Awin's tag/transaction
diagnostics.

---

### Rollback
Remove the function association from the behavior (Console → Behaviors → Edit →
clear the Viewer response function), then optionally
`aws cloudfront delete-function --region us-east-1 --name solum-awin-awc-cookie --if-match <ETag>`.
No app code or deploy is involved, so rollback is immediate and risk-free.
