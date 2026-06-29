# Cancel Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can cancel any paid order — Stripe refund is issued automatically, SendCloud parcel is cancelled if it exists and hasn't shipped, order is marked cancelled in DB.

**Architecture:** New `cancel-order` Supabase edge function (admin-gated, mirrors the `create-sendcloud-parcel` auth pattern). A Cancel & Refund button is added to the admin Orders page. If the SendCloud parcel can't be cancelled (already with carrier), the refund still goes through and a `cancel_notes` field flags it for manual follow-up. One migration adds three columns to `orders`.

**Tech Stack:** Deno edge function, Stripe SDK (`esm.sh/stripe@14`), SendCloud REST API, Supabase JS client, React admin UI.

---

## File map

| Action   | File                                                                  | Purpose                                      |
|----------|-----------------------------------------------------------------------|----------------------------------------------|
| Create   | `supabase/functions/cancel-order/index.ts`                            | Edge function: refund + SendCloud cancel + DB |
| Create   | `supabase/migrations/20260613000002_add_cancel_fields_to_orders.sql`  | Add cancelled_at, refund_id, cancel_notes    |
| Modify   | `admin/src/pages/OrdersPage.jsx`                                      | Cancel & Refund button + cancelled state UI  |

---

## Task 1: DB migration — add cancel fields to orders

**Files:**
- Create: `supabase/migrations/20260613000002_add_cancel_fields_to_orders.sql`

- [ ] **Step 1: Write the migration**

```sql
-- cancel-order fields
alter table public.orders
  add column if not exists cancelled_at  timestamptz,
  add column if not exists refund_id     text,
  add column if not exists cancel_notes  text;
```

- [ ] **Step 2: Apply to dev**

```bash
npx supabase db push --project-ref rodvvmfzkyjsqbufkjbc
```

Expected: `Applying migration 20260613000002_add_cancel_fields_to_orders.sql... done`

- [ ] **Step 3: Apply to prod**

```bash
npx supabase db push --project-ref gvfptmjluxpngfjendbi
```

