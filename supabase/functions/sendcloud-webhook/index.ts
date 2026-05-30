import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sendcloud status ID → our dispatch_status
const STATUS_MAP: Record<number, string> = {
  1:    'dispatched', // Announced
  2:    'dispatched', // En route to sorting centre
  3:    'dispatched', // Delivery delayed
  4:    'dispatched', // Arrived at sorting centre
  5:    'failed',     // Not delivered
  6:    'dispatched', // Sorted
  7:    'dispatched', // En route to collect point
  8:    'delivered',  // Delivered
  11:   'delivered',  // Delivered (alt)
  12:   'dispatched', // Awaiting customer pickup
  13:   'failed',     // Announcement failed
  14:   'failed',     // Lost in transport
  22:   'failed',     // Returned to sender
  36:   'dispatched', // Being sorted
  80:   'dispatched', // Parcel announced
  91:   'delivered',  // Delivered (alt)
  92:   'dispatched', // Awaiting customer pickup
  93:   'dispatched', // Being sorted
  94:   'dispatched', // En route to collect point
  1000: 'dispatched',
  1002: 'dispatched',
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

    const newDispatchStatus = STATUS_MAP[statusId];

    if (newDispatchStatus) {
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
