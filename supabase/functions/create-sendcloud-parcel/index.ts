import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com'];

const KIT_WEIGHT: Record<string, string> = {
  ground:    '1.500',
  ritual:    '2.000',
  sovereign: '2.500',
};

const BOX_PRODUCT: Record<string, string> = {
  first_box: 'box-first-kit',
  refill:    'box-monthly-refill',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*, customers(first_name, last_name, email, phone)')
    .eq('id', order_id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders });
  }

  if (order.sendcloud_parcel_id) {
    return new Response(JSON.stringify({
      error: 'Label already created',
      parcel_id: order.sendcloud_parcel_id,
      tracking_number: order.tracking_number,
    }), { status: 409, headers: corsHeaders });
  }

  const { data: address } = await db
    .from('addresses')
    .select('*')
    .eq('customer_id', order.customer_id)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!address) {
    return new Response(JSON.stringify({ error: 'No shipping address found for this order' }), {
      status: 400, headers: corsHeaders,
    });
  }

  const publicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
  const secretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');

  if (!publicKey || !secretKey) {
    return new Response(JSON.stringify({ error: 'SendCloud credentials not configured' }), {
      status: 500, headers: corsHeaders,
    });
  }

  const scAuth = 'Basic ' + btoa(`${publicKey}:${secretKey}`);

  // Use hardcoded secret if set, otherwise auto-discover from the integration's
  // available shipping methods (works when only one method is configured).
  let shippingMethodId: number;
  const configuredId = Deno.env.get('SENDCLOUD_SHIPPING_METHOD_ID');
  if (configuredId) {
    shippingMethodId = parseInt(configuredId);
  } else {
    const smRes = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods?to_country=GB', {
      headers: { 'Authorization': scAuth },
    });
    if (!smRes.ok) {
      const errBody = await smRes.text();
      console.error('SENDCLOUD_SHIPPING_METHODS_ERROR', smRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Could not fetch SendCloud shipping methods', detail: errBody }), {
        status: 502, headers: corsHeaders,
      });
    }
    const smData = await smRes.json();
    const methods: Array<{ id: number; name: string }> = smData.shipping_methods ?? [];
    if (methods.length === 0) {
      return new Response(JSON.stringify({ error: 'No shipping methods available in SendCloud integration' }), {
        status: 500, headers: corsHeaders,
      });
    }
    shippingMethodId = methods[0].id;
    console.log('SENDCLOUD_AUTO_SHIPPING_METHOD', JSON.stringify({ id: shippingMethodId, name: methods[0].name }));
  }

  const weight       = KIT_WEIGHT[order.kit_id] ?? '2.000';
  const customerName = [order.customers?.first_name, order.customers?.last_name].filter(Boolean).join(' ') || address.name;

  const parcelPayload = {
    parcel: {
      name:         customerName,
      address:      address.line1,
      address_2:    address.line2 ?? '',
      city:         address.city,
      postal_code:  address.postcode,
      country:      { iso_2: address.country ?? 'GB' },
      telephone:    address.phone ?? order.customers?.phone ?? '',
      email:        order.customers?.email ?? '',
      order_number: order.id,
      shipment:     { id: shippingMethodId },
      weight,
      request_label: true,
    },
  };

  const scRes = await fetch('https://panel.sendcloud.sc/api/v2/parcels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': scAuth },
    body: JSON.stringify(parcelPayload),
  });

  if (!scRes.ok) {
    const errBody = await scRes.text();
    console.error('SENDCLOUD_CREATE_PARCEL_ERROR', scRes.status, errBody);
    return new Response(JSON.stringify({ error: `SendCloud error ${scRes.status}`, detail: errBody }), {
      status: 502, headers: corsHeaders,
    });
  }

  const scData       = await scRes.json();
  const parcel       = scData.parcel;
  const parcelId     = parcel.id as number;
  const trackingNum  = parcel.tracking_number as string;
  const labelUrl     = (parcel.label?.label_printer ?? parcel.label?.normal_printer?.[0] ?? null) as string | null;

  await db.from('orders').update({
    sendcloud_parcel_id: parcelId,
    tracking_number:     trackingNum,
    carrier:             'royal-mail',
    dispatch_status:     'dispatched',
    dispatched_at:       new Date().toISOString(),
  }).eq('id', order_id);

  const productId = BOX_PRODUCT[order.order_type];
  if (productId) {
    const { data: product } = await db.from('products').select('current_stock').eq('id', productId).single();
    if (product) {
      await db.from('products')
        .update({ current_stock: Math.max(0, (product.current_stock ?? 0) - 1) })
        .eq('id', productId);
      await db.from('inventory_transactions').insert({
        product_id:       productId,
        transaction_type: 'outbound_order',
        quantity:         -1,
        reference_type:   'dispatch',
        notes:            `SendCloud label — ${order.order_type === 'first_box' ? 'first kit box' : 'refill mailer'}`,
        created_by:       user.email,
      });
    }
  }

  console.log('SENDCLOUD_PARCEL_CREATED', JSON.stringify({ order_id, parcel_id: parcelId, tracking_number: trackingNum }));

  return new Response(JSON.stringify({ parcel_id: parcelId, tracking_number: trackingNum, label_url: labelUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
