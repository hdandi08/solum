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
  if (order.status !== 'paid') {
    return new Response(JSON.stringify({ error: `Order cannot be cancelled (status: ${order.status})` }), {
      status: 409, headers: corsHeaders,
    });
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
  const { error: updateErr } = await db.from('orders').update({
    status:       'cancelled',
    cancelled_at: new Date().toISOString(),
    refund_id:    refundId,
    cancel_notes: cancelNotes,
  }).eq('id', order_id);

  if (updateErr) {
    console.error('CANCEL_ORDER_DB_UPDATE_ERROR', updateErr.message);
    return new Response(
      JSON.stringify({ error: `Refund issued (${refundId}) but DB update failed — check Supabase logs` }),
      { status: 502, headers: corsHeaders },
    );
  }

  console.log('CANCEL_ORDER_COMPLETE', JSON.stringify({ order_id, refund_id: refundId, sendcloud_cancelled: sendcloudCancelled }));

  return new Response(
    JSON.stringify({ refund_id: refundId, sendcloud_cancelled: sendcloudCancelled, cancel_notes: cancelNotes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
