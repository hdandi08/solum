// Meta Conversions API relay — mirrors browser-pixel events server-side so Meta
// still receives them when iOS/ad-blockers kill the pixel. The browser fires the
// pixel AND this relay with the SAME event_id, so Meta dedupes to the union.
// Purchase is NOT relayed here — it is sent server-side by stripe-webhook.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_PIXEL_ID = '690345887768095';
const ALLOWED_EVENTS = new Set(['AddToCart', 'InitiateCheckout', 'ViewContent']);

async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: corsHeaders });
  }

  const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN');
  if (!accessToken) {
    console.warn('META_CAPI_ACCESS_TOKEN not set — skipping Meta relay');
    return new Response(JSON.stringify({ skipped: true }), { status: 200, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: corsHeaders });
  }

  const eventName = String(body.event_name ?? '');
  const eventId = String(body.event_id ?? '');
  if (!ALLOWED_EVENTS.has(eventName) || !eventId) {
    return new Response(JSON.stringify({ error: 'bad event' }), { status: 400, headers: corsHeaders });
  }

  // Match-quality signals. fbp/fbc cookies identify the anonymous browser to Meta;
  // IP + UA come from the request itself, not the payload.
  const userData: Record<string, unknown> = {
    client_ip_address: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined,
    client_user_agent: req.headers.get('user-agent') ?? undefined,
  };
  if (body.fbp) userData['fbp'] = String(body.fbp);
  if (body.fbc) userData['fbc'] = String(body.fbc);
  if (body.email) userData['em'] = [await sha256hex(String(body.email))];
  if (body.phone) userData['ph'] = [await sha256hex(String(body.phone).replace(/\D/g, ''))];

  const kitId = body.kit_id ? String(body.kit_id) : 'unknown';
  const customData: Record<string, unknown> = {
    currency: 'GBP',
    content_ids: [kitId],
    content_type: 'product',
    content_name: body.kit_name ? String(body.kit_name) : kitId,
  };
  if (typeof body.value === 'number' && isFinite(body.value)) customData['value'] = body.value;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        data: [{
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: body.source_url ? String(body.source_url) : 'https://bysolum.co.uk/',
          action_source: 'website',
          user_data: userData,
          custom_data: customData,
        }],
      }),
    });
    const result = await res.json();
    if (result.error) console.error('meta_capi_relay_error', eventName, JSON.stringify(result.error));
    else console.log('meta_capi_relay_ok', eventName, eventId, result.events_received);
  } catch (err) {
    console.error('meta_capi_relay_throw', (err as Error).message);
  }

  // Always 200 — the relay is fire-and-forget from the client's perspective.
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
