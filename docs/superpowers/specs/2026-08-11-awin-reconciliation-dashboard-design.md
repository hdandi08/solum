# SOLUM — AWIN Tracking, Reconciliation, and Partner Performance Design

> Date: 2026-08-11
> Status: approved 2026-08-11; Phase B commercial-policy revision approved 2026-08-12
> Advertiser: SOLUM (`129171`)
> Goal: make AWIN conversion delivery reliable, reconcile every AWIN transaction to one SOLUM order, and show publisher and commission performance in the secure admin dashboard without double-counting revenue across channels.

## 1. Executive decision

SOLUM will use one integrated affiliate measurement system with four ordered phases:

1. **Tracking reliability** — correct the MasterTag and feed configuration, add a durable first-party `awc` cookie path, and replace fire-and-forget conversion delivery with an idempotent outbox.
2. **Commission configuration** — import the effective AWIN partnership assignment, use a 10% programme standard, and assign explicitly approved direct premium editorial/influencer publishers to the 15% `Solum Premium` publisher rate. Customer acquisition remains a separate `NEW`/`RETURNING` dimension.
3. **AWIN reconciliation** — import AWIN transactions and publisher performance, then join AWIN transactions to SOLUM orders by the unique Stripe PaymentIntent reference.
4. **Admin reporting** — add a secure AWIN dashboard for partner, publisher category, commission group, status, profitability, and data-quality monitoring.

Stripe and the SOLUM `orders` table remain the source of truth for orders, paid revenue, refunds, and customer history. AWIN remains the source of truth for publisher identity, transaction status, commission, and network fee. PostHog remains the source of truth for behavioural journeys, not financial totals.

## 2. Goals

- Preserve valid AWIN attribution for 30 days.
- Deliver each eligible conversion at least once operationally but create it at most once logically.
- Prevent AWIN commission when another recognised paid channel was the last paid click.
- Attribute each AWIN transaction to its exact SOLUM order and publisher.
- Distinguish new-customer and existing-customer orders.
- Report the actual commission and network fee returned by AWIN rather than estimating financial results from the nominal commission rate.
- Compare publishers and publisher categories using consistent revenue and profitability definitions.
- Surface failed conversion delivery and unmatched data instead of silently losing it.
- Keep raw AWIN click checksums out of browser analytics, logs, and the admin UI.
- Retain all Skimlinks partnerships and classify them as `subnetwork`.

## 3. Non-goals

- Replacing Stripe or SOLUM orders as the financial source of truth.
- Treating PostHog event counts as booked revenue.
- Automatically approving or changing publisher-specific commission rates.
- Automatically ending AWIN partnerships.
- Building subscription commission rules before subscriptions are live.
- Putting a new customer-managed CloudFront distribution in front of the entire storefront.
- Running synthetic purchases, refunds, labels, dispatches, or checkout E2E tests in production.
- Sending test conversions into the production AWIN programme.

## 4. Audited current state

### 4.1 Working foundations

- Browser attribution is stored in `solum_awin_attribution` for 30 days.
- The supported channel values are `aw`, `display`, `ppc`, and `email`.
- Checkout separates marketing attribution from the order-flow `source` field.
- `awc` and `awin_channel` are copied into Stripe PaymentIntent metadata.
- The Stripe webhook is the only browser-independent AWIN conversion authority.
- The PaymentIntent ID is used as AWIN `orderRef`, giving SOLUM a stable reconciliation key.
- The AWIN product-feed Edge Function is active and returns a public CSV.
- The secure admin application already has authenticated Edge Function access, role checks, MFA controls, and audit infrastructure.

### 4.2 Gaps that this design resolves

- The webhook marks AWIN delivery as attempted before its network request and has no durable retry queue. A timeout or transient AWIN error can therefore lose the conversion permanently.
- The MasterTag loads on every production route, including pages that display or process payment or personal data.
- The first-party server-cookie runbook assumes a CloudFront Function association that is unavailable on the Amplify-managed storefront distribution.
- Cookie periods are inconsistent: 30 days in browser code, 45 days in profile copy, and 365 days in the old CloudFront Function runbook.
- The clean product-feed URL returns 404, although the Supabase function URL works.
- The earlier Phase B design incorrectly treated customer acquisition (`NEW`/`RETURNING`) as transaction commission-group selection and did not reflect the live 10% standard / 15% premium AWIN configuration.
- SOLUM has no durable AWIN transaction, publisher, commission, network-fee, or daily performance data.
- The admin dashboard cannot show publisher performance, commission groups, reconciliation failures, or delivery failures.