Expected: same

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260613000002_add_cancel_fields_to_orders.sql
git commit -m "feat: add cancelled_at, refund_id, cancel_notes to orders"
```

---

## Task 2: `cancel-order` edge function

**Files:**
- Create: `supabase/functions/cancel-order/index.ts`

**Logic:**
1. Admin auth check (same as `create-sendcloud-parcel`)
2. Fetch order — must exist and `status` must be `'paid'` (not already cancelled)
3. Issue Stripe refund via `stripe.refunds.create({ payment_intent: order.stripe_payment_id })`
4. If `order.sendcloud_parcel_id` exists, call `DELETE /api/v2/parcels/{id}` on SendCloud. If it fails (parcel already handed to carrier), capture the error as a note but don't abort.
5. Update order: `status='cancelled'`, `cancelled_at=now`, `refund_id=refund.id`, `cancel_notes` (null or SendCloud error message)
6. Return `{ refund_id, sendcloud_cancelled: bool, cancel_notes }`

- [ ] **Step 1: Create the function**

```typescript
// supabase/functions/cancel-order/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com', 'hdandibrwz@gmail.com'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Parse body ───────────────────────────────────────────────────────────
  let order_id: string;
  try {
    const body = await req.json();
    order_id = body.order_id;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }
  if (!order_id) {
    return new Response(JSON.stringify({ error: 'order_id required' }), { status: 400, headers: corsHeaders });
  }

  // ── Fetch order ──────────────────────────────────────────────────────────
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, status, stripe_payment_id, sendcloud_parcel_id, amount_pence')
    .eq('id', order_id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders });
  }
  if (order.status === 'cancelled') {
    return new Response(JSON.stringify({ error: 'Order already cancelled' }), { status: 409, headers: corsHeaders });
  }
  if (!order.stripe_payment_id) {
    return new Response(JSON.stringify({ error: 'No Stripe payment ID on this order — refund manually in Stripe dashboard' }), {
      status: 422, headers: corsHeaders,
    });
  }

  // ── Stripe refund ────────────────────────────────────────────────────────
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
  let refundId: string;
  try {
    const refund = await stripe.refunds.create({ payment_intent: order.stripe_payment_id });
    refundId = refund.id;
    console.log('CANCEL_ORDER_REFUND', JSON.stringify({ order_id, refund_id: refundId }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('CANCEL_ORDER_STRIPE_ERROR', msg);
    return new Response(JSON.stringify({ error: `Stripe refund failed: ${msg}` }), {
      status: 502, headers: corsHeaders,
    });
  }

  // ── SendCloud cancel (best-effort) ───────────────────────────────────────
  let sendcloudCancelled = false;
  let cancelNotes: string | null = null;

  if (order.sendcloud_parcel_id) {
    const publicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const secretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');

    if (publicKey && secretKey) {
      const scAuth = 'Basic ' + btoa(`${publicKey}:${secretKey}`);
      const scRes = await fetch(
        `https://panel.sendcloud.sc/api/v2/parcels/${order.sendcloud_parcel_id}/cancel`,
        { method: 'POST', headers: { 'Authorization': scAuth } },
      );
      if (scRes.ok) {
        sendcloudCancelled = true;
        console.log('CANCEL_ORDER_SENDCLOUD_OK', JSON.stringify({ order_id, parcel_id: order.sendcloud_parcel_id }));
      } else {
        const errBody = await scRes.text();
        cancelNotes = `SendCloud cancel failed (${scRes.status}): parcel may already be with carrier — manual return required. Detail: ${errBody}`;
        console.warn('CANCEL_ORDER_SENDCLOUD_FAILED', cancelNotes);
      }
    }
  }

  // ── Update order ─────────────────────────────────────────────────────────
  await db.from('orders').update({
    status:       'cancelled',
    cancelled_at: new Date().toISOString(),
    refund_id:    refundId,
    cancel_notes: cancelNotes,
  }).eq('id', order_id);

  console.log('CANCEL_ORDER_COMPLETE', JSON.stringify({ order_id, refund_id: refundId, sendcloud_cancelled: sendcloudCancelled }));

  return new Response(
    JSON.stringify({ refund_id: refundId, sendcloud_cancelled: sendcloudCancelled, cancel_notes: cancelNotes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
```

- [ ] **Step 2: Deploy to dev**

```bash
npx supabase functions deploy cancel-order --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
```

Expected: `Deployed Functions on project rodvvmfzkyjsqbufkjbc: cancel-order`

- [ ] **Step 3: Deploy to prod**

```bash
npx supabase functions deploy cancel-order --project-ref gvfptmjluxpngfjendbi --no-verify-jwt
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/cancel-order/index.ts
git commit -m "feat: cancel-order edge function — Stripe refund + SendCloud cancel"
```

---

## Task 3: Admin UI — Cancel & Refund button

**Files:**
- Modify: `admin/src/pages/OrdersPage.jsx`

The current action column renders buttons based on `dispatch_status`. We add a Cancel & Refund button that appears when `order.status !== 'cancelled'`, with a confirmation dialog to prevent accidental clicks. After success, the row shows a red "cancelled" badge and the refund ID.

Look for this pattern in the file (around line 344):
```jsx
{order.dispatch_status === 'pending' && (
  <button className="btn btn-sm btn-primary" onClick={() => handleDispatch(order)} ...>
```

- [ ] **Step 1: Add `handleCancel` function** — insert after `handleMarkDelivered` (around line 238):

```jsx
async function handleCancel(orderId) {
  if (!window.confirm('Cancel this order and issue a full refund? This cannot be undone.')) return
  setSaving(orderId)
  setSaveError('')
  try {
    const { data: { session } } = await config.authClient.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ order_id: orderId }),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Failed (${res.status})`)
    if (data.cancel_notes) {
      alert(`Refund issued (${data.refund_id}). Note: ${data.cancel_notes}`)
    }
    await Promise.all([fetchOrders(), fetchBatches()])
  } catch (err) {
    setSaveError(err.message)
  } finally {
    setSaving(null)
  }
}
```

- [ ] **Step 2: Add the Cancel button to the action column** — in the actions `<td>`, after the existing dispatch/delivered buttons, add:

```jsx
{order.status !== 'cancelled' && (
  <button
    className="btn btn-sm"
    style={{ background: 'rgba(224,92,92,0.12)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.3)' }}
    onClick={() => handleCancel(order.id)}
    disabled={saving === order.id}
  >
    Cancel & Refund
  </button>
)}
```

- [ ] **Step 3: Add cancelled state to the dispatch status badge** — find the risk-badge span (around line 339) and add a cancelled case:

```jsx
<span className={`risk-badge ${
  order.status === 'cancelled'        ? 'critical' :
  order.dispatch_status === 'pending' ? (isOverdue ? 'critical' : 'low') : 'ok'
}`}>
  {order.status === 'cancelled' ? 'cancelled' : order.dispatch_status}
</span>
```

- [ ] **Step 4: Show refund ID in expanded row** — in the expanded detail section, find where `tracking_number` is displayed and add below it:

```jsx
{order.status === 'cancelled' && (
  <div style={{ marginTop: 8 }}>
    <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e05c5c', fontWeight: 600 }}>
      Refunded
    </span>
    {order.refund_id && (
      <span style={{ fontSize: 12, color: 'var(--bone-muted)', marginLeft: 8, fontFamily: 'monospace' }}>
        {order.refund_id}
      </span>
    )}
    {order.cancel_notes && (
      <div style={{ fontSize: 12, color: '#e05c5c', marginTop: 4, lineHeight: 1.5 }}>
        ⚠ {order.cancel_notes}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Add 'Cancelled' to the status filter dropdown** — find the `<select>` with dispatch status options (around line 266):

```jsx
<option value="cancelled">Cancelled</option>
```

Note: the status filter currently filters on `dispatch_status`. For cancelled orders, also add logic to filter on `status === 'cancelled'` — find line 185:
```javascript
// Change:
if (statusFilter) q = q.eq('dispatch_status', statusFilter)
// To:
if (statusFilter === 'cancelled') {
  q = q.eq('status', 'cancelled')
} else if (statusFilter) {
  q = q.eq('dispatch_status', statusFilter)
}
```

- [ ] **Step 6: Commit**

```bash
git add admin/src/pages/OrdersPage.jsx
git commit -m "feat: cancel & refund button in admin orders page"
```

---

## Task 4: Push everything to prod

- [ ] **Step 1: Merge dev to master**

```bash
git checkout master && git merge dev && git push origin master && git checkout dev
```

Expected: Amplify auto-deploys frontend to prod.

---

## Self-review

**Spec coverage:**
- ✅ Admin-only cancel — auth check in edge function matches `create-sendcloud-parcel` pattern
- ✅ Stripe full refund — `stripe.refunds.create({ payment_intent })`
- ✅ SendCloud cancel attempted — `POST /api/v2/parcels/{id}/cancel`, best-effort
- ✅ Post-dispatch graceful degradation — refund goes through, `cancel_notes` flags manual return
- ✅ Order marked cancelled in DB with `cancelled_at`, `refund_id`, `cancel_notes`
- ✅ UI shows cancelled badge, refund ID, notes warning
- ✅ Confirmation dialog prevents accidental clicks
- ✅ Both dev and prod deployments covered

**SendCloud cancel endpoint note:** SendCloud uses `POST /api/v2/parcels/{id}/cancel` (not DELETE). Confirmed from SendCloud docs — cancellation is a POST to the cancel sub-resource.

**`stripe_payment_id` note:** This field holds the Stripe payment intent ID (`pi_xxx`) for orders created via the BuyPage flow. Confirmed from stripe-webhook handler which writes the payment intent ID to this field.
