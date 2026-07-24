# Kit Inventory Deduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `kit_inventory.available_count` (the customer-facing "kits available" count the checkout reads) accurate: −1 on a paid first-box order, +1 on a full refund, idempotently and atomically.

**Architecture:** A single atomic Postgres RPC (`adjust_kit_inventory`) does the count change. Two boolean flags on `orders` (`inventory_kit_deducted`, `inventory_kit_restocked`) gate each direction so Stripe retries and multiple webhook handlers can't double-count. The `stripe-webhook` edge function calls a deduct helper alongside each existing first-box `deductInventory(...)` site, and a restock helper inside the `charge.refunded` handler (full-refund only). Per-product `products.current_stock` logic is untouched.

**Tech Stack:** Supabase Postgres (SQL migration + SECURITY DEFINER RPC), Deno/TypeScript edge function (`stripe-webhook`), Stripe webhooks, supabase-js v2.

**Spec:** `docs/superpowers/specs/2026-06-29-kit-inventory-deduction-design.md`

## Global Constraints

- Quantity is always 1 per order (checkout is hardcoded `quantity: 1`).
- Only **first-box** orders affect `kit_inventory`. Refills (`'refill'` order_type) never do.
- Restock only on `charge.refunded` where `charge.amount_refunded === charge.amount` (full refund). Partial refunds and `charge.dispute.*` never restock.
- `available_count` never goes below 0 (table `CHECK (available_count >= 0)`; RPC also floors with `GREATEST`).
- Inventory errors must NEVER block order processing — wrap in try/catch + log, mirroring existing `deductInventory`.
- Migration applied to **both dev and prod** in the same session (dev/prod parity rule).
- **ASK the user before** deploying the `stripe-webhook` edge function and before any prod DB write.
- Region `eu-west-2`. Dev project ref: `rodvvmfzkyjsqbufkjbc`. Prod project ref: (confirm before prod apply).
- **No backfill.** Deductions only ever accrue from NEW orders going forward — existing paid orders are never re-processed (Stripe does not replay old events, and `inventory_kit_deducted` defaults false but nothing loops over old rows). The `available_count` seed value the admin sets at go-live must therefore reflect ACTUAL current stock as of that moment.

---

### Task 1: Migration — flags + atomic RPC

**Files:**
- Create: `supabase/migrations/20260630000001_kit_inventory_adjust.sql`

**Interfaces:**
- Consumes: existing `public.kit_inventory(kit_id text PK, available_count int CHECK >= 0)` and `public.orders` tables.
- Produces:
  - `orders.inventory_kit_deducted boolean NOT NULL DEFAULT false`
  - `orders.inventory_kit_restocked boolean NOT NULL DEFAULT false`
  - RPC `public.adjust_kit_inventory(p_kit_id text, p_delta int) RETURNS int` — atomically sets `available_count = GREATEST(0, available_count + p_delta)` for the row, returns the new count, or NULL if no row for that kit_id.

- [ ] **Step 1: Write the migration**

```sql
-- Kit-level inventory adjustment: idempotency flags on orders + atomic RPC.
-- See docs/superpowers/specs/2026-06-29-kit-inventory-deduction-design.md

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_kit_deducted  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_kit_restocked boolean NOT NULL DEFAULT false;

-- Atomic, race-safe single-statement adjust. Floors at 0.
-- Returns the new available_count, or NULL if the kit_id has no row.
CREATE OR REPLACE FUNCTION public.adjust_kit_inventory(p_kit_id text, p_delta int)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.kit_inventory
     SET available_count = GREATEST(0, available_count + p_delta),
         updated_at      = now()
   WHERE kit_id = p_kit_id
  RETURNING available_count;
$$;

REVOKE ALL ON FUNCTION public.adjust_kit_inventory(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_kit_inventory(text, int) TO service_role;
```

- [ ] **Step 2: Apply to dev and verify the RPC + columns exist**

Run (psql against dev, or `supabase db push` targeting dev):
```bash
supabase db push --db-url "$SUPABASE_DEV_DB_URL"
```
Then verify:
```sql
SELECT column_name FROM information_schema.columns
 WHERE table_name='orders' AND column_name LIKE 'inventory_kit_%';
SELECT public.adjust_kit_inventory('ground', 0) AS count;  -- returns current count, no change
```
Expected: two column rows (`inventory_kit_deducted`, `inventory_kit_restocked`); `adjust_kit_inventory` returns the current ground count (e.g. `0`).

- [ ] **Step 3: Apply to prod (ASK USER FIRST), same verification**

This is a prod DB write — get explicit per-operation approval in the current message before running. Then apply the same migration to prod and run the same two verification queries.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260630000001_kit_inventory_adjust.sql
git commit -m "feat(inventory): kit_inventory adjust RPC + idempotency flags on orders"
```

---

### Task 2: `stripe-webhook` — deduct helper + wire into first-box sites

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts` (add helpers after `deductInventory`, ~line 59; call sites at lines ~378, ~468, ~667, ~833)