## 5. Attribution and deduplication rules

### 5.1 Attribution window

The AWIN attribution period is exactly **30 days** across:

- browser local storage;
- the first-party server-set cookie;
- programme/profile copy;
- operational documentation; and
- test fixtures.

The old 45-day and 365-day references are removed.

### 5.2 Last-paid-channel rule

The existing bounded attribution algorithm remains authoritative:

1. Recognised paid-search signals set `ppc`.
2. Recognised paid-social signals set `display`.
3. Recognised email signals set `email`.
4. An AWIN checksum or `source=aw` sets `aw`.

A later recognised paid click changes the channel but may retain the valid checksum. The conversion payload can therefore give AWIN the checksum for deduplication while reporting the actual last-paid channel. `aw` is used only when AWIN was the last recognised paid channel.

Direct and organic visits do not overwrite a valid paid-channel record. This preserves the agreed paid-channel attribution window without inventing a commission for a different channel.

### 5.3 One order, one revenue record

Every successful payment has one canonical `order_ref`: the live Stripe PaymentIntent ID.

- SOLUM revenue is counted once from the joined `orders` row.
- AWIN imported sale values are comparison fields, not a second revenue source.
- PostHog purchase events are behavioural/operational evidence, not another order.
- An AWIN transaction joins to an order only when its `orderRef` exactly equals `orders.stripe_payment_id`.
- Multiple AWIN rows with the same AWIN transaction ID are upserts, never additions.
- Multiple AWIN transaction IDs claiming the same `orderRef` create a data-quality exception and do not multiply revenue.

### 5.4 New versus returning customer

Customer acquisition is decided at order creation from SOLUM history and is independent of commission assignment:

- `NEW`: no earlier paid, non-cancelled order exists for the customer before this order.
- `RETURNING`: at least one earlier paid, non-cancelled order exists.

The classification is stored with the conversion outbox record so a later retry cannot change it after customer history evolves. It is sent in AWIN's `customerAcquisition` field.

The conversion's tracked-part commission group remains `DEFAULT` unless SOLUM later approves a transaction-level rule that explicitly emits `PREMIUM`. Publisher category, publisher ID, and `awc` are never used by checkout to guess a commission group. AWIN's publisher commission-rate assignment controls whether an approved direct publisher receives the premium commercial rate.

## 6. Target architecture

```text
AWIN click
  -> storefront captures awc + last-paid channel (30 days)
  -> track.bysolum.co.uk sets first-party HttpOnly cookie (30 days)
  -> checkout copies bounded attribution to Stripe PaymentIntent metadata
  -> Stripe payment_intent.succeeded webhook
       -> writes/claims canonical SOLUM order
       -> creates one immutable AWIN conversion outbox item
  -> outbox worker sends conversion with idempotent orderRef
       -> authenticated AWIN Conversion API when available
       -> current sread endpoint only as controlled fallback

Scheduled AWIN sync
  -> transactions + statuses + publisher identity + commission + fees
  -> daily publisher performance
  -> upsert reconciliation tables
  -> join AWIN orderRef to SOLUM stripe_payment_id

Secure admin
  -> reads server-computed affiliate reporting views
  -> never receives AWIN API tokens or raw awc values
```

## 7. Phase 1 — tracking reliability

### 7.1 Route-safe MasterTag

The production MasterTag loads only on public discovery and confirmation routes where payment or personal data is not displayed or processed.

Allowed route families:

- `/`
- `/guide` and public guide/product-detail routes
- `/ritual`
- `/products/*`
- `/success`

Blocked route families:

- `/buy`
- `/checkout`
- `/account`
- `/creators`
- any future route containing checkout, address, customer, authentication, or application forms

The route decision is implemented as a pure, tested helper rather than inline hostname/path conditionals. The WebDriver production-test guard remains in place.

This follows AWIN's guidance not to append the MasterTag to pages that process payment or personal data: <https://help.awin.com/developers/docs/advertiser-mastertag>.

### 7.2 First-party cookie endpoint

The obsolete Amplify/CloudFront Function approach is replaced by an isolated endpoint:

