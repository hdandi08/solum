# Multiple-kit checkout design

## Agreed direction

Keep the usual one-kit checkout simple. Offer a discreet “Add another kit” link that opens quantities inline. Support repeated quantities of either kit and mixed GROUND/RITUAL orders. Use one payment, one order number and one delivery address. Each physical kit ships as a separate parcel. Implementation and deployment are dev-only. Admin changes follow after checkout and order handling.

Current prices remain £65 for GROUND and £85 for RITUAL, with the existing free UK delivery offer. A proposed initial self-service limit is five kits in total. This limit is an implementation default based on the requested 2–5-kit use case, rather than a bulk-pricing policy.

## Approaches considered

- Always-visible quantity and kit controls make repeated purchases quick but add decisions to the usual one-kit purchase.
- A separate basket adds a new destination and buying flow, which the user ruled out.
- Inline editing behind “Add another kit” keeps the default checkout familiar and reveals complexity only when requested. This is the agreed approach.

## Checkout experience

The initial selected-kit card retains its image, name, price, delivery information and small Change kit action. Place “Add another kit” as a secondary text link below its main content.

Opening the link reveals an inline editor with the selected kit at quantity one and an option to add the other kit. Show unit prices and accessible minus/plus controls. The last remaining kit cannot be removed; quantities must be whole numbers; the total across both types cannot exceed the configured limit. Availability limits increments, with a clear explanation when the requested quantity cannot be supplied.

“Update order” applies the quantities and returns to the summary. Multiple kits use “Your kits” and an Edit action. Show one row per kit type with its quantity and subtotal, rather than a large card for every physical kit.

```text
Your kits                                  Edit

RITUAL           2 × £85                    £170
GROUND           1 × £65                     £65

Total                                      £235
Free UK delivery
Your 3 kits will be sent in separate parcels.
```

The order total, sticky mobile summary, desktop summary, wallet display, payment button and success page all use the same confirmed item list and amount. Keep the existing distinction between direct visitors and people arriving after choosing a kit on site. No automatic quantity discount or additional customer-facing shipping choice is introduced.

Changing kit quantities after a payment attempt has started must safely retire the old attempt and its stock hold before issuing another payable amount. Keep customer details and address. Prevent confirmation while totals are being refreshed or an earlier payment is processing. Unchanged retries reuse their existing attempt; refresh and redirect-based payment recovery restore the complete item list.

## Current implementation findings

These findings describe repository code, not an audit of which migrations or feature flags are currently active on dev or production:

- create-first-box-payment-intent accepts one kit_id and calculates one kit price.
- The paid webhook creates one orders row with one kit_id. Product deductions and checkout reservation settlement assume one kit.
- checkout_reservations stores a single kit_id per payment resource and currently holds/releases one unit.
- create-sendcloud-parcel chooses a single kit weight, stores one parcel/tracking number on orders, and deducts one box on label creation.
- The shipping handler currently looks up the customer's latest current address. New multi-kit orders need their own immutable address snapshot so later customer address changes cannot redirect an existing order.
- The admin UI derives kit/packing codes from a single kit_id. It is not ready to fulfill multi-kit orders.

## Phase 1: dev checkout and order handling

### Order structure

Store one parent order per successful payment, with order-item rows containing kit type, quantity, unit price paid and line total. Persist the currency, order total and shipping-address snapshot with the order. Store the validated payment attempt's item snapshot before exposing payment confirmation to the customer; paid webhooks resolve that snapshot rather than trusting browser-supplied totals or a single kit_id.

Create one pending fulfillment unit per physical kit. Each references the parent order and order item and has a stable unit number. Two RITUAL plus one GROUND produces two item rows and three fulfillment units. Labels and parcel tracking are added in phase 2.

Existing single-kit orders and subscription/refill paths remain compatible. Never encode a mixed order as a fabricated kit_id or silently substitute the first kit for the entire order. Legacy single-kit records can be read as quantity one while migration/backfill is performed.

### Payments, stock and retries

The server validates allowed kit types, positive integer quantities, the total quantity limit and canonical prices. Normalize duplicate kit entries before checking the limit. The client cannot choose prices or override availability.

Reserve all requested kit quantities in one database transaction before exposing a payable attempt. Use deterministic stock-lock ordering so concurrent mixed orders cannot deadlock or oversell. If any item is unavailable, do not leave a partial hold or silently remove items; return the affected kit and a useful availability message.

Keep sellable kit inventory as the availability authority, consistent with the existing checkout. Component inventory and its ledger must record the summed consumption for all items; this project does not silently replace the availability model with component-derived stock.

Payment, order creation, inventory settlement and fulfillment-unit creation must be idempotent. The paid handler consumes the exact kit quantities once and records the summed component quantities for both kit types. Inventory updates and their ledger records must agree even after retries or an interrupted webhook.