**Interfaces:**
- Consumes: `adjust_kit_inventory(p_kit_id, p_delta)` RPC from Task 1; `orders.inventory_kit_deducted` flag; supabase-js client `supabase`.
- Produces:
  - `async function deductKitInventory(db, orderId: string, kitId: string): Promise<void>` — gates on `inventory_kit_deducted`, then `adjust_kit_inventory(kitId, -1)`.
  - `async function restockKitInventory(db, orderId: string, kitId: string): Promise<void>` — used by Task 3.

- [ ] **Step 1: Add both helpers immediately after `deductInventory` (after line 59)**

```ts
// Decrement the kit-level available_count for a paid FIRST-BOX order.
// Idempotent + race-safe: the conditional UPDATE is the gate — only the first
// caller to flip inventory_kit_deducted wins, and only it adjusts the count.
// Never throws past here — inventory must not block order processing.
async function deductKitInventory(
  db: ReturnType<typeof createClient>,
  orderId: string,
  kitId: string,
) {
  try {
    const { data: gated } = await db
      .from('orders')
      .update({ inventory_kit_deducted: true })
      .eq('id', orderId)
      .eq('inventory_kit_deducted', false)
      .select('kit_id')
      .maybeSingle();
    if (!gated) return; // already deducted (retry / duplicate handler) — no-op
    const { data: newCount, error } = await db.rpc('adjust_kit_inventory', {
      p_kit_id: kitId,
      p_delta: -1,
    });
    if (error) console.error('kit_inventory_deduct_error', error.message, { orderId, kitId });
    else console.log('KIT_INVENTORY_DEDUCT', JSON.stringify({ orderId, kitId, newCount }));
  } catch (err) {
    console.error('kit_inventory_deduct_error', err, { orderId, kitId });
  }
}

// Increment the kit-level available_count when we fully refund a first-box order.
// Gate requires the order was actually deducted and not already restocked.
async function restockKitInventory(
  db: ReturnType<typeof createClient>,
  orderId: string,
  kitId: string,
) {
  try {
    const { data: gated } = await db
      .from('orders')
      .update({ inventory_kit_restocked: true })
      .eq('id', orderId)
      .eq('inventory_kit_deducted', true)
      .eq('inventory_kit_restocked', false)
      .select('kit_id')
      .maybeSingle();
    if (!gated) return; // never deducted, or already restocked — no-op
    const { data: newCount, error } = await db.rpc('adjust_kit_inventory', {
      p_kit_id: kitId,
      p_delta: 1,
    });
    if (error) console.error('kit_inventory_restock_error', error.message, { orderId, kitId });
    else console.log('KIT_INVENTORY_RESTOCK', JSON.stringify({ orderId, kitId, newCount }));
  } catch (err) {
    console.error('kit_inventory_restock_error', err, { orderId, kitId });
  }
}
```

- [ ] **Step 2: Wire `deductKitInventory` into all four first-box sites**

After each existing first-box `deductInventory(...)` call, add a `deductKitInventory` call with the same id. Make these four edits:

At line ~378 (payment_intent.succeeded one-time):
```ts
  if (kit_id && order?.id) {
    await deductInventory(supabase, kit_id, 'first_box', order.id);
    await deductKitInventory(supabase, order.id, kit_id);
  }
```

At line ~468 (checkout.session.completed one-time):
```ts
  if (kit_id && order?.id) {
    await deductInventory(supabase, kit_id, 'first_box', order.id);
    await deductKitInventory(supabase, order.id, kit_id);
  }
```

At line ~667 (checkout.session.completed subscription first box):
```ts
        if (kit_id && sub?.id) {
          await deductInventory(supabase, kit_id, 'first_box', sub.id);
          await deductKitInventory(supabase, sub.id, kit_id);
        }
```

At line ~833 (payment_intent.succeeded subscription first box):
```ts
        if (kit_id && sub?.id) {
          await deductInventory(supabase, kit_id, 'first_box', sub.id);
          await deductKitInventory(supabase, sub.id, kit_id);
        }
```

Do NOT touch the `'refill'` site at line ~911.

- [ ] **Step 3: Type-check the function**