- production: `https://track.bysolum.co.uk/awin/click`
- development: a separate dev tracking hostname and environment
- implementation: API Gateway HTTP API + Lambda custom domain in `eu-west-2`
- request: credentialed first-party call containing a validated checksum captured from the landing URL
- response cookie: `awc=<validated-value>; Domain=.bysolum.co.uk; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`

The endpoint:

- accepts only `POST`;
- allows credentialed CORS only from `https://bysolum.co.uk` and `https://www.bysolum.co.uk` in production;
- has a separate development origin allow-list;
- validates the checksum with the same maximum length as checkout;
- returns no checksum in its body;
- logs only a request ID, outcome, environment, and a one-way checksum hash prefix;
- is rate-limited through API Gateway;
- does not expose AWS credentials to the browser.

Browser local storage remains the immediate client fallback. The cookie is a resilience mechanism for browser/storage restrictions, not a second attribution policy.

At checkout, the application first uses valid bounded browser state. If that state is absent, it calls `POST /awin/resolve` with credentials. The endpoint reads the HttpOnly cookie and returns a short-lived, encrypted, signed attribution token—not the checksum. Checkout passes that opaque token and the current recognised paid-channel signal to `create-first-box-payment-intent`; the Edge Function verifies the token and resolves the checksum server-side. The signing/encryption key is shared only through the AWS and Supabase secret stores. Raw cookie values are never returned by the resolve endpoint or surfaced to PostHog, pixels, or the admin UI.

The current direct `awc` checkout field remains temporarily supported during migration because the checksum already exists in affiliate landing URLs and browser state. Both the direct and token paths feed the same server validator and neither value may be logged.

### 7.3 Product feed and programme copy

The storefront adds a tested external rewrite:

`/feeds/awin.csv` → production `awin-feed` Supabase Function URL

Acceptance requires:

- HTTP 200;
- `Content-Type: text/csv`;
- the expected two kit rows;
- no SPA HTML fallback;
- no effect on other storefront routes.

AWIN profile and promotional copy are aligned to:

- 10% standard commission, with enhanced rates available only to explicitly approved partners;
- 30-day attribution period;
- one-time GROUND and RITUAL kits currently available;
- subscriptions described as coming later, not live;
- free UK delivery represented as the active promotion where still commercially valid;
- no coupon claim unless a real code is introduced.

The existing `artefacts/solum-awin-batch-upload.csv` remains the creative bulk-upload source and is renamed only if AWIN requires a specific filename.

### 7.4 Durable conversion outbox

The Stripe webhook stops making AWIN network delivery part of the payment-processing critical path. Instead, the webhook upserts an outbox row in the same logical processing flow as the order. If an eligible conversion cannot be persisted, the webhook returns a retryable error so Stripe retries the event; it must not acknowledge the event while silently dropping the conversion. Existing order/event claims and the outbox's unique keys make the retry idempotent.

Table: `awin_conversion_outbox`

| Column | Purpose |
| --- | --- |
| `id uuid` | Internal primary key. |
| `order_ref text unique` | Stripe PaymentIntent ID; logical idempotency key. |
| `order_id uuid unique` | Joined SOLUM order. |
| `customer_paid_pence integer` | Immutable gross customer receipt after discounts. |
| `discount_pence integer` | Discount already reflected in `customer_paid_pence`; reporting only, never subtracted twice. |
| `delivery_pence integer` | Delivery separately charged to the customer; zero for free/bundled delivery and never an internal fulfilment cost. |
| `vat_pence integer` | Actual VAT removed only at/after the confirmed VAT effective date; zero while SOLUM is not registered. |
| `amount_pence integer` | Immutable AWIN commissionable value: customer paid minus separately charged delivery and actual VAT. |
| `voucher_code text` | Validated applied code, or null when no code was used. |
| `financial_basis_version text` | Versioned server calculation policy, initially `solum-commission-v1`. |
| `currency text` | `GBP` for current programme. |
| `commission_group text` | `DEFAULT` or `PREMIUM`; current checkout submissions use `DEFAULT`. |
| `customer_acquisition text` | Immutable `NEW` or `RETURNING`, stored separately from commission. |
| `channel text` | Validated `aw`, `display`, `ppc`, or `email`. |
| `awc_ciphertext text` | Restricted server-only checksum storage. |
| `awc_hash text` | One-way lookup/debug fingerprint; never used to reconstruct the checksum. |
| `state text` | `pending`, `processing`, `sent`, `retry`, `dead_letter`, or `suppressed`. |
| `attempt_count integer` | Delivery attempt count. |
| `next_attempt_at timestamptz` | Retry schedule. |
| `last_http_status integer` | Safe response status only. |
| `last_error_code text` | Sanitised classification, never raw payload or token. |
| `provider_transaction_id text` | AWIN acknowledgement identifier when returned. |
| `sent_at timestamptz` | First successful delivery time. |
| `created_at`, `updated_at` | Audit timestamps. |