Cancellation and expiry release the entire applicable reservation only after the payment resource is definitively unpayable. A successful or processing payment must not release stock or permit a second payment. Refund accounting records the affected quantities; money movement alone must not imply that shipped products have physically returned to stock.

The existing one-time card and express-wallet paths both need mixed-order support before the feature is enabled. Do not change subscriptions into multi-kit orders as part of this work.

### Customer communication and analytics

Order confirmation, success view and receipts show quantities, line subtotals, the full paid total, the single delivery address and that kits arrive in separate parcels. One payment generates one purchase/conversion identity with the complete value and item quantities. Preserve existing ad/affiliate attribution and retry protection.

### Boundary while admin is deferred

Multi-kit fulfillment remains disabled until phase 2. Existing single-order label/dispatch actions must reject orders containing more than one physical kit with a clear explanation. They must never create one label and mark all kits dispatched. These are backend guards, not an admin redesign.

Apply that boundary to label creation, manual dispatch through admin-orders/admin_mutate_order, and legacy carrier callbacks. Cover repeated quantities of one kit as well as mixed kit types. A legacy callback must never mark a whole multi-kit order dispatched or delivered from a single parcel event.

Dev test orders can validate payment and order creation without creating live carrier labels or sending unrequested external messages. The dev-only feature must not be promoted to production while fulfillment/admin support is incomplete.

## Phase 2: admin, dispatch and returns

Show one order with a clear pick list and a parcel list. Each physical kit gets its own label, kit-appropriate verified shipping weight, tracking number and status, all going to the order's address snapshot. Presentation boxes and shipping materials are counted per physical unit according to the existing kit composition, without double-deducting packaging.

Allow “Create all labels” with safe retries of unfinished units. If two labels succeed and one fails, retain the successful labels and retry only the failed unit. Idempotency and reconciliation must be per fulfillment unit, not just per order. Label creation and carrier handover are distinct events.

Track partial dispatch and delivery. A carrier callback for one parcel updates that parcel; the order is fully dispatched/delivered only when all applicable units reach that state. Identify late/duplicate callbacks and do not regress delivered units. Show cancelled or returned units explicitly instead of losing them from the history.

Dispatch communications identify the kit and tracking for each dispatched parcel, explain anything still pending, and avoid sending a duplicate notice on a label retry. Full-order cancellation and any selected-unit refund/return actions must use explicit quantities and correct restocking, with existing admin permissions and audit requirements preserved.

## Dev acceptance before production is considered

- One-kit checkout still works through both entry experiences and both payment methods.
- Repeated RITUAL, repeated GROUND and a mixed order persist correct prices, quantities, address and fulfillment units.
- Two RITUAL plus one GROUND totals £235, reserves 2 RITUAL + 1 GROUND, and produces one paid order with three pending parcels.
- Missing, fractional, negative, duplicate, over-limit and unknown-kit inputs are handled on the server.
- Insufficient stock rolls back the whole hold; concurrent requests cannot oversell shared stock.
- Refresh, payment redirects, quantity edits, abandoned attempts and duplicate webhooks cannot double-charge, double-create orders or double-adjust inventory.
- During phase 1, old dispatch actions reject multi-kit orders without contacting the carrier.
- During phase 2, label failure/retry, separate parcel callbacks, partial fulfillment, cancellation and return paths preserve the right per-kit quantities.
- Exercise provider side effects with mocks/isolated dev fixtures. Do not create real carrier labels or perform production tests as acceptance.
- Check which reservation migrations and flags are active on dev before implementation rollout. No production migration, secret, function deployment, admin deployment or master push is authorized by this design task.

## Design review

A separate read-only builder review found no important unanswered questions. It confirmed that admin can be deferred while dev-only multi-kit fulfillment is blocked, and highlighted the need to guard manual dispatch and legacy carrier callbacks as well as label creation; those requirements are included above.

## Safe pause and resume — 19 November 2026

Paused at the user's explicit request after design and read-only review. No multi-kit application code, migration, function deployment, feature flag or Git push has been made. The previous buy-page release was pushed to dev and master as 2faef02; that is separate from this planned feature.

On resume, read this document and inspect the current checkout before making changes. Continue with the dev-only checkout and order-handling phase. The user confirmed one address per order, each physical kit in a separate parcel, and admin changes later. Preserve the single-kit experience and add multi-kit controls only behind the secondary link. Prepare the implementation plan and tests before coding. Keep multi-kit fulfillment guarded until the later admin phase is ready. Do not push this feature to master or deploy production resources.

Resumed later on 19 November at the user's “lets build” request. The active plan and execution record are in 2026-11-19-multiple-kits-implementation-plan.md. The pause note above records the earlier checkpoint, not the current implementation status.