Run:
```bash
deno check supabase/functions/stripe-webhook/index.ts
```
Expected: no errors. (If `deno` resolves remote types slowly, that's fine — it should exit 0.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(inventory): deduct kit_inventory on paid first-box orders"
```

---

### Task 3: `stripe-webhook` — restock on full refund

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts:1163-1173` (the `charge.refunded` case)

**Interfaces:**
- Consumes: `restockKitInventory(db, orderId, kitId)` from Task 2; Stripe `Charge` object (`amount`, `amount_refunded`, `payment_intent`).
- Produces: nothing new (terminal behavior).

- [ ] **Step 1: Replace the `charge.refunded` case body**

The current handler updates orders by `stripe_payment_id` only. Replace lines 1163-1173 with a version that selects the order (id + kit_id + order_type) so it can restock a fully-refunded first box:

```ts
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const { data: refundedOrder } = await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_payment_id', charge.payment_intent as string)
          .select('id, kit_id, order_type')
          .maybeSingle();

        // Restock the kit count only on a FULL refund of a first-box order.
        const isFullRefund = charge.amount_refunded === charge.amount;
        if (isFullRefund && refundedOrder?.order_type === 'first_box' && refundedOrder.kit_id) {
          await restockKitInventory(supabase, refundedOrder.id, refundedOrder.kit_id);
        }

        await logEvent(supabase, event.id, event.type, null, {
          amount_refunded_pence: charge.amount_refunded,
          amount_pence: charge.amount,
          full_refund: isFullRefund,
          order_id: refundedOrder?.id ?? null,
          reason: charge.refunds?.data[0]?.reason,
        });
        break;
      }
```

- [ ] **Step 2: Type-check the function**

Run:
```bash
deno check supabase/functions/stripe-webhook/index.ts
```
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(inventory): restock kit_inventory on full refund of first-box order"
```

---

### Task 4: End-to-end verification against dev

**Files:**
- None (manual verification against dev DB + deployed dev function).

**Interfaces:**
- Consumes: deployed Task 1 migration on dev, Task 2+3 function deployed to dev.

- [ ] **Step 1: Deploy `stripe-webhook` to dev (ASK USER FIRST)**

Deploying edge functions requires asking first. With approval:
```bash
supabase functions deploy stripe-webhook --project-ref rodvvmfzkyjsqbufkjbc
```

- [ ] **Step 2: Seed a known count**

```sql
UPDATE public.kit_inventory SET available_count = 5 WHERE kit_id = 'ground';
```

- [ ] **Step 3: Deduct path — insert a paid first-box order, run the deduct, assert count = 4**

Simplest path: trigger a dev test purchase (Stripe test card) for the GROUND kit, OR directly exercise the gate+RPC against a seeded order row:
```sql
-- assuming order <OID> exists, kit_id='ground', inventory_kit_deducted=false
UPDATE public.orders SET inventory_kit_deducted = true
  WHERE id = '<OID>' AND inventory_kit_deducted = false RETURNING kit_id;  -- 1 row
SELECT public.adjust_kit_inventory('ground', -1);  -- returns 4
```
Expected: `available_count` = 4, `inventory_kit_deducted` = true.

- [ ] **Step 4: Idempotency — replay deduct, assert count stays 4**

```sql
UPDATE public.orders SET inventory_kit_deducted = true
  WHERE id = '<OID>' AND inventory_kit_deducted = false RETURNING kit_id;  -- 0 rows → no adjust
SELECT available_count FROM public.kit_inventory WHERE kit_id='ground';   -- still 4
```
Expected: 0 rows from the gate, count unchanged at 4.

- [ ] **Step 5: Restock path — full refund the order, assert count = 5**

Issue a full refund in the Stripe (test) dashboard for that order's payment intent, OR simulate the gate+RPC:
```sql
UPDATE public.orders SET inventory_kit_restocked = true
  WHERE id = '<OID>' AND inventory_kit_deducted = true AND inventory_kit_restocked = false RETURNING kit_id;  -- 1 row
SELECT public.adjust_kit_inventory('ground', 1);  -- returns 5
```
Expected: count = 5, `inventory_kit_restocked` = true. Replaying the gate returns 0 rows (idempotent).

- [ ] **Step 6: Floor check — deduct when already 0 stays 0**

```sql
UPDATE public.kit_inventory SET available_count = 0 WHERE kit_id='ritual';
SELECT public.adjust_kit_inventory('ritual', -1);  -- returns 0, not -1
```
Expected: returns 0.

- [ ] **Step 7: Reset dev seed values to intended live values, then deploy to prod (ASK USER FIRST)**

Restore any dev counts you changed for testing. Then, with explicit approval for the prod function deploy:
```bash
supabase functions deploy stripe-webhook --project-ref <PROD_REF>
```
(Task 1 prod migration must already be applied — see Task 1 Step 3.)

- [ ] **Step 8: Log the manual changes**

Append the migration apply (dev + prod) and the two function deploys to `docs/manual-changes-log.md`, then commit:
```bash
git add docs/manual-changes-log.md
git commit -m "docs: log kit_inventory deduction migration + function deploys"
```

---

## Notes for the executor

- The four deduct sites already guard on `kit_id && order?.id` (or `sub?.id`) — `deductKitInventory` is safe to call right after `deductInventory` with the same id.
- The gate UPDATE is BOTH the idempotency check and the race guard — no separate locking needed.
- `cancel-order` (admin) issues a Stripe refund which fires `charge.refunded`, so restock happens there automatically. Do NOT add a restock call to `cancel-order` (would double-restock).
- Confirm the prod project ref before any prod apply/deploy; do not guess it.