The raw checksum is encrypted using an application secret before persistence. Only service-role Edge Functions can read it. Row-level security denies browser and admin-client table access.

Rows are created only when all conversion eligibility checks pass. Ineligible rows are either absent or recorded as `suppressed` with a non-sensitive reason when operational visibility is useful.

### 7.5 Delivery worker and retry policy

An AWIN delivery worker claims rows using an atomic database function with `FOR UPDATE SKIP LOCKED`. This prevents ordinary concurrent workers from sending the same pending row at the same time.

Delivery preference:

1. Probe the advertiser token against AWIN's authenticated Conversion API without creating a conversion.
2. Use the authenticated Conversion API if the token and account support it.
3. Otherwise use the current `sread.php` server-to-server endpoint behind the same outbox and retry controls.

The capability probe is read-only. No synthetic production conversion is used to test access.

Retry behaviour:

- retry network timeouts, `408`, `425`, `429`, and `5xx` responses;
- honour `Retry-After` when present;
- otherwise use capped exponential backoff with jitter;
- do not retry permanent validation/authentication `4xx` errors indefinitely;
- move permanent or exhausted failures to `dead_letter`;
- alert through the admin dashboard when pending age or dead-letter count exceeds its threshold.

AWIN's API limit is treated as 20 calls per minute per user. The worker and reconciliation jobs share a conservative token-bucket limit below that ceiling.

The unique `order_ref` prevents duplicate outbox creation. AWIN also receives the same `orderRef` on every safe retry, giving the network a stable transaction reference.

No distributed system can guarantee exactly-once delivery if a worker crashes after AWIN accepts a request but before SOLUM records success. That narrow case may produce a provider retry. The stable `orderRef` gives AWIN a deduplication key; the reconciliation import detects multiple AWIN transaction IDs for one order; and SOLUM reporting still counts the joined order once. A detected network duplicate is resolved operationally in AWIN rather than hidden or added to revenue.

## 8. Phase 2 — commission and publisher policy

### 8.1 Commission rules

- Programme standard: **10%** through `Program Standard Commission Rates`.
- Approved direct premium editorials/influencers: **15%** through the publisher-specific `Solum Premium` rate.
- Live transaction commission groups: `DEFAULT` at 10% and `PREMIUM` at 15%.
- Current conversion delivery submits `DEFAULT`. It must not infer `PREMIUM` from publisher category or from an opaque AWIN checksum.
- A direct publisher moves to `Solum Premium` only after SOLUM records the publisher ID, approved rate, reason, approver, and effective date.
- The system imports the current AWIN publisher-rate assignment and records its effective value; it never invents or automatically changes that assignment.
- Actual transaction commission imported from AWIN remains the financial authority even when the locally recorded nominal rate differs.

Publisher-specific rates, tracked-part commission groups, and customer acquisition are separate concepts. The publisher-rate assignment controls partner commercial terms; `DEFAULT`/`PREMIUM` identifies the submitted tracked part; `NEW`/`RETURNING` describes the customer relationship.

AWIN commission-group reference: <https://help.awin.com/advertisers/docs/en/commission-groups>.

### 8.2 Publisher categories

Every retained publisher is assigned one local reporting category:

- `editorial`
- `creator`
- `cashback_loyalty`
- `comparison`
- `subnetwork`
- `other`

Skimlinks and all partnerships routed through Skimlinks are retained and protected. The live programme currently has three Skimlinks relationships assigned to `Program Standard Commission Rates`: Skimlinks (`78888`), Skimlinks Coupon Deal sites (`181013`), and Skimlinks Rewards sites (`2573975`). Their commercial terms are treated as externally managed through Skimlinks/AWIN. SOLUM does not move them to `Solum Premium` or end them automatically. If Skimlinks later changes bespoke publisher terms, the next import records the resulting effective AWIN assignment.

