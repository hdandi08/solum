import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { sendDispatchEmail } from '../_shared/emails.ts';

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com', 'hdandibrwz@gmail.com'];

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
  let listOptions = false;
  let getLabel = false;
  try {
    const body = await req.json();
    order_id = body.order_id;
    listOptions = body.list_options === true;
    getLabel = body.get_label === true;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  // Fetch the label PDF for an already-created parcel. SendCloud's document
  // links require Basic Auth, so the browser can't open them directly —
  // we fetch server-side and hand back base64 for the client to open as a blob.
  if (getLabel) {
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), { status: 400, headers: corsHeaders });
    }
    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('sendcloud_parcel_id')
      .eq('id', order_id)
      .single();
    if (orderErr || !order?.sendcloud_parcel_id) {
      return new Response(JSON.stringify({ error: 'No SendCloud parcel found for this order' }), { status: 404, headers: corsHeaders });
    }
    const publicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const secretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');
    if (!publicKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'SendCloud credentials not configured' }), { status: 500, headers: corsHeaders });
    }
    const scAuth = 'Basic ' + btoa(`${publicKey}:${secretKey}`);
    const docRes = await fetch(`https://panel.sendcloud.sc/api/v3/parcels/${order.sendcloud_parcel_id}/documents/label`, {
      headers: { 'Authorization': scAuth, 'Accept': 'application/pdf' },
    });
    if (!docRes.ok) {
      const errBody = await docRes.text();
      console.error('SENDCLOUD_GET_LABEL_ERROR', docRes.status, errBody);
      return new Response(JSON.stringify({ error: `SendCloud error ${docRes.status}`, detail: errBody }), { status: 502, headers: corsHeaders });
    }
    const pdfBytes = new Uint8Array(await docRes.arrayBuffer());
    let binary = '';
    for (const byte of pdfBytes) binary += String.fromCharCode(byte);
    const base64 = btoa(binary);
    return new Response(JSON.stringify({ pdf_base64: base64 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Debug/admin-only: list available SendCloud shipping options without creating a shipment.
  if (listOptions) {
    const publicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const secretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');
    if (!publicKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'SendCloud credentials not configured' }), { status: 500, headers: corsHeaders });
    }
    const scAuth = 'Basic ' + btoa(`${publicKey}:${secretKey}`);
    const fromPostal = Deno.env.get('SENDCLOUD_FROM_POSTAL_CODE') ?? '';
    const soRes = await fetch('https://panel.sendcloud.sc/api/v3/shipping-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': scAuth },
      body: JSON.stringify({
        from_country_code: Deno.env.get('SENDCLOUD_FROM_COUNTRY_CODE') ?? 'GB',
        to_country_code:   'GB',
        from_postal_code:  fromPostal,
        to_postal_code:    fromPostal,
        parcels: [{ weight: { value: '2.000', unit: 'kg' } }],
      }),
    });
    const soData = await soRes.json();
    if (!soRes.ok) {
      return new Response(JSON.stringify({ error: 'SendCloud error', detail: soData }), { status: 502, headers: corsHeaders });
    }
    const options = (soData.data ?? []).map((o: { code: string; name: string; carrier?: { name: string } }) => ({
      code: o.code, name: o.name, carrier: o.carrier?.name,
    }));
    return new Response(JSON.stringify({ options }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!order_id) {
    return new Response(JSON.stringify({ error: 'order_id required' }), { status: 400, headers: corsHeaders });
  }

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*, customers(first_name, last_name, email)')
    .eq('id', order_id)
    .single();

  if (orderErr) {
    console.error('ORDER_LOOKUP_ERROR', JSON.stringify(orderErr));
    return new Response(JSON.stringify({ error: 'Order lookup failed', detail: orderErr.message }), { status: 500, headers: corsHeaders });
  }
  if (!order) {
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

  const fromAddress = {
    name:           Deno.env.get('SENDCLOUD_FROM_NAME') ?? 'BySolum Limited',
    address_line_1: Deno.env.get('SENDCLOUD_FROM_ADDRESS_LINE1') ?? '',
    city:            Deno.env.get('SENDCLOUD_FROM_CITY') ?? '',
    postal_code:     Deno.env.get('SENDCLOUD_FROM_POSTAL_CODE') ?? '',
    country_code:    Deno.env.get('SENDCLOUD_FROM_COUNTRY_CODE') ?? 'GB',
    phone_number:    Deno.env.get('SENDCLOUD_FROM_PHONE') ?? '',
    email:           Deno.env.get('SENDCLOUD_FROM_EMAIL') ?? '',
  };

  const weight       = KIT_WEIGHT[order.kit_id] ?? '2.000';
  const customerName = [order.customers?.first_name, order.customers?.last_name].filter(Boolean).join(' ') || address.name;
  const toCountry     = address.country ?? 'GB';

  // Use hardcoded secret if set, otherwise auto-discover from the integration's
  // available shipping options (works when only one option is configured).
  let shippingOptionCode: string;
  const configuredCode = Deno.env.get('SENDCLOUD_SHIPPING_OPTION_CODE');
  if (configuredCode) {
    shippingOptionCode = configuredCode;
  } else {
    const soRes = await fetch('https://panel.sendcloud.sc/api/v3/shipping-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': scAuth },
      body: JSON.stringify({
        from_country_code: fromAddress.country_code,
        to_country_code:   toCountry,
        from_postal_code:  fromAddress.postal_code,
        to_postal_code:    address.postcode,
        parcels: [{ weight: { value: weight, unit: 'kg' } }],
      }),
    });
    if (!soRes.ok) {
      const errBody = await soRes.text();
      console.error('SENDCLOUD_SHIPPING_OPTIONS_ERROR', soRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Could not fetch SendCloud shipping options', detail: errBody }), {
        status: 502, headers: corsHeaders,
      });
    }
    const soData = await soRes.json();
    const options: Array<{ code: string; name: string }> = soData.data ?? [];
    if (options.length === 0) {
      return new Response(JSON.stringify({ error: 'No shipping options available in SendCloud integration' }), {
        status: 500, headers: corsHeaders,
      });
    }
    shippingOptionCode = options[0].code;
    console.log('SENDCLOUD_AUTO_SHIPPING_OPTION', JSON.stringify({ code: shippingOptionCode, name: options[0].name }));
  }

  const shipmentPayload = {
    to_address: {
      name:           customerName,
      address_line_1: address.line1,
      address_line_2: address.line2 ?? '',
      city:           address.city,
      postal_code:    address.postcode,
      country_code:   toCountry,
      phone_number:   address.phone ?? '',
      email:          order.customers?.email ?? '',
    },
    from_address: fromAddress,
    ship_with: {
      type:       'shipping_option_code',
      properties: { shipping_option_code: shippingOptionCode },
    },
    order_number: order.id,
    parcels: [{ weight: { value: weight, unit: 'kg' } }],
  };

  const scRes = await fetch('https://panel.sendcloud.sc/api/v3/shipments/announce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': scAuth },
    body: JSON.stringify(shipmentPayload),
  });

  if (!scRes.ok) {
    const errBody = await scRes.text();
    console.error('SENDCLOUD_CREATE_SHIPMENT_ERROR', scRes.status, errBody);
    return new Response(JSON.stringify({ error: `SendCloud error ${scRes.status}`, detail: errBody }), {
      status: 502, headers: corsHeaders,
    });
  }

  const scData      = await scRes.json();
  const parcel      = scData.data?.parcels?.[0];
  if (!parcel) {
    console.error('SENDCLOUD_UNEXPECTED_RESPONSE', JSON.stringify(scData));
    return new Response(JSON.stringify({ error: 'Unexpected SendCloud response', detail: scData }), {
      status: 502, headers: corsHeaders,
    });
  }
  const parcelId    = parcel.id as number;
  const trackingNum = parcel.tracking_number as string;
  const labelUrl     = (parcel.documents?.find((d: { type: string }) => d.type === 'label')?.link ?? null) as string | null;
  const carrierCode  = (scData.data?.carrier?.code ?? 'royal-mail') as string;
  // SendCloud's parcel.tracking_url forwards to Royal Mail's retired portal URL
  // (/portal/rm/track → 403 dead page), so build the current RM tracking link ourselves.
  const trackingUrl = trackingNum && carrierCode.includes('royal')
    ? `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNum}`
    : ((parcel.tracking_url ?? null) as string | null);

  await db.from('orders').update({
    sendcloud_parcel_id: parcelId,
    tracking_number:     trackingNum,
    carrier:             carrierCode,
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

  // Send dispatch email (best-effort)
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    const customer = order.customers as { email: string; first_name: string | null } | null;
    if (customer?.email) {
      const emailResult = await sendDispatchEmail(resendKey, customer.email, customer.first_name ?? null, trackingNum, trackingUrl);
      if (!emailResult.ok) console.error('DISPATCH_EMAIL_ERROR', emailResult.error);
      else console.log('DISPATCH_EMAIL_SENT', customer.email);
    }
  }

  return new Response(JSON.stringify({ parcel_id: parcelId, tracking_number: trackingNum, label_url: labelUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
