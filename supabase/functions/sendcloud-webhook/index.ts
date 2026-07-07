import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { sendDeliveredEmail, sendFailedDeliveryEmail } from '../_shared/emails.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sendcloud status ID → our dispatch_status.
// IDs and meanings verified against Sendcloud's canonical parcel-status list
// (2026-07-07). The previous map had invented meanings — 91 "Parcel en route"
// was mapped to 'delivered', so customers got the "Delivered." email the moment
// Royal Mail took the parcel; 8 "Delivery attempt failed" also sent "Delivered.";
// 5 "Sorted" and 22 "Picked up by driver" sent failed-delivery emails.
// 'delivered' and 'failed' trigger customer emails — map conservatively:
// anything in normal transit is 'dispatched'; unknown IDs are left unmapped (no change).
const STATUS_MAP: Record<number, string> = {
  1:     'dispatched', // Announced
  3:     'dispatched', // En route to sorting center
  4:     'dispatched', // Delivery delayed
  5:     'dispatched', // Sorted
  6:     'dispatched', // Not sorted
  7:     'dispatched', // Being sorted
  8:     'failed',     // Delivery attempt failed
  11:    'delivered',  // Delivered
  12:    'dispatched', // Awaiting customer pickup
  13:    'dispatched', // Announced: not collected
  22:    'dispatched', // Shipment picked up by driver
  80:    'failed',     // Unable to deliver
  91:    'dispatched', // Parcel en route
  92:    'dispatched', // Driver en route
  93:    'delivered',  // Shipment collected by customer
  1000:  'dispatched', // Ready to send
  1001:  'dispatched', // Being announced
  62990: 'dispatched', // At sorting centre
  62992: 'failed',     // Returned to sender
};

async function verifySignature(body: string, signatureHeader: string | null): Promise<boolean> {
  const secret = Deno.env.get('SENDCLOUD_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('SENDCLOUD_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }
  if (!signatureHeader) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const computed = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === signatureHeader;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Sendcloud may send a GET to verify the endpoint is reachable
  if (req.method === 'GET') return new Response('ok', { status: 200, headers: corsHeaders });

  const rawBody = await req.text();

  // Verify HMAC-SHA256 signature
  const signature = req.headers.get('Sendcloud-Signature');
  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    console.error('SENDCLOUD_WEBHOOK: invalid signature');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const action = body.action as string;
    const parcel = body.parcel as Record<string, unknown> | undefined;

    console.log('SENDCLOUD_WEBHOOK', JSON.stringify({
      action,
      parcel_id: parcel?.id,
      status_id: (parcel?.status as Record<string, unknown>)?.id,
    }));

    if (action !== 'parcel_status_changed' || !parcel) {
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const statusId      = (parcel.status as Record<string, unknown>)?.id as number;
    const orderNumber   = parcel.order_number as string;
    const trackingNumber = parcel.tracking_number as string | undefined;

    if (!orderNumber) {
      console.warn('SENDCLOUD_WEBHOOK: no order_number on parcel', parcel.id);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Validate UUID format — SendCloud test events send numeric strings like "12345"
    // which cause a Postgres type error. Return 200 so SendCloud doesn't retry test events.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(orderNumber)) {
      console.warn('SENDCLOUD_WEBHOOK: non-UUID order_number (likely test event), skipping', { orderNumber, parcel_id: parcel.id });
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const newDispatchStatus = STATUS_MAP[statusId];

    if (newDispatchStatus) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('dispatch_status')
        .eq('id', orderNumber)
        .single();
      const statusChanged = existingOrder?.dispatch_status !== newDispatchStatus;

      const update: Record<string, string> = { dispatch_status: newDispatchStatus };
      if (newDispatchStatus === 'delivered') {
        update.delivered_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('orders')
        .update(update)
        .eq('id', orderNumber);

      // DB failure — return 500 so Sendcloud retries (up to 10x with backoff)
      if (error) {
        console.error('SENDCLOUD_WEBHOOK: order update failed', error.message, { orderNumber });
        return new Response('DB error', { status: 500 });
      }

      // Send customer email for delivered / failed (best-effort) — only on the actual transition,
      // since multiple SendCloud status IDs can map to the same outcome (e.g. 8 and 11 both = delivered)
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey && statusChanged && (newDispatchStatus === 'delivered' || newDispatchStatus === 'failed')) {
        const { data: orderWithCustomer } = await supabase
          .from('orders')
          .select('customers(email, first_name)')
          .eq('id', orderNumber)
          .single();
        const customer = orderWithCustomer?.customers as { email: string; first_name: string | null } | null;
        if (customer?.email) {
          const statusMessage = (parcel.status as Record<string, unknown>)?.message as string | null ?? null;
          const emailResult = newDispatchStatus === 'delivered'
            ? await sendDeliveredEmail(resendKey, customer.email, customer.first_name ?? null)
            : await sendFailedDeliveryEmail(resendKey, customer.email, customer.first_name ?? null, statusMessage);
          if (!emailResult.ok) console.error('SENDCLOUD_EMAIL_ERROR', emailResult.error, { orderNumber, newDispatchStatus });
          else console.log('SENDCLOUD_EMAIL_SENT', { orderNumber, newDispatchStatus, to: customer.email });
        }
      }
    }

    // Sync tracking number if not already set
    if (trackingNumber) {
      await supabase
        .from('orders')
        .update({ tracking_number: trackingNumber })
        .eq('id', orderNumber)
        .is('tracking_number', null);
    }

    console.log('SENDCLOUD_STATUS', JSON.stringify({
      order_id: orderNumber,
      sendcloud_parcel_id: parcel.id,
      status_id: statusId,
      status_message: (parcel.status as Record<string, unknown>)?.message,
      new_dispatch_status: newDispatchStatus ?? 'no change',
    }));

    return new Response('ok', { status: 200, headers: corsHeaders });

  } catch (err) {
    // Unexpected error — return 500 so Sendcloud retries
    console.error('SENDCLOUD_WEBHOOK_ERROR', err.message);
    return new Response('Internal error', { status: 500 });
  }
});