Table: `awin_publishers`

| Column | Purpose |
| --- | --- |
| `publisher_id bigint primary key` | AWIN publisher identifier. |
| `publisher_name text` | Current AWIN name. |
| `category text` | SOLUM reporting category. |
| `status text` | Current relationship/programme status. |
| `retain_protected boolean` | True for Skimlinks records and any later protected partner. |
| `commercial_tier text` | `standard`, `premium`, or `externally_managed`. |
| `commission_rate_name text` | Current AWIN publisher-rate assignment, such as `Program Standard Commission Rates` or `Solum Premium`. |
| `effective_rate_bps integer` | Nominal effective rate observed from the current AWIN assignment. |
| `rate_source text` | `awin_assignment`, `skimlinks_managed`, or `approved_exception`. |
| `exception_reason text null` | Commercial approval/audit note for a direct premium exception. |
| `exception_approved_by text null` | Person who approved a direct premium exception. |
| `exception_approved_at timestamptz null` | Effective approval timestamp. |
| `awin_tags jsonb` | Imported publisher tags without making them the local category authority. |
| `first_seen_at`, `last_seen_at`, `updated_at` | Lifecycle timestamps. |

Rate fields are context and QA data. Actual reporting uses transaction-level commission imported from AWIN.

## 9. Phase 3 — AWIN imports and reconciliation

### 9.1 Imported transactions

Table: `awin_transactions`

| Column | Purpose |
| --- | --- |
| `awin_transaction_id text primary key` | Stable AWIN transaction identifier. |
| `order_ref text` | SOLUM/Stripe reconciliation key. |
| `order_id uuid null` | Resolved SOLUM order. |
| `publisher_id bigint null` | AWIN publisher. |
| `transaction_date timestamptz` | Network transaction time. |
| `click_date timestamptz null` | Network click time when supplied. |
| `status text` | Normalised `pending`, `approved`, `declined`, or `unknown`. |
| `sale_amount_pence integer` | AWIN-reported sale value. |
| `commission_pence integer` | Actual publisher commission from AWIN. |
| `network_fee_pence integer` | Actual network fee when exposed. |
| `currency text` | AWIN transaction currency. |
| `commission_group text null` | AWIN group/code returned for the transaction. |
| `click_reference text null` | Non-sensitive publisher click reference when supplied. |
| `raw_hash text` | Hash used to detect meaningful source changes. |
| `first_seen_at`, `last_synced_at`, `updated_at` | Import timestamps. |

AWIN transaction values are stored exactly as returned and converted to integer minor units. Currency conversion is not introduced while SOLUM is GBP-only.

### 9.2 Daily publisher performance

Table: `awin_publisher_performance_daily`

Unique key: `(performance_date, publisher_id, currency)`.

Stored metrics include:

- impressions;
- clicks;
- pending/approved/declined transaction counts;
- pending/approved/declined sale values;
- pending/approved/declined commissions;
- network fee where exposed;
- imported publisher tags; and
- sync timestamp.

The AWIN publisher performance report supplies aggregated acquisition metrics that cannot be derived reliably from SOLUM orders alone: <https://help.awin.com/apidocs/get-publisher-performance-report>.

### 9.3 Sync runs and cursors

Table: `awin_sync_runs`

Each run records:

- sync type (`transactions`, `publisher_performance`, `publishers`, `reconcile`);
- requested date range;
- cursor/page progress;
- rows read, inserted, updated, and rejected;
- API call count;
- start/end timestamps;
- outcome and sanitised error code.

No AWIN API token, full request URL containing credentials, or raw response body is stored.

### 9.4 Sync cadence

- Recent transactions: every 30 minutes for the current day and recent change window.
- Status reconciliation: nightly for the previous 31 days, respecting AWIN's maximum transaction query range.
- Older validation/amendment window: nightly in bounded 31-day chunks until the configured advertiser validation horizon is covered.
- Publisher performance: once daily after the preceding day is complete.
- Publisher metadata: once daily and on demand from the admin refresh control.

All jobs page through results, respect the shared rate limit, and resume from their last safe cursor. Upserts make re-fetching a time range harmless.

