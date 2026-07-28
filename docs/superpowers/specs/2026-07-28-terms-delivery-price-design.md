# Terms delivery-price alignment

## Goal

Align the delivery charge stated on the public terms page with the £5.95
standard-delivery value used by the active free-delivery launch promotion.

## Scope

- Update the delivery sentence in Pricing & Payment from £3.85 to £5.95.
- Update the Delivery information row from £3.85 to £5.95.
- Add a focused source-level regression test that requires both terms entries to
  use £5.95 and rejects £3.85 delivery references.

## Non-goals

- Do not change checkout pricing or the active free-delivery offer.
- Do not alter subscription, product, entity, or other terms content.

## Verification

Run the focused regression test, then the existing unit suite and production
build.
