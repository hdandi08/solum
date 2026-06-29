# Kit Inventory Deduction — Design

> Created 2026-06-29. Fixes: `kit_inventory.available_count` (the kit-level "kits available" count the checkout reads) never moves on purchase or refund.

## Problem

`kit_inventory(kit_id, available_count)` is the customer-facing stock count — `create-first-box-session` / `create-first-box-payment-intent` read it to allow or block a purchase. But nothing decrements it on a paid order: `stripe-webhook`'s `deductInventory()` only touches per-product `products.current_stock` (separate supplier bookkeeping). Refunds (`charge.refunded`) and admin `cancel-order` don't restock anything. So the available count is wrong as soon as orders flow.

## Goal

Keep `kit_inventory.available_count` accurate:
- Paid **first-box** order → `available_count -= 1` for that order's kit.
- **Full refund we process** → `available_count += 1`.
- Idempotent (Stripe retries / multiple handlers must not double-count) and atomic (no oversell race).

## Decisions (locked)

- **Quantity:** always 1 per order (checkout is hardcoded `quantity: 1`, one kit per order).
- **Scope:** only **first-box** orders affect `kit_inventory`. Refills (subscription consumables) do not — they are not kits.
- **Restock trigger:** only `charge.refunded` where the refund is **full** (`charge.amount_refunded === charge.amount`). Partial refunds = price adjustments, no restock.
- **Disputes/chargebacks:** out of scope — `charge.dispute.*` events do NOT restock.
- **Floor:** `available_count` never goes below 0 (table already has `CHECK >= 0`); the checkout pages remain the oversell gate.
- **Per-product `current_stock`:** unchanged — this work only adds the kit-level count handling.

## Components

### 1. Migration

- Add to `orders`: `inventory_kit_deducted boolean NOT NULL DEFAULT false`, `inventory_kit_restocked boolean NOT NULL DEFAULT false`.
- Create RPC `adjust_kit_inventory(p_kit_id text, p_delta int) RETURNS int`:
  ```sql
  UPDATE public.kit_inventory
     SET available_count = GREATEST(0, available_count + p_delta)
   WHERE kit_id = p_kit_id
  RETURNING available_count;
  ```
  `SECURITY DEFINER`, single atomic statement (race-safe). Returns the new count (or null if the kit_id has no row).

### 2. `stripe-webhook` — deduct

A helper `deductKitInventory(db, orderId, kitId)`:
1. Idempotency gate (also the race guard):
   ```sql
   UPDATE orders SET inventory_kit_deducted = true
    WHERE id = :orderId AND inventory_kit_deducted = false
   RETURNING kit_id;
   ```
2. If a row is returned (we won), call `adjust_kit_inventory(kitId, -1)`. If no row, it was already deducted — no-op.
3. Wrapped in try/catch with logging; never block order processing (mirrors existing `deductInventory` error handling).

Called immediately after each existing **first-box** `deductInventory(... 'first_box' ...)` site in `stripe-webhook` (checkout.session.completed, payment_intent.succeeded, and the first-box subscription paths). The gate makes multiple call sites / retries safe. NOT called on the `'refill'` path.

### 3. `stripe-webhook` — restock (in the `charge.refunded` handler)

Extend the existing `charge.refunded` case:
1. Determine full refund: `charge.amount_refunded === charge.amount`. If not full, skip restock (still record refund as today).
2. Look up the order (same lookup the handler already uses to set `status='refunded'`) to get `id` + `kit_id`.
3. Helper `restockKitInventory(db, orderId, kitId)`:
   ```sql
   UPDATE orders SET inventory_kit_restocked = true
    WHERE id = :orderId AND inventory_kit_deducted = true AND inventory_kit_restocked = false
   RETURNING kit_id;
   ```
   If a row is returned, call `adjust_kit_inventory(kitId, +1)`. Else no-op (was never deducted, or already restocked).

This single location also covers admin `cancel-order`, because that creates a Stripe refund which fires `charge.refunded` — so no change to `cancel-order` and no double-restock.

## Data flow

```
paid first-box order
  -> deductInventory (product current_stock, unchanged)
  -> deductKitInventory: gate orders.inventory_kit_deducted -> adjust_kit_inventory(kit, -1)

full refund (Stripe dashboard or admin cancel-order -> Stripe refund)
  -> charge.refunded: amount_refunded == amount?
       yes -> restockKitInventory: gate inventory_kit_restocked (requires deducted=true) -> adjust_kit_inventory(kit, +1)
       no  -> record refund only, no restock
```

## Testing / verification (against dev)

- Seed a kit_inventory row (e.g. ground=5). Insert a paid first-box order → call deduct → count = 4; `inventory_kit_deducted=true`.
- Replay the deduct → count stays 4 (idempotent).
- Full refund the order → count = 5; `inventory_kit_restocked=true`.
- Replay restock → count stays 5.
- Partial refund on a fresh order → no restock.
- Deduct floors at 0 when count already 0.

## Deployment (per project rules)

- Migration applied to **both dev and prod** in the same session ([[feedback_dev_prod_parity]]).
- **Ask before** deploying the `stripe-webhook` edge function ([[feedback_supabase_deploy]]) and before any prod DB write ([[feedback_prod_database]]).

## Out of scope

- Per-product `current_stock` logic (unchanged).
- Dispute/chargeback restock.
- Low-stock alerts / auto-reorder.
- Issue 1 (SendCloud delivered-email mapping) — separate spec next.