AWIN transaction API reference: <https://help.awin.com/apidocs/returns-a-list-of-transactions-for-a-given-advertiser>.

### 9.5 Reconciliation states

Each transaction/order pair is classified as:

- `matched`: one AWIN transaction maps to one paid SOLUM order and financial values are within tolerance;
- `value_mismatch`: the join exists but AWIN and SOLUM sale values differ;
- `awin_only`: AWIN transaction has no SOLUM order;
- `solum_only`: eligible, sent SOLUM conversion has no AWIN transaction after the expected ingestion delay;
- `duplicate_order_ref`: more than one AWIN transaction claims one SOLUM order;
- `currency_mismatch`: transaction and order are not comparable directly;
- `awaiting_network`: conversion was sent recently and is inside the normal AWIN ingestion delay.

Value comparison uses exact GBP pence after applying the programme's agreed commissionable-order-value rule. The helper treats Stripe customer-paid value as already discounted, removes only delivery separately charged to the customer, and removes VAT only from the configured effective registration date. Free/bundled delivery has value zero; internal fulfilment cost is never deducted. The dashboard displays customer-paid, discount, delivery, VAT, and commissionable values separately and documents the versioned rule in its tooltip.

## 10. Phase 4 — secure admin dashboard

### 10.1 Navigation and access

Add an `AWIN` item to the existing secure admin navigation. It uses the same admin role, MFA gate, origin allow-list, response envelope, and audit conventions as the current dashboard.

The browser calls a dedicated `admin-awin` Edge Function. The function reads reporting views using the service role and returns only presentation-safe fields. The browser never calls AWIN directly.

### 10.2 Dashboard controls

- Date range: 7, 30, 90 days, or custom.
- Status: all, pending, approved, declined.
- Publisher.
- Publisher category.
- Commission group.
- Customer type: new, existing, unknown.
- Reconciliation state.

The default view is the last 30 complete days plus the current day, clearly labelled.

### 10.3 Summary metrics

- AWIN-attributed SOLUM orders.
- Gross SOLUM revenue.
- AWIN-reported sale value.
- Approved, pending, and declined transaction counts and values.
- Actual publisher commission.
- Actual network fee.
- Net revenue = SOLUM gross revenue − actual commission − actual network fee − recorded refunds.
- Conversion delivery success rate.
- Unmatched transaction count.
- Unmatched eligible order count.

Pending commission is shown separately from approved commission. Declined transactions do not reduce booked SOLUM order revenue; they are displayed as AWIN status outcomes.

### 10.4 Publisher performance table

One row per publisher with:

- publisher ID and name;
- local category;
- relationship status;
- protected-retain marker;
- impressions;
- clicks;
- orders;
- conversion rate (`orders / clicks`);
- average order value (`matched SOLUM revenue / matched orders`);
- earnings per click (`approved commission / clicks`) for publisher economics;
- gross revenue;
- actual commission;
- network fee;
- net revenue;
- approved/pending/declined mix;
- new/existing customer mix;
- effective commission rate (`actual commission / AWIN sale value`);
- reconciliation exceptions.

Rows with zero clicks show conversion rate and EPC as unavailable, not zero-performance claims.

### 10.5 Commission and customer-acquisition views

The dashboard groups commission metrics by publisher-rate assignment and submitted tracked part (`DEFAULT` or `PREMIUM`). It shows both the submitted group and the group returned by AWIN; disagreement is a QA exception. A separate view groups orders by immutable customer acquisition (`NEW` or `RETURNING`).

### 10.6 Order-level reconciliation table

The operational table shows:

- order date;
- masked SOLUM order reference;
- publisher;
- publisher category;
- commission group;
- SOLUM order value;
- AWIN transaction value;
- commission;
- network fee;
- AWIN status;
- conversion-delivery state;
- reconciliation state; and
- last sync time.

Customer email, raw `awc`, access tokens, provider request bodies, and unmasked payment metadata are excluded.

### 10.7 Data freshness and alerts

Every page displays:

- last successful transaction sync;
- last successful publisher-performance sync;
- oldest pending outbox item;
- dead-letter count; and
- current data-freshness state.

Warning thresholds:

- outbox pending longer than 30 minutes;
- any dead-letter item;
- transaction sync stale longer than 2 hours;
- daily performance sync stale longer than 36 hours;
- eligible sent conversion unmatched after the configured AWIN ingestion grace period;
- duplicate AWIN transaction/order mappings.

## 11. Reporting views and formulas

Server-side database views isolate financial semantics from React:

- `admin_awin_order_reconciliation_v`
- `admin_awin_publisher_daily_v`
- `admin_awin_commission_group_daily_v`
- `admin_awin_data_quality_v`

The views are not granted to `anon` or ordinary `authenticated` users. Only service-role Edge Functions query them.

Canonical formulas:

- `customer_paid_pence`: matched SOLUM `orders.amount_pence`, once per `order_id`; this is gross customer receipts, not accounting revenue.
- `commissionable_revenue_pence`: matched immutable outbox `amount_pence`, once per `order_id`.
- `accounting_revenue_pence`: customer paid less actual output VAT, kept separate from the AWIN commission base.
- `actual_commission_pence`: imported AWIN transaction commission for selected statuses.
- `actual_network_fee_pence`: imported AWIN network fee.
- `refund_pence`: canonical SOLUM/Stripe refunded value once refund data is available.
- `net_cash_after_affiliate_pence = customer_paid_pence - actual_commission_pence - actual_network_fee_pence - refund_pence`.
- `conversion_rate = matched_orders / clicks`.
- `aov = customer_paid_pence / matched_orders`.
- `publisher_epc = approved_commission_pence / clicks`.

If AWIN does not expose network fee through the available API/account response, the dashboard displays `Unavailable`; it does not silently assume zero.

## 12. Security and privacy

- AWIN API credentials live only in Supabase/AWS secret stores.
- Separate development and production credentials are used where AWIN supports them.
- The production service role is never included in Amplify build variables or browser bundles.
- Raw `awc` is encrypted at rest in the outbox and automatically purged after the reconciliation/validation retention period.
- Logs contain request IDs, provider status, order-reference hashes, and sanitised error codes only.
- Admin responses use masked order references and exclude personal data not required for affiliate analysis.
- RLS denies direct client access to all AWIN operational tables.
- Scheduled sync and delivery endpoints require a dedicated signed service credential and reject browser origins.
- Manual retries are audited with admin user, timestamp, target outbox ID, and result.
- Manual commission/rate editing is deliberately absent from the first dashboard release.

## 13. Failure handling and operational controls

### 13.1 Conversion delivery

- Stripe webhook failure cannot be caused by an AWIN timeout.
- Duplicate Stripe events cannot create duplicate outbox rows.
- A crashed worker releases its claim after a bounded lease.
- Permanent failures remain visible in dead letter until resolved or explicitly suppressed.
- A manual retry reuses the original immutable order reference, value, group, channel, and encrypted checksum.

### 13.2 API imports

- A partial page failure does not advance the safe cursor.
- Upserts preserve the first-seen timestamp and update mutable AWIN status/commission fields.
- Unexpected schemas quarantine the affected row and fail the sync visibly.
- A stale sync never deletes previously imported data.
- API rate limiting slows the job instead of spawning concurrent retry storms.

### 13.3 Rollback

Each phase is independently reversible:

- MasterTag route gating can be reverted without changing attribution records.
- The tracking subdomain can be removed while keeping local-storage capture.
- The outbox can be paused while retaining unsent rows for later recovery.
- AWIN imports and dashboard routes can be disabled without changing order processing.
- Database migrations use additive tables/columns/views first; destructive cleanup is deferred until after a stable production period.

## 14. Testing strategy

### 14.1 Automated tests

- Vitest: MasterTag route allow/deny behaviour; browser attribution and 30-day expiry; tracking request construction.
- Deno: eligibility, channel validation, `NEW`/`RETURNING` classification, `DEFAULT`/`PREMIUM` validation, publisher-policy validation, retry classification, redaction, API pagination, minor-unit conversion, and reconciliation states.
- SQL tests: unique constraints, atomic claims, RLS denial, reporting formulas, duplicate-order protection, and matched/unmatched views.
- Admin tests: payload normalisation, filters, money/ratio display, unavailable fee handling, stale-data warnings, and no sensitive fields.
- Build/lint: storefront and admin production builds plus existing unit suites.

### 14.2 Development acceptance

- Use deterministic fixture orders and stubbed AWIN responses in development.
- Confirm one webhook event creates one outbox item.
- Confirm concurrent workers claim an item once.
- Confirm transient failures retry and permanent failures dead-letter.
- Confirm imported fixture transactions reconcile by PaymentIntent ID.
- Confirm dashboard totals count each order once.
- Confirm Skimlinks records are protected and categorised as `subnetwork`.
- Confirm imported Skimlinks assignments remain externally managed and no script schedules or changes their rates.
- Confirm an editorial/influencer category alone cannot grant the premium tier without explicit approval metadata and an observed AWIN assignment.
- Confirm `/feeds/awin.csv` returns CSV and other routes retain SPA behaviour.
- Confirm blocked routes do not load the MasterTag.

### 14.3 Production acceptance safety

Production verification is read-only:

- inspect deployed function versions and configuration;
- request public landing, feed, and static routes with `GET`/`HEAD`;
- verify MasterTag presence/absence without submitting forms;
- inspect sync health and imported real AWIN data;
- compare existing real orders and AWIN transactions;
- inspect outbox state created by real customer orders only.

Never run production checkout E2E, synthetic purchase, conversion, refund, label, dispatch, partner-removal, or commission-mutation tests.

## 15. Deployment sequence

### Phase A — tracking reliability

1. Add route-safe MasterTag helper and tests.
2. Correct feed rewrite and profile/creative metadata.
3. Provision the isolated development tracking endpoint and cookie domain.
4. Add outbox schema, encryption, worker, and capability probe.
5. Deploy and verify in development with fixtures/stubs.
6. Deploy production infrastructure and application changes without synthetic conversion tests.
7. Observe real delivery/read-only health before continuing.

### Phase B — commission configuration

1. Read back the live 10% `Program Standard Commission Rates` assignment and the 15% `Solum Premium` publisher rate.
2. Verify the live `DEFAULT` and `PREMIUM` tracked-part groups while keeping current checkout submissions on `DEFAULT`.
3. Import publisher categories, rate assignments, and effective rates; protect all three Skimlinks relationships as externally managed.
4. Keep customer acquisition as a separate immutable `NEW`/`RETURNING` field.
5. Assign a direct publisher to `Solum Premium` only after the specific publisher ID and commercial approval are recorded and independently reviewed.

### Phase C — reconciliation imports

1. Add transaction, performance, publisher, and sync-run tables.
2. Implement read-only AWIN API clients and rate limiting.
3. Backfill bounded historical windows.
4. Validate joins and financial semantics against existing real orders.

### Phase D — admin dashboard

1. Add reporting views and the authenticated `admin-awin` Edge Function.
2. Add summary, publisher, commission-group, reconciliation, and health UI.
3. Deploy to development and validate with fixture plus imported development data.
4. Deploy production and verify with read-only real data.

## 16. Acceptance criteria

The system is complete when:

1. AWIN attribution expires consistently after 30 days.
2. The MasterTag is absent from all payment/PII routes and present on approved discovery routes.
3. The clean AWIN feed URL returns valid CSV.
4. AWIN profile copy says 10% standard commission, explains that approved partners may receive enhanced rates, uses 30 days, and does not claim live subscriptions.
5. Each eligible live payment creates at most one outbox item.
6. Transient AWIN failures retry without blocking Stripe webhook processing.
7. No raw `awc` appears in analytics, logs, or admin responses.
8. Every imported AWIN transaction is matched or assigned a visible reconciliation exception.
9. Publisher and commission-group totals count each SOLUM order once.
10. Actual commission and network fee are used when available; unavailable values are labelled.
11. New/returning customer classification is stable across retries and independent of commission assignment.
12. All three Skimlinks relationships are retained, externally managed, and protected from automatic rate or partnership changes.
13. The dashboard shows publisher, category, AWIN rate assignment, tracked-part group, customer acquisition, status, profitability, and data freshness.
14. No production E2E or synthetic transaction test is required or executed.

## 17. Superseded guidance

This specification supersedes the deployment mechanism in `docs/awin-awc-cookie-deployment.md`. That document must be rewritten as the tracking-subdomain runbook during implementation. The attribution decisions in `docs/superpowers/specs/2026-07-30-awin-attribution-safety-design.md` remain valid except where this specification adds durable delivery, cookie infrastructure, reconciliation, and reporting.
